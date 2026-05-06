import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OUTBOX_EVENT_REPOSITORY } from './application/outbox-event-repository';
import { TRANSACTION_RUNNER } from './application/transaction-runner';
import { OutboxEvent } from './entities/outbox-event.entity';
import { ProcessedEvent } from './entities/processed-event.entity';
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
  ],
  exports: [TypeOrmModule, TRANSACTION_RUNNER, OUTBOX_EVENT_REPOSITORY],
})
export class EventsModule {}
