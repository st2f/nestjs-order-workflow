import { randomUUID } from 'crypto';
import { OutboxEventRepository } from '../../events/application/outbox-event-repository';
import { TransactionRunner } from '../../events/application/transaction-runner';
import { OrderCreatedEventV1 } from '../contracts/events';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../order-status.enum';
import { NewOrder, OrderRepository } from './order-repository';
import { CreateOrderService } from './create-order.service';

type Tx = {
  id: number;
};

function givenTransactionRunner() {
  let transactionCount = 0;

  const transaction: TransactionRunner = {
    run: async (work) => {
      transactionCount += 1;
      return work({ id: transactionCount } satisfies Tx);
    },
  };

  return transaction;
}

function givenOrderRepository() {
  const ordersCreated: Order[] = [];

  const orders: OrderRepository = {
    create: (newOrder: NewOrder) => {
      const order = {
        id: randomUUID(),
        ...newOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      ordersCreated.push(order);
      return Promise.resolve(order);
    },
  };

  return { orders, ordersCreated };
}

function givenOutboxRepository() {
  const eventsAppended: OrderCreatedEventV1[] = [];

  const outbox: OutboxEventRepository = {
    append: (event) => {
      eventsAppended.push(event as OrderCreatedEventV1);
      return Promise.resolve();
    },
  };

  return { outbox, eventsAppended };
}

function givenTestContext() {
  const orderRepository = givenOrderRepository();
  const outboxRepository = givenOutboxRepository();

  return {
    deps: {
      transaction: givenTransactionRunner(),
      orders: orderRepository.orders,
      outbox: outboxRepository.outbox,
    },
    writes: {
      orders: orderRepository.ordersCreated,
      events: outboxRepository.eventsAppended,
    },
  };
}

describe('CreateOrderService', () => {
  it('creates an order with PENDING status', async () => {
    const { deps, writes } = givenTestContext();
    const service = new CreateOrderService(
      deps.transaction,
      deps.orders,
      deps.outbox,
    );
    const command = {
      userId: randomUUID(),
      courseId: randomUUID(),
      amount: '49.99',
      correlationId: randomUUID(),
    };

    const order = await service.create(command);

    expect(order.status).toBe(OrderStatus.Pending);
    expect(writes.orders).toEqual([
      expect.objectContaining({
        id: order.id,
        userId: command.userId,
        courseId: command.courseId,
        amount: command.amount,
        status: OrderStatus.Pending,
      }) as Order,
    ]);
  });

  it('writes an order.created outbox event', async () => {
    const { deps, writes } = givenTestContext();
    const service = new CreateOrderService(
      deps.transaction,
      deps.orders,
      deps.outbox,
    );
    const command = {
      userId: randomUUID(),
      courseId: randomUUID(),
      amount: '49.99',
      correlationId: randomUUID(),
    };

    const order = await service.create(command);

    expect(writes.events).toEqual([
      expect.objectContaining({
        eventType: 'order.created',
        version: 1,
        correlationId: command.correlationId,
        data: {
          orderId: order.id,
          userId: command.userId,
          courseId: command.courseId,
          amount: command.amount,
        },
      }) as OrderCreatedEventV1,
    ]);
  });
});
