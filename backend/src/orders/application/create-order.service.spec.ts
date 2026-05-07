import { randomUUID } from 'crypto';
import { OutboxEventRepository } from '../../events/application/outbox-event-repository';
import { TransactionRunner } from '../../events/application/transaction-runner';
import { OrderCreatedEventV1 } from '../contracts/events';
import { OrderStatus } from '../order-status.enum';
import { NewOrder, OrderRepository } from './order-repository';
import { CreateOrderCommand, CreateOrderService } from './create-order.service';

type Tx = {
  id: number;
};

function givenTransactionRunner(): TransactionRunner {
  return {
    run: async (work) => work({ id: 1 } satisfies Tx),
  };
}

function givenOrderRepository() {
  const orders: OrderRepository = {
    create: (newOrder: NewOrder) => {
      const order = {
        id: randomUUID(),
        ...newOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return Promise.resolve(order);
    },
  };

  return orders;
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
  const outboxRepository = givenOutboxRepository();

  return {
    service: new CreateOrderService(
      givenTransactionRunner(),
      givenOrderRepository(),
      outboxRepository.outbox,
    ),
    eventsAppended: outboxRepository.eventsAppended,
  };
}

function givenCreateOrderCommand(): CreateOrderCommand {
  return {
    userId: randomUUID(),
    courseId: randomUUID(),
    amount: '49.99',
    correlationId: randomUUID(),
  };
}

describe('CreateOrderService', () => {
  it('creates an order with PENDING status', async () => {
    const { service } = givenTestContext();
    const command = givenCreateOrderCommand();

    const order = await service.create(command);

    expect(order).toEqual(
      expect.objectContaining({
        userId: command.userId,
        courseId: command.courseId,
        amount: command.amount,
        status: OrderStatus.Pending,
      }),
    );
  });

  it('writes an order.created outbox event', async () => {
    const { service, eventsAppended } = givenTestContext();
    const command = givenCreateOrderCommand();

    const order = await service.create(command);

    expect(eventsAppended).toEqual([
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
