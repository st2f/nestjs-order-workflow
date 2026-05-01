import type { DomainEvent } from '../../events/contracts/domain-event';

export type OrderCreatedEventV1 = DomainEvent<
  'order.created',
  1,
  {
    orderId: string;
    userId: string;
    courseId: string;
    amount: string;
  }
>;

export type RefundRequestedEventV1 = DomainEvent<
  'refund.requested',
  1,
  {
    orderId: string;
    paymentId?: string;
    reason: string;
  }
>;

export type OrderEventV1 = OrderCreatedEventV1 | RefundRequestedEventV1;
