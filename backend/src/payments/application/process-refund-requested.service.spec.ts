import { randomUUID } from 'crypto';
import type { OutboxEventRepository } from '../../events/application/outbox-event-repository';
import type { ProcessedEventRepository } from '../../events/application/processed-event-repository';
import type { TransactionRunner } from '../../events/application/transaction-runner';
import type { RefundRequestedEventV1 } from '../../orders/contracts/events';
import type { RefundSucceededEventV1 } from '../contracts/events';
import type { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../payment-status.enum';
import type { NewPayment, PaymentRepository } from './payment-repository';
import {
  InvalidPaymentRefundTransitionError,
  ProcessRefundRequestedService,
} from './process-refund-requested.service';

type Tx = {
  id: number;
};

function givenTransactionRunner(): TransactionRunner {
  return {
    run: async (work) => work({ id: 1 } satisfies Tx),
  };
}

function givenPaymentRepository(payment: Payment | null) {
  const statusWrites: Array<{ paymentId: string; status: PaymentStatus }> = [];
  const findByOrderId = vi.fn(() => Promise.resolve(payment));
  const updateStatus = vi.fn((paymentId: string, status: PaymentStatus) => {
    statusWrites.push({ paymentId, status });
    return Promise.resolve();
  });

  const payments: PaymentRepository = {
    findByOrderId,
    create: (newPayment: NewPayment) =>
      Promise.resolve({
        id: randomUUID(),
        ...newPayment,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    updateStatus,
  };

  return { payments, findByOrderId, updateStatus, statusWrites };
}

function givenOutboxRepository() {
  const eventsAppended: RefundSucceededEventV1[] = [];
  const append = vi.fn(
    (
      event: Parameters<OutboxEventRepository['append']>[0],
      tx?: Parameters<OutboxEventRepository['append']>[1],
    ) => {
      void tx;
      eventsAppended.push(event as RefundSucceededEventV1);
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

function givenTestContext(payment: Payment | null, alreadyProcessed = false) {
  const paymentRepository = givenPaymentRepository(payment);
  const outboxRepository = givenOutboxRepository();
  const processedEventRepository =
    givenProcessedEventRepository(alreadyProcessed);

  return {
    service: new ProcessRefundRequestedService(
      givenTransactionRunner(),
      paymentRepository.payments,
      outboxRepository.outbox,
      processedEventRepository.processedEvents,
    ),
    ...paymentRepository,
    ...outboxRepository,
    ...processedEventRepository,
  };
}

function givenPayment(status = PaymentStatus.Succeeded): Payment {
  return {
    id: randomUUID(),
    orderId: randomUUID(),
    status,
    attemptCount: 1,
    providerReference: 'fake-provider-reference',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function givenRefundRequestedEvent(orderId: string): RefundRequestedEventV1 {
  return {
    eventId: randomUUID(),
    eventType: 'refund.requested',
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    data: {
      orderId,
      reason: 'no_seats_available',
    },
  };
}

describe('ProcessRefundRequestedService', () => {
  it('marks a succeeded payment as refunded and writes refund.succeeded to the outbox', async () => {
    const payment = givenPayment();
    const { service, statusWrites, eventsAppended, processedMarks } =
      givenTestContext(payment);
    const event = givenRefundRequestedEvent(payment.orderId);

    const result = await service.process(event);

    expect(result.refunded).toBe(true);
    expect(result.processed).toBe(true);
    expect(statusWrites).toEqual([
      { paymentId: payment.id, status: PaymentStatus.RefundSucceeded },
    ]);
    expect(eventsAppended).toEqual([
      expect.objectContaining({
        eventType: 'refund.succeeded',
        version: 1,
        correlationId: event.correlationId,
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
        },
      }) as RefundSucceededEventV1,
    ]);
    expect(processedMarks).toEqual([
      {
        eventId: event.eventId,
        consumer: 'payments.refund-requested.v1',
      },
    ]);
  });

  it('skips payment lookup and status update when the event was already processed', async () => {
    const payment = givenPayment();
    const { service, findByOrderId, updateStatus, append } = givenTestContext(
      payment,
      true,
    );
    const event = givenRefundRequestedEvent(payment.orderId);

    const result = await service.process(event);

    expect(result).toEqual({ processed: false });
    expect(findByOrderId).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });

  it('does not write another refund event when the payment was already refunded', async () => {
    const payment = givenPayment(PaymentStatus.RefundSucceeded);
    const { service, updateStatus, append } = givenTestContext(payment);
    const event = givenRefundRequestedEvent(payment.orderId);

    const result = await service.process(event);

    expect(result).toEqual({
      processed: true,
      payment,
      refunded: false,
    });
    expect(updateStatus).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });

  it('rejects refund requests for payments that did not succeed', async () => {
    const payment = givenPayment(PaymentStatus.Failed);
    const { service, updateStatus, append } = givenTestContext(payment);
    const event = givenRefundRequestedEvent(payment.orderId);

    await expect(service.process(event)).rejects.toBeInstanceOf(
      InvalidPaymentRefundTransitionError,
    );
    expect(updateStatus).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });

  it.todo(
    'rejects refund requests when no payment exists for the order',
    async () => {
      // maybe later, for now don't assert on msg wording 'was not found for refund'
    },
  );
});
