import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { connect } from 'amqp-connection-manager';
import { RabbitmqEventPublisher } from './event-publisher';

import { RABBITMQ_CLIENT } from './rabbitmq.constants';
export { RABBITMQ_CLIENT };

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
  exports: [RabbitmqEventPublisher, RABBITMQ_CLIENT],
})
export class RabbitmqModule {}
