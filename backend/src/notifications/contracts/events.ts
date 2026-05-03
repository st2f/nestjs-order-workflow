import type { DomainEvent } from '../../events/contracts/domain-event';

export type NotificationSentEventV1 = DomainEvent<
  'notification.sent',
  1,
  {
    orderId: string;
    notificationId: string;
    notificationType: string;
  }
>;
