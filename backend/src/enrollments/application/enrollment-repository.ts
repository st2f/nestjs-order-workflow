import type { TransactionContext } from '../../events/application/transaction-runner';
import type { Enrollment } from '../entities/enrollment.entity';
import type { EnrollmentStatus } from '../enrollment-status.enum';

export const ENROLLMENT_REPOSITORY = Symbol('ENROLLMENT_REPOSITORY');

export type NewEnrollment = {
  orderId: string;
  courseId: string;
  status: EnrollmentStatus;
};

export type EnrollmentRepository = {
  findByOrderId(
    orderId: string,
    tx?: TransactionContext,
  ): Promise<Enrollment | null>;
  create(
    enrollment: NewEnrollment,
    tx?: TransactionContext,
  ): Promise<Enrollment>;
};
