import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  EnrollmentFailedEventV1,
  EnrollmentGrantedEventV1,
} from '../../enrollments/contracts/events';
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
import type { RefundSucceededEventV1 } from '../../payments/contracts/events';
import { broadcastDebugStateUpdated } from '../../shared/debug-state-updates';
import type { RefundRequestedEventV1 } from '../contracts/events';
import { OrderStatus } from '../order-status.enum';
import { ORDER_REPOSITORY, type OrderRepository } from './order-repository';

const CONSUMER_NAME = 'orders.lifecycle-events.v1';

export type OrderLifecycleEventV1 =
  | EnrollmentGrantedEventV1
  | EnrollmentFailedEventV1
  | RefundSucceededEventV1;

export type ProcessOrderLifecycleEventResult = {
  processed: boolean;
  status?: OrderStatus;
  refundRequested?: boolean;
};

@Injectable()
export class ProcessOrderLifecycleEventService {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transaction: TransactionRunner,
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY)
    private readonly outbox: OutboxEventRepository,
    @Inject(PROCESSED_EVENT_REPOSITORY)
    private readonly processedEvents: ProcessedEventRepository,
  ) {}

  async process(
    event: OrderLifecycleEventV1,
  ): Promise<ProcessOrderLifecycleEventResult> {
    let changedDebugState = false;

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
        throw new OrderNotFoundForLifecycleEventError(event.data.orderId);
      }

      const nextStatus = statusForLifecycleEvent(event);
      assertTransitionAllowed(order.status, nextStatus);

      const statusChanged = order.status !== nextStatus;

      if (statusChanged) {
        await this.orders.updateStatus(order.id, nextStatus, tx);
        changedDebugState = true;
      }

      if (event.eventType === 'enrollment.failed' && statusChanged) {
        const refundRequestedEvent: RefundRequestedEventV1 = {
          eventId: randomUUID(),
          eventType: 'refund.requested',
          version: 1,
          occurredAt: new Date().toISOString(),
          correlationId: event.correlationId,
          data: {
            orderId: event.data.orderId,
            reason: event.data.reason,
          },
        };

        await this.outbox.append(refundRequestedEvent, tx);
        changedDebugState = true;

        return {
          processed: true,
          status: nextStatus,
          refundRequested: true,
        };
      }

      return { processed: true, status: nextStatus };
    });

    if (changedDebugState) {
      broadcastDebugStateUpdated();
    }

    return result;
  }
}

export class InvalidOrderLifecycleTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order status transition from ${from} to ${to}`);
  }
}

export class OrderNotFoundForLifecycleEventError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} was not found for lifecycle event`);
  }
}

function statusForLifecycleEvent(event: OrderLifecycleEventV1): OrderStatus {
  switch (event.eventType) {
    case 'enrollment.granted':
      return OrderStatus.Completed;
    case 'enrollment.failed':
      return OrderStatus.RefundInProgress;
    case 'refund.succeeded':
      return OrderStatus.Refunded;
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
    [OrderStatus.Paid]: [OrderStatus.Completed, OrderStatus.RefundInProgress],
    [OrderStatus.RefundInProgress]: [OrderStatus.Refunded],
  };

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new InvalidOrderLifecycleTransitionError(currentStatus, nextStatus);
  }
}
