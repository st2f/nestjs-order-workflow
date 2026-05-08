import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OUTBOX_EVENT_REPOSITORY } from '../../events/application/outbox-event-repository';
import type { OutboxEventRepository } from '../../events/application/outbox-event-repository';
import { TRANSACTION_RUNNER } from '../../events/application/transaction-runner';
import type { TransactionRunner } from '../../events/application/transaction-runner';
import type { OrderCreatedEventV1 } from '../../orders/contracts/events';
import type { PaymentSucceededEventV1 } from '../contracts/events';
import type { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../payment-status.enum';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepository,
} from './payment-repository';

export type ProcessOrderCreatedResult = {
  payment: Payment;
  created: boolean;
};

@Injectable()
export class ProcessOrderCreatedService {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transaction: TransactionRunner,
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY)
    private readonly outbox: OutboxEventRepository,
  ) {}

  async process(
    event: OrderCreatedEventV1,
  ): Promise<ProcessOrderCreatedResult> {
    return this.transaction.run(async (tx) => {
      const existingPayment = await this.payments.findByOrderId(
        event.data.orderId,
        tx,
      );

      if (existingPayment) {
        return { payment: existingPayment, created: false };
      }

      const payment = await this.payments.create(
        {
          orderId: event.data.orderId,
          status: PaymentStatus.Succeeded,
          attemptCount: 1,
          providerReference: `fake-provider-${randomUUID()}`,
        },
        tx,
      );

      const paymentSucceededEvent: PaymentSucceededEventV1 = {
        eventId: randomUUID(),
        eventType: 'payment.succeeded',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: event.correlationId,
        data: {
          orderId: event.data.orderId,
          paymentId: payment.id,
          amount: event.data.amount,
        },
      };

      await this.outbox.append(paymentSucceededEvent, tx);

      return { payment, created: true };
    });
  }
}
