import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { connect } from 'amqp-connection-manager';
import { RabbitmqEventPublisher } from './event-publisher';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RABBITMQ_CLIENT,
      useFactory: (config: ConfigService) => {
        return connect([config.get<string>('RABBITMQ_URL') as string]);
      },
      inject: [ConfigService],
    },
    RabbitmqEventPublisher,
  ],
  exports: [RabbitmqEventPublisher],
})
export class RabbitmqModule {}
