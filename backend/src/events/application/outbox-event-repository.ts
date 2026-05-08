import { DomainEvent } from '../contracts/domain-event';
import { OutboxEvent } from '../entities/outbox-event.entity';
import { TransactionContext } from './transaction-runner';

export const OUTBOX_EVENT_REPOSITORY = Symbol('OUTBOX_EVENT_REPOSITORY');

export type OutboxEventRepository = {
  append(
    event: DomainEvent<string, number, Record<string, unknown>>,
    tx?: TransactionContext,
  ): Promise<void>;
  findUnpublished(limit: number): Promise<OutboxEvent[]>;
  markPublished(eventId: string, publishedAt: Date): Promise<void>;
  markPublishFailed(eventId: string, error: Error): Promise<void>;
};
