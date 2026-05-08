import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EVENT_MESSAGE_PUBLISHER } from './application/event-message-publisher';
import { OUTBOX_EVENT_REPOSITORY } from './application/outbox-event-repository';
import { OutboxPublisherService } from './application/outbox-publisher.service';
import { TRANSACTION_RUNNER } from './application/transaction-runner';
import { OutboxEvent } from './entities/outbox-event.entity';
import { ProcessedEvent } from './entities/processed-event.entity';
import { AmqpEventMessagePublisher } from './infrastructure/amqp-event-message.publisher';
import { TypeormOutboxEventRepository } from './infrastructure/typeorm-outbox-event.repository';
import { TypeormTransactionRunner } from './infrastructure/typeorm-transaction-runner';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent, ProcessedEvent])],
  providers: [
    {
      provide: TRANSACTION_RUNNER,
      useClass: TypeormTransactionRunner,
    },
    {
      provide: OUTBOX_EVENT_REPOSITORY,
      useClass: TypeormOutboxEventRepository,
    },
    {
      provide: EVENT_MESSAGE_PUBLISHER,
      useClass: AmqpEventMessagePublisher,
    },
    OutboxPublisherService,
  ],
  exports: [TypeOrmModule, TRANSACTION_RUNNER, OUTBOX_EVENT_REPOSITORY],
})
export class EventsModule {}
