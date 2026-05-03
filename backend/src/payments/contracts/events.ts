import type { DomainEvent } from '../../events/contracts/domain-event';

export type PaymentSucceededEventV1 = DomainEvent<
  'payment.succeeded',
  1,
  {
    orderId: string;
    paymentId: string;
    amount: string;
  }
>;

export type PaymentFailedEventV1 = DomainEvent<
  'payment.failed',
  1,
  {
    orderId: string;
    paymentId: string;
    reason: string;
  }
>;

export type RefundSucceededEventV1 = DomainEvent<
  'refund.succeeded',
  1,
  {
    orderId: string;
    paymentId: string;
  }
>;

export type PaymentEventV1 =
  | PaymentSucceededEventV1
  | PaymentFailedEventV1
  | RefundSucceededEventV1;
