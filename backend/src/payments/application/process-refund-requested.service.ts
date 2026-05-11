import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { RefundRequestedEventV1 } from '../../orders/contracts/events';
import {
  OUTBOX_EVENT_REPOSITORY,
  type OutboxEventRepository,
} from '../../events/application/outbox-event-repository';
import {
  PROCESSED_EVENT_REPOSITORY,
  type ProcessedEventRepository,
} from '../../events/application/processed-event-repository';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../events/application/transaction-runner';
import type { RefundSucceededEventV1 } from '../contracts/events';
import type { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../payment-status.enum';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepository,
} from './payment-repository';

const CONSUMER_NAME = 'payments.refund-requested.v1';

export type ProcessRefundRequestedResult = {
  processed: boolean;
  payment?: Payment;
  refunded?: boolean;
};

@Injectable()
export class ProcessRefundRequestedService {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transaction: TransactionRunner,
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY)
    private readonly outbox: OutboxEventRepository,
    @Inject(PROCESSED_EVENT_REPOSITORY)
    private readonly processedEvents: ProcessedEventRepository,
  ) {}

  async process(
    event: RefundRequestedEventV1,
  ): Promise<ProcessRefundRequestedResult> {
    return this.transaction.run(async (tx) => {
      const markedProcessed = await this.processedEvents.markProcessed(
        event.eventId,
        CONSUMER_NAME,
        tx,
      );

      if (!markedProcessed) {
        return { processed: false };
      }

      const payment = await this.payments.findByOrderId(event.data.orderId, tx);

      if (!payment) {
        throw new PaymentNotFoundForRefundError(event.data.orderId);
      }

      assertRefundAllowed(payment.status);

      if (payment.status === PaymentStatus.RefundSucceeded) {
        return { processed: true, payment, refunded: false };
      }

      await this.payments.updateStatus(
        payment.id,
        PaymentStatus.RefundSucceeded,
        tx,
      );

      const refundSucceededEvent: RefundSucceededEventV1 = {
        eventId: randomUUID(),
        eventType: 'refund.succeeded',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: event.correlationId,
        data: {
          orderId: event.data.orderId,
          paymentId: payment.id,
        },
      };

      await this.outbox.append(refundSucceededEvent, tx);

      return {
        processed: true,
        payment: {
          ...payment,
          status: PaymentStatus.RefundSucceeded,
        },
        refunded: true,
      };
    });
  }
}

export class InvalidPaymentRefundTransitionError extends Error {
  constructor(status: PaymentStatus) {
    super(`Cannot refund payment with status ${status}`);
  }
}

export class PaymentNotFoundForRefundError extends Error {
  constructor(orderId: string) {
    super(`Payment for order ${orderId} was not found for refund`);
  }
}

function assertRefundAllowed(status: PaymentStatus): void {
  if (
    status === PaymentStatus.Succeeded ||
    status === PaymentStatus.RefundSucceeded
  ) {
    return;
  }

  throw new InvalidPaymentRefundTransitionError(status);
}
