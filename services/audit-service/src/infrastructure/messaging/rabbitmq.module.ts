import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { connect } from 'amqp-connection-manager';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RABBITMQ_CLIENT,
      useFactory: (config: ConfigService) =>
        connect([config.get<string>('RABBITMQ_URL') as string]),
      inject: [ConfigService],
    },
  ],
  exports: [RABBITMQ_CLIENT],
})
export class RabbitmqModule {}
