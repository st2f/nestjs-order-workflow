import { randomUUID } from 'crypto';
import type { OutboxEventRepository } from '../../events/application/outbox-event-repository';
import type { ProcessedEventRepository } from '../../events/application/processed-event-repository';
import type { TransactionRunner } from '../../events/application/transaction-runner';
import type { PaymentSucceededEventV1 } from '../../payments/contracts/events';
import { ENROLLMENT_FAILURE_COURSE_ID } from '../../shared/scenario-course-ids';
import type {
  EnrollmentFailedEventV1,
  EnrollmentGrantedEventV1,
} from '../contracts/events';
import type { Enrollment } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollment-status.enum';
import type {
  EnrollmentRepository,
  NewEnrollment,
} from './enrollment-repository';
import { ProcessPaymentSucceededService } from './process-payment-succeeded.service';

type Tx = {
  id: number;
};

function givenTransactionRunner(): TransactionRunner {
  return {
    run: async (work) => work({ id: 1 } satisfies Tx),
  };
}

function givenOutboxRepository() {
  const eventsAppended: Array<
    EnrollmentGrantedEventV1 | EnrollmentFailedEventV1
  > = [];
  const append = vi.fn(
    (
      event: Parameters<OutboxEventRepository['append']>[0],
      tx?: Parameters<OutboxEventRepository['append']>[1],
    ) => {
      void tx;
      eventsAppended.push(
        event as EnrollmentGrantedEventV1 | EnrollmentFailedEventV1,
      );
      return Promise.resolve();
    },
  );

  const outbox: OutboxEventRepository = {
    append,
    findUnpublished: () => Promise.resolve([]),
    markPublished: () => Promise.resolve(),
    markPublishFailed: () => Promise.resolve(),
  };

  return { outbox, append, eventsAppended };
}

function givenEnrollmentRepository(existingEnrollment?: Enrollment) {
  const enrollmentsCreated: NewEnrollment[] = [];
  const findByOrderId = vi.fn(() =>
    Promise.resolve(existingEnrollment ?? null),
  );
  const create = vi.fn((newEnrollment: NewEnrollment) => {
    enrollmentsCreated.push(newEnrollment);
    return Promise.resolve(givenEnrollment(newEnrollment));
  });

  const enrollments: EnrollmentRepository = {
    findByOrderId,
    create,
  };

  return { enrollments, findByOrderId, create, enrollmentsCreated };
}

function givenProcessedEventRepository(alreadyProcessed = false) {
  const processedMarks: Array<{ eventId: string; consumer: string }> = [];
  const markProcessed = vi.fn((eventId: string, consumer: string) => {
    processedMarks.push({ eventId, consumer });
    return Promise.resolve(!alreadyProcessed);
  });

  const processedEvents: ProcessedEventRepository = {
    markProcessed,
  };

  return { processedEvents, markProcessed, processedMarks };
}

function givenTestContext(
  existingEnrollment?: Enrollment,
  alreadyProcessed = false,
) {
  const outboxRepository = givenOutboxRepository();
  const enrollmentRepository = givenEnrollmentRepository(existingEnrollment);
  const processedEventRepository =
    givenProcessedEventRepository(alreadyProcessed);

  return {
    service: new ProcessPaymentSucceededService(
      givenTransactionRunner(),
      enrollmentRepository.enrollments,
      outboxRepository.outbox,
      processedEventRepository.processedEvents,
    ),
    appendOutboxEvent: outboxRepository.append,
    eventsAppended: outboxRepository.eventsAppended,
    createEnrollment: enrollmentRepository.create,
    findEnrollmentByOrderId: enrollmentRepository.findByOrderId,
    enrollmentsCreated: enrollmentRepository.enrollmentsCreated,
    processedMarks: processedEventRepository.processedMarks,
  };
}

function givenEnrollment(newEnrollment: NewEnrollment): Enrollment {
  return {
    id: randomUUID(),
    ...newEnrollment,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function givenPaymentSucceededEvent(): PaymentSucceededEventV1 {
  return {
    eventId: randomUUID(),
    eventType: 'payment.succeeded',
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    data: {
      orderId: randomUUID(),
      paymentId: randomUUID(),
      courseId: randomUUID(),
      amount: '49.99',
    },
  };
}

describe('ProcessPaymentSucceededService', () => {
  it('creates a granted enrollment and writes enrollment.granted to the outbox', async () => {
    const { service, enrollmentsCreated, eventsAppended, processedMarks } =
      givenTestContext();
    const event = givenPaymentSucceededEvent();

    const result = await service.process(event);

    expect(result.created).toBe(true);
    expect(result.processed).toBe(true);
    expect(enrollmentsCreated).toEqual([
      {
        orderId: event.data.orderId,
        courseId: event.data.courseId,
        status: EnrollmentStatus.Granted,
      },
    ]);
    expect(eventsAppended).toEqual([
      expect.objectContaining({
        eventType: 'enrollment.granted',
        version: 1,
        correlationId: event.correlationId,
        data: {
          orderId: event.data.orderId,
          courseId: event.data.courseId,
          enrollmentId: result.enrollment?.id,
        },
      }) as EnrollmentGrantedEventV1,
    ]);
    expect(processedMarks).toEqual([
      {
        eventId: event.eventId,
        consumer: 'enrollments.payment-succeeded.v1',
      },
    ]);
  });

  it('skips enrollment lookup, creation, and outbox write when the event was already processed', async () => {
    const {
      service,
      findEnrollmentByOrderId,
      createEnrollment,
      appendOutboxEvent,
    } = givenTestContext(undefined, true);
    const event = givenPaymentSucceededEvent();

    const result = await service.process(event);

    expect(result).toEqual({ processed: false });
    expect(findEnrollmentByOrderId).not.toHaveBeenCalled();
    expect(createEnrollment).not.toHaveBeenCalled();
    expect(appendOutboxEvent).not.toHaveBeenCalled();
  });

  it('skips enrollment creation and outbox write when the order already has an enrollment', async () => {
    const event = givenPaymentSucceededEvent();
    const existingEnrollment = givenEnrollment({
      orderId: event.data.orderId,
      courseId: event.data.courseId,
      status: EnrollmentStatus.Granted,
    });
    const { service, createEnrollment, appendOutboxEvent } =
      givenTestContext(existingEnrollment);

    const result = await service.process(event);

    expect(result).toEqual({
      processed: true,
      enrollment: existingEnrollment,
      created: false,
    });
    expect(createEnrollment).not.toHaveBeenCalled();
    expect(appendOutboxEvent).not.toHaveBeenCalled();
  });

  it('creates a failed enrollment and writes enrollment.failed for the enrollment failure scenario course', async () => {
    const { service, enrollmentsCreated, eventsAppended } = givenTestContext();
    const baseEvent = givenPaymentSucceededEvent();
    const event = {
      ...baseEvent,
      data: {
        ...baseEvent.data,
        courseId: ENROLLMENT_FAILURE_COURSE_ID,
      },
    };

    const result = await service.process(event);

    expect(result.created).toBe(true);
    expect(result.processed).toBe(true);
    expect(enrollmentsCreated).toEqual([
      {
        orderId: event.data.orderId,
        courseId: event.data.courseId,
        status: EnrollmentStatus.Failed,
      },
    ]);
    expect(eventsAppended).toEqual([
      expect.objectContaining({
        eventType: 'enrollment.failed',
        version: 1,
        correlationId: event.correlationId,
        data: {
          orderId: event.data.orderId,
          courseId: event.data.courseId,
          reason: 'scenario_no_seats_available',
        },
      }),
    ]);
  });
});
