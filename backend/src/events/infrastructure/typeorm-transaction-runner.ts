import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  TransactionContext,
  TransactionRunner,
} from '../application/transaction-runner';

@Injectable()
export class TypeormTransactionRunner implements TransactionRunner {
  constructor(private readonly dataSource: DataSource) {}

  async run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => work(manager));
  }
}
