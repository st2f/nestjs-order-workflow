import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import type { OutboxEventRepository } from '../application/outbox-event-repository';
import type { TransactionContext } from '../application/transaction-runner';
import type { DomainEvent } from '../contracts/domain-event';
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

  findUnpublished(limit: number): Promise<OutboxEvent[]> {
    return this.dataSource.getRepository(OutboxEvent).find({
      where: { publishedAt: IsNull() },
      order: { occurredAt: 'ASC' },
      take: limit,
    });
  }

  async markPublished(eventId: string, publishedAt: Date): Promise<void> {
    await this.dataSource.getRepository(OutboxEvent).update(eventId, {
      publishedAt,
      lastError: null,
    });
  }

  async markPublishFailed(eventId: string, error: Error): Promise<void> {
    await this.dataSource
      .getRepository(OutboxEvent)
      .increment({ id: eventId }, 'retryCount', 1);

    await this.dataSource.getRepository(OutboxEvent).update(eventId, {
      lastError: error.message,
    });
  }
}
