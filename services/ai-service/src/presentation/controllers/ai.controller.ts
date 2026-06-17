import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  JwtAuthGuard,
  RoleGuard,
  Roles,
  CurrentUser,
  AuthenticatedUser,
  AuditPublisherService,
  ROUTING_KEYS,
  AuditEventMessage,
} from '@user-management/shared';
import { QueryAiUseCase } from '../../application/use-cases/query-ai.use-case';
import { IndexKnowledgeUseCase } from '../../application/use-cases/index-knowledge.use-case';
import { QueryAiDto } from '../dtos/query-ai.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly queryAiUseCase: QueryAiUseCase,
    private readonly indexKnowledgeUseCase: IndexKnowledgeUseCase,
    private readonly auditPublisher: AuditPublisherService,
  ) {}

  @Post('query')
  @UseGuards(JwtAuthGuard)
  async query(
    @Body() dto: QueryAiDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const correlationId = (req.headers['x-correlation-id'] as string) || '';

    const result = await this.queryAiUseCase.execute({
      query: dto.query,
      userId: user.user_id,
      correlationId,
    });

    // Publish audit event for AI query
    const auditEvent: AuditEventMessage = {
      event_type: 'ai.query',
      actor_id: user.user_id,
      actor_username: user.username,
      resource_type: 'ai',
      resource_id: null,
      action: 'query',
      details: {
        query_length: dto.query.length,
        context_count: result.context_count,
        latency_ms: result.latency_ms,
        model: result.model,
      },
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      service_origin: 'ai-service',
    };

    await this.auditPublisher.publish(ROUTING_KEYS.AI_QUERY, auditEvent);

    return {
      answer: result.answer,
      metadata: {
        context_count: result.context_count,
        model: result.model,
        latency_ms: result.latency_ms,
        tokens_in: result.tokens_in,
        tokens_out: result.tokens_out,
        cost_estimate: result.cost_estimate,
      },
    };
  }

  @Post('index')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async index(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const correlationId = (req.headers['x-correlation-id'] as string) || '';

    const result = await this.indexKnowledgeUseCase.execute();

    // Publish audit event for indexation
    const auditEvent: AuditEventMessage = {
      event_type: 'ai.indexed',
      actor_id: user.user_id,
      actor_username: user.username,
      resource_type: 'ai',
      resource_id: null,
      action: 'index',
      details: {
        documents_fetched: result.documents_fetched,
        chunks_generated: result.chunks_generated,
        embeddings_stored: result.embeddings_stored,
        collection: result.collection,
        latency_ms: result.latency_ms,
      },
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      service_origin: 'ai-service',
    };

    await this.auditPublisher.publish(ROUTING_KEYS.AI_INDEXED, auditEvent);

    return {
      message: 'Indexation completed successfully',
      ...result,
    };
  }
}
