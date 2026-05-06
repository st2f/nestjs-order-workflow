import { DomainEvent } from '../contracts/domain-event';
import { TransactionContext } from './transaction-runner';

export const OUTBOX_EVENT_REPOSITORY = Symbol('OUTBOX_EVENT_REPOSITORY');

export type OutboxEventRepository = {
  append(
    event: DomainEvent<string, number, Record<string, unknown>>,
    tx?: TransactionContext,
  ): Promise<void>;
};
