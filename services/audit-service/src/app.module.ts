import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggingModule, ErrorsModule, AuthModule } from '@user-management/shared';
import { AuditEventDocument, AuditEventSchema } from './infrastructure/persistence/schemas/audit-event.schema';
import { MongooseAuditEventRepository } from './infrastructure/persistence/repositories/mongoose-audit-event.repository';
import { AUDIT_EVENT_REPOSITORY } from './domain/repositories/audit-event.repository';
import { AuditEventConsumer } from './infrastructure/messaging/audit-event.consumer';
import { ListAuditEventsUseCase } from './application/use-cases/list-audit-events.use-case';
import { HealthController } from './presentation/controllers/health.controller';
import { AuditController } from './presentation/controllers/audit.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule.forRoot({ serviceName: 'audit-service' }),
    ErrorsModule,
    AuthModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://admin:admin123@localhost:27017/audit?authSource=admin'),
      }),
    }),
    MongooseModule.forFeature([
      { name: AuditEventDocument.name, schema: AuditEventSchema },
    ]),
  ],
  controllers: [HealthController, AuditController],
  providers: [
    {
      provide: AUDIT_EVENT_REPOSITORY,
      useClass: MongooseAuditEventRepository,
    },
    AuditEventConsumer,
    ListAuditEventsUseCase,
  ],
})
export class AppModule {}
