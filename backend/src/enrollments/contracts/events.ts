import type { DomainEvent } from '../../events/contracts/domain-event';

export type EnrollmentGrantedEventV1 = DomainEvent<
  'enrollment.granted',
  1,
  {
    orderId: string;
    courseId: string;
    enrollmentId: string;
  }
>;

export type EnrollmentFailedEventV1 = DomainEvent<
  'enrollment.failed',
  1,
  {
    orderId: string;
    courseId: string;
    reason: string;
  }
>;

export type EnrollmentEventV1 =
  | EnrollmentGrantedEventV1
  | EnrollmentFailedEventV1;
