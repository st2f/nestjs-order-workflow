import { TransactionContext } from '../../events/application/transaction-runner';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../order-status.enum';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export type NewOrder = {
  userId: string;
  courseId: string;
  amount: string;
  status: OrderStatus;
};

export type OrderRepository = {
  findById(orderId: string, tx?: TransactionContext): Promise<Order | null>;
  create(order: NewOrder, tx?: TransactionContext): Promise<Order>;
  updateStatus(
    orderId: string,
    status: OrderStatus,
    tx?: TransactionContext,
  ): Promise<void>;
};
