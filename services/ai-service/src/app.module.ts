import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndexDocumentsUseCase } from './application/use-cases/index-documents.use-case';
import { QueryAgentUseCase } from './application/use-cases/query-agent.use-case';
import { PromptBuilder } from './application/prompts/prompt-builder';
import { CostCalculatorService } from './domain/services/cost-calculator.service';
import { ResponseValidatorService } from './domain/services/response-validator.service';
import { METRIC_REPOSITORY } from './domain/repositories/metric.repository.interface';
import { JwtStrategy } from './infrastructure/http/guards/jwt.strategy';
import { PermissionsGuard } from './infrastructure/http/guards/permissions.guard';
import { AiController } from './infrastructure/http/controllers/ai.controller';
import { UserServiceClient } from './infrastructure/http-clients/user-service.client';
import { MetricRepository } from './infrastructure/persistence/typeorm/metric.repository';
import { QueryMetricTypeormEntity } from './infrastructure/persistence/typeorm/entities/query-metric.typeorm-entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        database: config.get<string>('DB_NAME'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        entities: [QueryMetricTypeormEntity],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([QueryMetricTypeormEntity]),
  ],
  controllers: [AiController],
  providers: [
    IndexDocumentsUseCase,
    QueryAgentUseCase,
    PromptBuilder,
    CostCalculatorService,
    ResponseValidatorService,
    UserServiceClient,
    JwtStrategy,
    PermissionsGuard,
    { provide: METRIC_REPOSITORY, useClass: MetricRepository },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly indexDocuments: IndexDocumentsUseCase) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.indexDocuments.execute();
    } catch (error) {
      this.logger.error({ action: 'indexing.failed', error: String(error) });
    }
  }
}
