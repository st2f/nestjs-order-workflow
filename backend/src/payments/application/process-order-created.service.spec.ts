import { randomUUID } from 'crypto';
import type { OutboxEventRepository } from '../../events/application/outbox-event-repository';
import type { TransactionRunner } from '../../events/application/transaction-runner';
import type { OrderCreatedEventV1 } from '../../orders/contracts/events';
import type { PaymentSucceededEventV1 } from '../contracts/events';
import type { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../payment-status.enum';
import type { NewPayment, PaymentRepository } from './payment-repository';
import { ProcessOrderCreatedService } from './process-order-created.service';

type Tx = {
  id: number;
};

function givenTransactionRunner(): TransactionRunner {
  return {
    run: async (work) => work({ id: 1 } satisfies Tx),
  };
}

function givenOutboxRepository() {
  const eventsAppended: PaymentSucceededEventV1[] = [];
  const append = vi.fn(
    (
      event: Parameters<OutboxEventRepository['append']>[0],
      tx?: Parameters<OutboxEventRepository['append']>[1],
    ) => {
      void tx;
      eventsAppended.push(event as PaymentSucceededEventV1);
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

function givenPaymentRepository(existingPayment?: Payment) {
  const paymentsCreated: NewPayment[] = [];
  const findByOrderId = vi.fn(() => Promise.resolve(existingPayment ?? null));
  const create = vi.fn((newPayment: NewPayment) => {
    paymentsCreated.push(newPayment);
    return Promise.resolve(givenPayment(newPayment));
  });

  const payments: PaymentRepository = {
    findByOrderId,
    create,
    updateStatus: () => Promise.resolve(),
  };

  return { payments, findByOrderId, create, paymentsCreated };
}

function givenTestContext(existingPayment?: Payment) {
  const outboxRepository = givenOutboxRepository();
  const paymentRepository = givenPaymentRepository(existingPayment);

  return {
    service: new ProcessOrderCreatedService(
      givenTransactionRunner(),
      paymentRepository.payments,
      outboxRepository.outbox,
    ),
    appendOutboxEvent: outboxRepository.append,
    eventsAppended: outboxRepository.eventsAppended,
    createPayment: paymentRepository.create,
    paymentsCreated: paymentRepository.paymentsCreated,
  };
}

function givenPayment(newPayment: NewPayment): Payment {
  return {
    id: randomUUID(),
    ...newPayment,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function givenOrderCreatedEvent(): OrderCreatedEventV1 {
  return {
    eventId: randomUUID(),
    eventType: 'order.created',
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    data: {
      orderId: randomUUID(),
      userId: randomUUID(),
      courseId: randomUUID(),
      amount: '49.99',
    },
  };
}

describe('ProcessOrderCreatedService', () => {
  it('creates a succeeded payment and writes payment.succeeded to the outbox', async () => {
    const { service, paymentsCreated, eventsAppended } = givenTestContext();
    const event = givenOrderCreatedEvent();

    const result = await service.process(event);

    expect(result.created).toBe(true);
    expect(paymentsCreated).toEqual([
      expect.objectContaining({
        orderId: event.data.orderId,
        status: PaymentStatus.Succeeded,
        attemptCount: 1,
      }) as NewPayment,
    ]);
    expect(eventsAppended).toEqual([
      expect.objectContaining({
        eventType: 'payment.succeeded',
        version: 1,
        correlationId: event.correlationId,
        data: {
          orderId: event.data.orderId,
          paymentId: result.payment.id,
          courseId: event.data.courseId,
          amount: event.data.amount,
        },
      }) as PaymentSucceededEventV1,
    ]);
  });

  it('skips payment creation and outbox write when payment already exists', async () => {
    const existingPayment = givenPayment({
      orderId: randomUUID(),
      status: PaymentStatus.Succeeded,
      attemptCount: 1,
      providerReference: 'fake-provider-reference',
    });
    const { service, createPayment, appendOutboxEvent } =
      givenTestContext(existingPayment);
    const event = givenOrderCreatedEvent();

    const result = await service.process(event);

    expect(result).toEqual({
      payment: existingPayment,
      created: false,
    });
    expect(createPayment).not.toHaveBeenCalled();
    expect(appendOutboxEvent).not.toHaveBeenCalled();
  });
});
