import type { TransactionContext } from './transaction-runner';

export const PROCESSED_EVENT_REPOSITORY = Symbol('PROCESSED_EVENT_REPOSITORY');

export type ProcessedEventRepository = {
  markProcessed(
    eventId: string,
    consumer: string,
    tx?: TransactionContext,
  ): Promise<boolean>;
};
