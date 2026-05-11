import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  OUTBOX_EVENT_REPOSITORY,
  type OutboxEventRepository,
} from '../../events/application/outbox-event-repository';
import {
  PROCESSED_EVENT_REPOSITORY,
  type ProcessedEventRepository,
} from '../../events/application/processed-event-repository';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../events/application/transaction-runner';
import type { PaymentSucceededEventV1 } from '../../payments/contracts/events';
import type { EnrollmentGrantedEventV1 } from '../contracts/events';
import type { Enrollment } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollment-status.enum';
import {
  ENROLLMENT_REPOSITORY,
  type EnrollmentRepository,
} from './enrollment-repository';

const CONSUMER_NAME = 'enrollments.payment-succeeded.v1';

export type ProcessPaymentSucceededResult = {
  processed: boolean;
  enrollment?: Enrollment;
  created?: boolean;
};

@Injectable()
export class ProcessPaymentSucceededService {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transaction: TransactionRunner,
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollments: EnrollmentRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY)
    private readonly outbox: OutboxEventRepository,
    @Inject(PROCESSED_EVENT_REPOSITORY)
    private readonly processedEvents: ProcessedEventRepository,
  ) {}

  async process(
    event: PaymentSucceededEventV1,
  ): Promise<ProcessPaymentSucceededResult> {
    return this.transaction.run(async (tx) => {
      const markedProcessed = await this.processedEvents.markProcessed(
        event.eventId,
        CONSUMER_NAME,
        tx,
      );

      if (!markedProcessed) {
        return { processed: false };
      }

      const existingEnrollment = await this.enrollments.findByOrderId(
        event.data.orderId,
        tx,
      );

      if (existingEnrollment) {
        return {
          processed: true,
          enrollment: existingEnrollment,
          created: false,
        };
      }

      const enrollment = await this.enrollments.create(
        {
          orderId: event.data.orderId,
          courseId: event.data.courseId,
          status: EnrollmentStatus.Granted,
        },
        tx,
      );

      const enrollmentGrantedEvent: EnrollmentGrantedEventV1 = {
        eventId: randomUUID(),
        eventType: 'enrollment.granted',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: event.correlationId,
        data: {
          orderId: event.data.orderId,
          courseId: event.data.courseId,
          enrollmentId: enrollment.id,
        },
      };

      await this.outbox.append(enrollmentGrantedEvent, tx);

      return { processed: true, enrollment, created: true };
    });
  }
}
