import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { OutboxEventRepository } from '../application/outbox-event-repository';
import { TransactionContext } from '../application/transaction-runner';
import { DomainEvent } from '../contracts/domain-event';
import { OutboxEvent } from '../entities/outbox-event.entity';

@Injectable()
export class TypeormOutboxEventRepository implements OutboxEventRepository {
  constructor(private readonly dataSource: DataSource) {}

  async append(
    event: DomainEvent<string, number, Record<string, unknown>>,
    tx?: TransactionContext,
  ): Promise<void> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;
    const repository = manager.getRepository(OutboxEvent);

    await repository.save(
      repository.create({
        type: event.eventType,
        payload: event,
      }),
    );
  }
}
