import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggingModule, ErrorsModule, AuthModule, MessagingModule } from '@user-management/shared';
import { QdrantRetrieverService } from './infrastructure/qdrant/qdrant-retriever.service';
import { PromptBuilderService } from './infrastructure/llm/prompt-builder.service';
import { LlmClientService } from './infrastructure/llm/llm-client.service';
import { UserServiceClient } from './infrastructure/http-clients/user-service.client';
import { RoleServiceClient } from './infrastructure/http-clients/role-service.client';
import { ChunkerService } from './infrastructure/indexer/chunker.service';
import { QdrantIndexerService } from './infrastructure/indexer/qdrant-indexer.service';
import { QueryAiUseCase } from './application/use-cases/query-ai.use-case';
import { IndexKnowledgeUseCase } from './application/use-cases/index-knowledge.use-case';
import { AiController } from './presentation/controllers/ai.controller';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule.forRoot({ serviceName: 'ai-service' }),
    ErrorsModule,
    AuthModule,
    MessagingModule,
  ],
  controllers: [AiController, HealthController],
  providers: [
    QdrantRetrieverService,
    PromptBuilderService,
    LlmClientService,
    UserServiceClient,
    RoleServiceClient,
    ChunkerService,
    QdrantIndexerService,
    QueryAiUseCase,
    IndexKnowledgeUseCase,
  ],
})
export class AppModule {}
