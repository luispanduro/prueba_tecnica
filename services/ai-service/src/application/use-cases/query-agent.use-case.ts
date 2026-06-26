import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import {
  METRIC_REPOSITORY,
  IMetricRepository,
} from '../../domain/repositories/metric.repository.interface';
import { CostCalculatorService } from '../../domain/services/cost-calculator.service';
import { ResponseValidatorService } from '../../domain/services/response-validator.service';
import { UserServiceClient } from '../../infrastructure/http-clients/user-service.client';
import { MetricsCallback } from '../../infrastructure/langchain/metrics-callback';
import { PromptBuilder } from '../prompts/prompt-builder';

export interface AIQueryRequest {
  query: string;
  userId?: string;
  sessionId?: string;
}

export interface AIQueryResponse {
  queryId: string;
  answer: string;
  sources: Array<{ content: string; source: string; score: number }>;
  metrics: {
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUSD: number;
    qualityFlags: string[];
  };
}

interface QdrantPayload {
  content?: unknown;
  source?: unknown;
}

interface OpenAIError {
  status?: number;
  response?: { headers?: { 'retry-after'?: string } };
}

@Injectable()
export class QueryAgentUseCase {
  private readonly logger = new Logger(QueryAgentUseCase.name);

  constructor(
    @Inject(METRIC_REPOSITORY) private readonly metricRepo: IMetricRepository,
    private readonly config: ConfigService,
    private readonly costCalculator: CostCalculatorService,
    private readonly responseValidator: ResponseValidatorService,
    private readonly userServiceClient: UserServiceClient,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async execute(request: AIQueryRequest): Promise<AIQueryResponse> {
    const startTime = Date.now();
    const qdrantUrl = this.config.get<string>('QDRANT_URL')!;
    const collectionName = this.config.get<string>('QDRANT_COLLECTION')!;
    const openAIApiKey = this.config.get<string>('OPENAI_API_KEY')!;

    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey,
    });

    // 1. Embed query
    const embStart = Date.now();
    let vector: number[];
    try {
      vector = await embeddings.embedQuery(request.query);
    } catch (error) {
      this.handleOpenAIError(error);
    }
    const embeddingLatencyMs = Date.now() - embStart;

    // 2. Search Qdrant (topK=5, scoreThreshold=0.7)
    const retStart = Date.now();
    const qdrantClient = new QdrantClient({ url: qdrantUrl });
    const searchResults = await qdrantClient.search(collectionName, {
      vector: vector!,
      limit: 5,
      score_threshold: 0.7,
      with_payload: true,
    });
    const retrievalLatencyMs = Date.now() - retStart;

    // 3. Fetch user context (non-blocking)
    const userData = request.userId
      ? await this.userServiceClient.getUserById(request.userId)
      : null;

    // 4. Build prompt
    const sources = searchResults.map((r) => {
      const p = r.payload as QdrantPayload;
      return {
        content: String(p?.content ?? ''),
        source: String(p?.source ?? ''),
        score: r.score,
      };
    });

    const systemPromptText = this.promptBuilder.build(request.query, sources, userData);

    // 5. Call GPT-4o-mini
    const metricsCallback = new MetricsCallback();
    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      maxTokens: 800,
      temperature: 0.3,
      openAIApiKey,
      callbacks: [metricsCallback],
    });

    let answer: string;
    try {
      const response = await llm.invoke([
        new SystemMessage(systemPromptText),
        new HumanMessage(request.query),
      ]);
      answer = typeof response.content === 'string' ? response.content : '';
    } catch (error) {
      this.handleOpenAIError(error);
    }

    // 6. Compute metrics
    const totalLatencyMs = Date.now() - startTime;
    const queryId = uuidv4();
    const chunksRetrieved = searchResults.length;
    const avgChunkScore =
      chunksRetrieved > 0
        ? searchResults.reduce((sum, r) => sum + r.score, 0) / chunksRetrieved
        : 0;
    const estimatedCostUSD = this.costCalculator.calculate(
      metricsCallback.promptTokens,
      metricsCallback.completionTokens,
    );
    const qualityFlags = this.responseValidator.validate(
      answer!,
      avgChunkScore,
      chunksRetrieved,
      metricsCallback.finishReason,
    );

    // 7. Persist metrics
    await this.metricRepo.save({
      queryId,
      timestamp: new Date(),
      latencyMs: totalLatencyMs,
      embeddingLatencyMs,
      retrievalLatencyMs,
      llmLatencyMs: metricsCallback.llmLatencyMs,
      inputTokens: metricsCallback.promptTokens,
      outputTokens: metricsCallback.completionTokens,
      totalTokens: metricsCallback.promptTokens + metricsCallback.completionTokens,
      estimatedCostUSD,
      chunksRetrieved,
      avgChunkScore,
      qualityFlags,
    });

    // 8. Log
    this.logger.log({
      action: 'ai.query.completed',
      queryId,
      latencyMs: totalLatencyMs,
      llmLatencyMs: metricsCallback.llmLatencyMs,
      retrievalLatencyMs,
      inputTokens: metricsCallback.promptTokens,
      outputTokens: metricsCallback.completionTokens,
      estimatedCostUSD,
      chunksRetrieved,
      qualityFlags,
    });

    return {
      queryId,
      answer: answer!,
      sources,
      metrics: {
        latencyMs: totalLatencyMs,
        inputTokens: metricsCallback.promptTokens,
        outputTokens: metricsCallback.completionTokens,
        estimatedCostUSD,
        qualityFlags,
      },
    };
  }

  private handleOpenAIError(error: unknown): never {
    const err = error as OpenAIError;
    if (err?.status === 429) {
      const retryAfterMs =
        parseInt(err.response?.headers?.['retry-after'] ?? '5', 10) * 1000;
      this.logger.error({
        action: 'ai.query.failed',
        reason: 'rate_limit_exceeded',
        retryAfterMs,
      });
      throw new ServiceUnavailableException('Rate limit exceeded. Please try again later.');
    }
    this.logger.error({ action: 'ai.query.failed', reason: 'openai_error', error: String(error) });
    throw new ServiceUnavailableException('AI service temporarily unavailable.');
  }
}
