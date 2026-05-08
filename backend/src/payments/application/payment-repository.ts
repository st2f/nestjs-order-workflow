import type { TransactionContext } from '../../events/application/transaction-runner';
import type { Payment } from '../entities/payment.entity';
import type { PaymentStatus } from '../payment-status.enum';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export type NewPayment = {
  orderId: string;
  status: PaymentStatus;
  attemptCount: number;
  providerReference: string;
};

export type PaymentRepository = {
  findByOrderId(
    orderId: string,
    tx?: TransactionContext,
  ): Promise<Payment | null>;
  create(payment: NewPayment, tx?: TransactionContext): Promise<Payment>;
};
