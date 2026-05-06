export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

export type TransactionContext = unknown;

export type TransactionRunner = {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
};
