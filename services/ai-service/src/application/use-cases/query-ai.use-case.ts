import { Injectable } from '@nestjs/common';
import { LoggerService } from '@user-management/shared';
import { QdrantRetrieverService } from '../../infrastructure/qdrant/qdrant-retriever.service';
import { PromptBuilderService } from '../../infrastructure/llm/prompt-builder.service';
import { LlmClientService } from '../../infrastructure/llm/llm-client.service';

export interface QueryAiInput {
  query: string;
  userId?: string;
  correlationId?: string;
}

export interface QueryAiOutput {
  answer: string;
  context_count: number;
  model: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number | null;
}

// Approximate pricing per 1K tokens (GPT-3.5-turbo as of 2024)
const COST_PER_1K_INPUT = 0.0005;
const COST_PER_1K_OUTPUT = 0.0015;

@Injectable()
export class QueryAiUseCase {
  constructor(
    private readonly retriever: QdrantRetrieverService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly llmClient: LlmClientService,
    private readonly logger: LoggerService,
  ) {}

  async execute(input: QueryAiInput): Promise<QueryAiOutput> {
    const startTime = Date.now();

    // 1. Retrieve relevant documents from Qdrant
    const documents = await this.retriever.retrieve(input.query);

    // 2. Build prompt with context
    const prompt = this.promptBuilder.build(input.query, documents);

    // 3. Send to LLM
    const llmResponse = await this.llmClient.invoke(prompt);

    const latencyMs = Date.now() - startTime;

    // 4. Calculate cost estimate
    const costEstimate = this.estimateCost(llmResponse.tokensIn, llmResponse.tokensOut);

    // 5. Log metrics
    this.logger.info('AI query processed', {
      latency_ms: latencyMs,
      tokens_in: llmResponse.tokensIn,
      tokens_out: llmResponse.tokensOut,
      cost_estimate: costEstimate,
      model: llmResponse.model,
      context_count: documents.length,
      user_id: input.userId,
      correlation_id: input.correlationId,
    });

    return {
      answer: llmResponse.content,
      context_count: documents.length,
      model: llmResponse.model,
      latency_ms: latencyMs,
      tokens_in: llmResponse.tokensIn,
      tokens_out: llmResponse.tokensOut,
      cost_estimate: costEstimate,
    };
  }

  private estimateCost(tokensIn: number, tokensOut: number): number | null {
    if (tokensIn === 0 && tokensOut === 0) return null;
    const inputCost = (tokensIn / 1000) * COST_PER_1K_INPUT;
    const outputCost = (tokensOut / 1000) * COST_PER_1K_OUTPUT;
    return Math.round((inputCost + outputCost) * 1000000) / 1000000; // 6 decimal places
  }
}
