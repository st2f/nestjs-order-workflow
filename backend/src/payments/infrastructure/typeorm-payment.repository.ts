import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { TransactionContext } from '../../events/application/transaction-runner';
import type {
  NewPayment,
  PaymentRepository,
} from '../application/payment-repository';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../payment-status.enum';

@Injectable()
export class TypeormPaymentRepository implements PaymentRepository {
  constructor(private readonly dataSource: DataSource) {}

  findByOrderId(
    orderId: string,
    tx?: TransactionContext,
  ): Promise<Payment | null> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;

    return manager.getRepository(Payment).findOneBy({ orderId });
  }

  create(payment: NewPayment, tx?: TransactionContext): Promise<Payment> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;
    const repository = manager.getRepository(Payment);

    return repository.save(repository.create(payment));
  }

  async updateStatus(
    paymentId: string,
    status: PaymentStatus,
    tx?: TransactionContext,
  ): Promise<void> {
    const manager = tx instanceof EntityManager ? tx : this.dataSource.manager;

    await manager.getRepository(Payment).update(paymentId, { status });
  }
}
