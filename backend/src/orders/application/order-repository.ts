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
  create(order: NewOrder, tx?: TransactionContext): Promise<Order>;
};
