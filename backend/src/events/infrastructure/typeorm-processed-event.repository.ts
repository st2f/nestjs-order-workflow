import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import type { ProcessedEventRepository } from '../application/processed-event-repository';
import type { TransactionContext } from '../application/transaction-runner';
import { ProcessedEvent } from '../entities/processed-event.entity';

@Injectable()
export class TypeormProcessedEventRepository implements ProcessedEventRepository {
  constructor(private readonly dataSource: DataSource) {}

  async markProcessed(
    eventId: string,
    consumer: string,
    tx?: TransactionContext,
  ): Promise<boolean> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;
    const repository = manager.getRepository(ProcessedEvent);

    try {
      await repository.insert(repository.create({ eventId, consumer }));
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return false;
      }

      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as unknown;

  return hasPostgresErrorCode(driverError) && driverError.code === '23505';
}

function hasPostgresErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  );
}
