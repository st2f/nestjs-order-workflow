import { randomUUID } from 'crypto';
import type {
  EnrollmentFailedEventV1,
  EnrollmentGrantedEventV1,
} from '../../enrollments/contracts/events';
import type { OutboxEventRepository } from '../../events/application/outbox-event-repository';
import type { ProcessedEventRepository } from '../../events/application/processed-event-repository';
import type { TransactionRunner } from '../../events/application/transaction-runner';
import type { RefundSucceededEventV1 } from '../../payments/contracts/events';
import type { RefundRequestedEventV1 } from '../contracts/events';
import type { Order } from '../entities/order.entity';
import { OrderStatus } from '../order-status.enum';
import type { NewOrder, OrderRepository } from './order-repository';
import {
  InvalidOrderLifecycleTransitionError,
  ProcessOrderLifecycleEventService,
} from './process-order-lifecycle-event.service';

type Tx = {
  id: number;
};

function givenTransactionRunner(): TransactionRunner {
  return {
    run: async (work) => work({ id: 1 } satisfies Tx),
  };
}

function givenOrderRepository(order: Order | null) {
  const statusWrites: Array<{ orderId: string; status: OrderStatus }> = [];
  const findById = vi.fn(() => Promise.resolve(order));
  const updateStatus = vi.fn((orderId: string, status: OrderStatus) => {
    statusWrites.push({ orderId, status });
    return Promise.resolve();
  });

  const orders: OrderRepository = {
    findById,
    create: (newOrder: NewOrder) =>
      Promise.resolve({
        id: randomUUID(),
        ...newOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    updateStatus,
  };

  return { orders, findById, updateStatus, statusWrites };
}

function givenOutboxRepository() {
  const eventsAppended: RefundRequestedEventV1[] = [];
  const append = vi.fn(
    (
      event: Parameters<OutboxEventRepository['append']>[0],
      tx?: Parameters<OutboxEventRepository['append']>[1],
    ) => {
      void tx;
      eventsAppended.push(event as RefundRequestedEventV1);
      return Promise.resolve();
    },
  );

  const outbox: OutboxEventRepository = {
    append,
    findUnpublished: () => Promise.resolve([]),
    markPublished: () => Promise.resolve(),
    markPublishFailed: () => Promise.resolve(),
  };

  return { outbox, append, eventsAppended };
}

function givenProcessedEventRepository(alreadyProcessed = false) {
  const processedMarks: Array<{ eventId: string; consumer: string }> = [];
  const markProcessed = vi.fn((eventId: string, consumer: string) => {
    processedMarks.push({ eventId, consumer });
    return Promise.resolve(!alreadyProcessed);
  });

  const processedEvents: ProcessedEventRepository = {
    markProcessed,
  };

  return { processedEvents, markProcessed, processedMarks };
}

function givenTestContext(order: Order | null, alreadyProcessed = false) {
  const orderRepository = givenOrderRepository(order);
  const outboxRepository = givenOutboxRepository();
  const processedEventRepository =
    givenProcessedEventRepository(alreadyProcessed);

  return {
    service: new ProcessOrderLifecycleEventService(
      givenTransactionRunner(),
      orderRepository.orders,
      outboxRepository.outbox,
      processedEventRepository.processedEvents,
    ),
    ...orderRepository,
    ...outboxRepository,
    ...processedEventRepository,
  };
}

function givenOrder(status = OrderStatus.Paid): Order {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    courseId: randomUUID(),
    amount: '49.99',
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function givenEnrollmentGrantedEvent(
  orderId: string,
): EnrollmentGrantedEventV1 {
  return {
    eventId: randomUUID(),
    eventType: 'enrollment.granted',
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    data: {
      orderId,
      courseId: randomUUID(),
      enrollmentId: randomUUID(),
    },
  };
}

function givenEnrollmentFailedEvent(orderId: string): EnrollmentFailedEventV1 {
  return {
    eventId: randomUUID(),
    eventType: 'enrollment.failed',
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    data: {
      orderId,
      courseId: randomUUID(),
      reason: 'no_seats_available',
    },
  };
}

function givenRefundSucceededEvent(orderId: string): RefundSucceededEventV1 {
  return {
    eventId: randomUUID(),
    eventType: 'refund.succeeded',
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    data: {
      orderId,
      paymentId: randomUUID(),
    },
  };
}

describe('ProcessOrderLifecycleEventService', () => {
  it('marks a paid order as completed when enrollment is granted', async () => {
    const order = givenOrder();
    const { service, statusWrites, append } = givenTestContext(order);
    const event = givenEnrollmentGrantedEvent(order.id);

    const result = await service.process(event);

    expect(result).toEqual({
      processed: true,
      status: OrderStatus.Completed,
    });
    expect(statusWrites).toEqual([
      { orderId: order.id, status: OrderStatus.Completed },
    ]);
    expect(append).not.toHaveBeenCalled();
  });

  it('moves a paid order to refund in progress and writes refund.requested when enrollment fails', async () => {
    const order = givenOrder();
    const { service, statusWrites, eventsAppended } = givenTestContext(order);
    const event = givenEnrollmentFailedEvent(order.id);

    const result = await service.process(event);

    expect(result).toEqual({
      processed: true,
      status: OrderStatus.RefundInProgress,
      refundRequested: true,
    });
    expect(statusWrites).toEqual([
      { orderId: order.id, status: OrderStatus.RefundInProgress },
    ]);
    expect(eventsAppended).toEqual([
      expect.objectContaining({
        eventType: 'refund.requested',
        version: 1,
        correlationId: event.correlationId,
        data: {
          orderId: order.id,
          reason: event.data.reason,
        },
      }) as RefundRequestedEventV1,
    ]);
  });

  it('marks a refund-in-progress order as refunded when refund succeeds', async () => {
    const order = givenOrder(OrderStatus.RefundInProgress);
    const { service, statusWrites, append } = givenTestContext(order);
    const event = givenRefundSucceededEvent(order.id);

    const result = await service.process(event);

    expect(result).toEqual({
      processed: true,
      status: OrderStatus.Refunded,
    });
    expect(statusWrites).toEqual([
      { orderId: order.id, status: OrderStatus.Refunded },
    ]);
    expect(append).not.toHaveBeenCalled();
  });

  it('does not write another refund request when the order is already refund in progress', async () => {
    const order = givenOrder(OrderStatus.RefundInProgress);
    const { service, statusWrites, append } = givenTestContext(order);
    const event = givenEnrollmentFailedEvent(order.id);

    const result = await service.process(event);

    expect(result).toEqual({
      processed: true,
      status: OrderStatus.RefundInProgress,
    });
    expect(statusWrites).toEqual([]);
    expect(append).not.toHaveBeenCalled();
  });

  it('skips order lookup and status update when the event was already processed', async () => {
    const order = givenOrder();
    const { service, findById, updateStatus, append } = givenTestContext(
      order,
      true,
    );
    const event = givenEnrollmentFailedEvent(order.id);

    const result = await service.process(event);

    expect(result).toEqual({ processed: false });
    expect(findById).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });

  it('rejects invalid order status transitions', async () => {
    const order = givenOrder(OrderStatus.PaymentFailed);
    const { service, updateStatus, append } = givenTestContext(order);
    const event = givenEnrollmentGrantedEvent(order.id);

    await expect(service.process(event)).rejects.toBeInstanceOf(
      InvalidOrderLifecycleTransitionError,
    );
    expect(updateStatus).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });

  it.todo('rejects lifecycle events for an unknown order', async () => {
    // maybe later, for now don't assert on msg wording 'was not found for lifecycle event'
  });
});
