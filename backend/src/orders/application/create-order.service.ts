import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OUTBOX_EVENT_REPOSITORY } from '../../events/application/outbox-event-repository';
import type { OutboxEventRepository } from '../../events/application/outbox-event-repository';
import { TRANSACTION_RUNNER } from '../../events/application/transaction-runner';
import type { TransactionRunner } from '../../events/application/transaction-runner';
import { OrderCreatedEventV1 } from '../contracts/events';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../order-status.enum';
import { ORDER_REPOSITORY } from './order-repository';
import type { OrderRepository } from './order-repository';

export type CreateOrderCommand = CreateOrderDto & {
  correlationId?: string;
};

@Injectable()
export class CreateOrderService {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transaction: TransactionRunner,
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY)
    private readonly outbox: OutboxEventRepository,
  ) {}

  async create(command: CreateOrderCommand): Promise<Order> {
    return this.transaction.run(async (tx) => {
      const order = await this.orders.create(
        {
          userId: command.userId,
          courseId: command.courseId,
          amount: command.amount,
          status: OrderStatus.Pending,
        },
        tx,
      );
      const occurredAt = new Date().toISOString();

      const event: OrderCreatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'order.created',
        version: 1,
        occurredAt,
        correlationId: command.correlationId ?? randomUUID(),
        data: {
          orderId: order.id,
          userId: order.userId,
          courseId: order.courseId,
          amount: order.amount,
        },
      };

      await this.outbox.append(event, tx);

      return order;
    });
  }
}
