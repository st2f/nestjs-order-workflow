import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { TransactionContext } from '../../events/application/transaction-runner';
import type {
  EnrollmentRepository,
  NewEnrollment,
} from '../application/enrollment-repository';
import { Enrollment } from '../entities/enrollment.entity';

@Injectable()
export class TypeormEnrollmentRepository implements EnrollmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  findByOrderId(
    orderId: string,
    tx?: TransactionContext,
  ): Promise<Enrollment | null> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;

    return manager.getRepository(Enrollment).findOneBy({ orderId });
  }

  create(
    enrollment: NewEnrollment,
    tx?: TransactionContext,
  ): Promise<Enrollment> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;
    const repository = manager.getRepository(Enrollment);

    return repository.save(repository.create(enrollment));
  }
}
