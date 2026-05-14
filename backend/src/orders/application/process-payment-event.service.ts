import { Inject, Injectable } from '@nestjs/common';
import {
  PROCESSED_EVENT_REPOSITORY,
  type ProcessedEventRepository,
} from '../../events/application/processed-event-repository';
import { TRANSACTION_RUNNER } from '../../events/application/transaction-runner';
import type { TransactionRunner } from '../../events/application/transaction-runner';
import type {
  PaymentFailedEventV1,
  PaymentSucceededEventV1,
} from '../../payments/contracts/events';
import { broadcastDebugStateUpdated } from '../../shared/debug-state-updates';
import { OrderStatus } from '../order-status.enum';
import { ORDER_REPOSITORY, type OrderRepository } from './order-repository';

const CONSUMER_NAME = 'orders.payment-events.v1';

export type OrderPaymentEventV1 =
  | PaymentSucceededEventV1
  | PaymentFailedEventV1;

export type ProcessPaymentEventResult = {
  processed: boolean;
  status?: OrderStatus;
};

@Injectable()
export class ProcessPaymentEventService {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transaction: TransactionRunner,
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(PROCESSED_EVENT_REPOSITORY)
    private readonly processedEvents: ProcessedEventRepository,
  ) {}

  async process(
    event: OrderPaymentEventV1,
  ): Promise<ProcessPaymentEventResult> {
    let statusChanged = false;

    const result = await this.transaction.run(async (tx) => {
      const markedProcessed = await this.processedEvents.markProcessed(
        event.eventId,
        CONSUMER_NAME,
        tx,
      );

      if (!markedProcessed) {
        return { processed: false };
      }

      const order = await this.orders.findById(event.data.orderId, tx);

      if (!order) {
        throw new OrderNotFoundForPaymentEventError(event.data.orderId);
      }

      const nextStatus = statusForPaymentEvent(event);
      assertTransitionAllowed(order.status, nextStatus);
      statusChanged = order.status !== nextStatus;

      if (statusChanged) {
        await this.orders.updateStatus(order.id, nextStatus, tx);
      }

      return { processed: true, status: nextStatus };
    });

    if (statusChanged) {
      broadcastDebugStateUpdated();
    }

    return result;
  }
}

export class InvalidOrderStatusTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order status transition from ${from} to ${to}`);
  }
}

export class OrderNotFoundForPaymentEventError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} was not found for payment event`);
  }
}

function statusForPaymentEvent(event: OrderPaymentEventV1): OrderStatus {
  switch (event.eventType) {
    case 'payment.succeeded':
      return OrderStatus.Paid;
    case 'payment.failed':
      return OrderStatus.PaymentFailed;
  }
}

function assertTransitionAllowed(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
    [OrderStatus.Pending]: [OrderStatus.Paid, OrderStatus.PaymentFailed],
  };

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new InvalidOrderStatusTransitionError(currentStatus, nextStatus);
  }
}
