import { randomUUID } from 'crypto';
import type { ProcessedEventRepository } from '../../events/application/processed-event-repository';
import type { TransactionRunner } from '../../events/application/transaction-runner';
import type {
  PaymentFailedEventV1,
  PaymentSucceededEventV1,
} from '../../payments/contracts/events';
import type { Order } from '../entities/order.entity';
import { OrderStatus } from '../order-status.enum';
import type { NewOrder, OrderRepository } from './order-repository';
import {
  InvalidOrderStatusTransitionError,
  ProcessPaymentEventService,
} from './process-payment-event.service';

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
  const processedEventRepository =
    givenProcessedEventRepository(alreadyProcessed);

  return {
    service: new ProcessPaymentEventService(
      givenTransactionRunner(),
      orderRepository.orders,
      processedEventRepository.processedEvents,
    ),
    ...orderRepository,
    ...processedEventRepository,
  };
}

function givenOrder(status = OrderStatus.Pending): Order {
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

function givenPaymentSucceededEvent(orderId: string): PaymentSucceededEventV1 {
  return {
    eventId: randomUUID(),
    eventType: 'payment.succeeded',
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    data: {
      orderId,
      paymentId: randomUUID(),
      courseId: randomUUID(),
      amount: '49.99',
    },
  };
}

function givenPaymentFailedEvent(orderId: string): PaymentFailedEventV1 {
  return {
    eventId: randomUUID(),
    eventType: 'payment.failed',
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    data: {
      orderId,
      paymentId: randomUUID(),
      reason: 'card_declined',
    },
  };
}

describe('ProcessPaymentEventService', () => {
  it('marks a pending order as paid when payment succeeds', async () => {
    const order = givenOrder();
    const { service, statusWrites } = givenTestContext(order);
    const event = givenPaymentSucceededEvent(order.id);

    const result = await service.process(event);

    expect(result).toEqual({ processed: true, status: OrderStatus.Paid });
    expect(statusWrites).toEqual([
      { orderId: order.id, status: OrderStatus.Paid },
    ]);
  });

  it('marks a pending order as payment failed when payment fails', async () => {
    const order = givenOrder();
    const { service, statusWrites } = givenTestContext(order);
    const event = givenPaymentFailedEvent(order.id);

    const result = await service.process(event);

    expect(result).toEqual({
      processed: true,
      status: OrderStatus.PaymentFailed,
    });
    expect(statusWrites).toEqual([
      { orderId: order.id, status: OrderStatus.PaymentFailed },
    ]);
  });

  it('skips order lookup and status update when the event was already processed', async () => {
    const order = givenOrder();
    const { service, findById, updateStatus } = givenTestContext(order, true);
    const event = givenPaymentSucceededEvent(order.id);

    const result = await service.process(event);

    expect(result).toEqual({ processed: false });
    expect(findById).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('rejects invalid order status transitions', async () => {
    const order = givenOrder(OrderStatus.Completed);
    const { service, updateStatus } = givenTestContext(order);
    const event = givenPaymentSucceededEvent(order.id);

    await expect(service.process(event)).rejects.toBeInstanceOf(
      InvalidOrderStatusTransitionError,
    );
    expect(updateStatus).not.toHaveBeenCalled();
  });
});
