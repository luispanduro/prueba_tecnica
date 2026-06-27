import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  UseGuards,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../guards/permissions.guard';
import { IndexDocumentsUseCase } from '../../../application/use-cases/index-documents.use-case';
import { QueryAgentUseCase, AIQueryResponse } from '../../../application/use-cases/query-agent.use-case';
import {
  METRIC_REPOSITORY,
  IMetricRepository,
  QueryMetricData,
} from '../../../domain/repositories/metric.repository.interface';
import { AIQueryDto } from '../dtos/ai-query.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly indexDocuments: IndexDocumentsUseCase,
    private readonly queryAgent: QueryAgentUseCase,
    @Inject(METRIC_REPOSITORY) private readonly metricRepo: IMetricRepository,
    private readonly config: ConfigService,
  ) {}

  @Post('query')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async query(@Body() dto: AIQueryDto): Promise<AIQueryResponse> {
    return this.queryAgent.execute(dto);
  }

  @Post('index')
  @HttpCode(202)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('ai:admin')
  async forceIndex(): Promise<{ message: string }> {
    await this.indexDocuments.execute(true);
    return { message: 'Re-indexation completed' };
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('ai:admin')
  async getMetrics(): Promise<QueryMetricData[]> {
    return this.metricRepo.findAll(100);
  }

  @Get('metrics/:queryId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('ai:admin')
  async getMetricById(@Param('queryId') queryId: string): Promise<QueryMetricData> {
    const metric = await this.metricRepo.findById(queryId);
    if (!metric) throw new NotFoundException(`Metric with queryId '${queryId}' not found`);
    return metric;
  }

  @Get('health')
  async health(): Promise<{ status: string; qdrant: string; openai: string }> {
    const qdrantUrl = this.config.get<string>('QDRANT_URL')!;
    const openAIApiKey = this.config.get<string>('OPENAI_API_KEY')!;

    let qdrantStatus = 'ok';
    try {
      await axios.get(`${qdrantUrl}/healthz`, { timeout: 3000 });
    } catch {
      qdrantStatus = 'unavailable';
    }

    let openaiStatus = 'ok';
    try {
      await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openAIApiKey}` },
        timeout: 5000,
      });
    } catch {
      openaiStatus = 'unavailable';
    }

    return {
      status: qdrantStatus === 'ok' && openaiStatus === 'ok' ? 'ok' : 'degraded',
      qdrant: qdrantStatus,
      openai: openaiStatus,
    };
  }
}
