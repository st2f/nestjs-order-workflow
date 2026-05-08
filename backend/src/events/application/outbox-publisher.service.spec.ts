import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventMessagePublisher } from './event-message-publisher';
import { OutboxEventRepository } from './outbox-event-repository';
import { OutboxPublisherService } from './outbox-publisher.service';
import { OutboxEvent } from '../entities/outbox-event.entity';

function givenOutboxEvent(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
  return {
    id: 'outbox-event-id',
    type: 'order.created',
    payload: {
      eventId: 'domain-event-id',
      eventType: 'order.created',
      version: 1,
      occurredAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      correlationId: 'correlation-id',
      data: {
        orderId: 'order-id',
      },
    },
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    publishedAt: null,
    retryCount: 0,
    lastError: null,
    ...overrides,
  };
}

function givenConfig() {
  return {
    getOrThrow: (key: string) => {
      const values = {
        'rabbitmq.outboxPublisherEnabled': true,
        'rabbitmq.outboxBatchSize': 20,
        'rabbitmq.outboxPollIntervalMs': 1000,
      };

      return values[key as keyof typeof values];
    },
  } as ConfigService;
}

function givenTestContext(events: OutboxEvent[]) {
  const publishedEvents: OutboxEvent[] = [];
  const publishedMarks: Array<{ eventId: string; publishedAt: Date }> = [];
  const failedMarks: Array<{ eventId: string; error: Error }> = [];

  const outbox: OutboxEventRepository = {
    append: () => Promise.resolve(),
    findUnpublished: () => Promise.resolve(events),
    markPublished: (eventId, publishedAt) => {
      publishedMarks.push({ eventId, publishedAt });
      return Promise.resolve();
    },
    markPublishFailed: (eventId, error) => {
      failedMarks.push({ eventId, error });
      return Promise.resolve();
    },
  };

  const publisher: EventMessagePublisher = {
    publish: (event) => {
      publishedEvents.push(event);
      return Promise.resolve();
    },
  };

  return {
    service: new OutboxPublisherService(outbox, publisher, givenConfig()),
    publisher,
    publishedEvents,
    publishedMarks,
    failedMarks,
  };
}

describe('OutboxPublisherService', () => {
  beforeEach(() => {
    // silence logger about broker failures
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes unpublished outbox events and marks them published', async () => {
    const event = givenOutboxEvent();
    const { service, publishedEvents, publishedMarks, failedMarks } =
      givenTestContext([event]);

    await service.publishOnce();

    expect(publishedEvents).toEqual([event]);
    expect(publishedMarks).toEqual([
      {
        eventId: event.id,
        publishedAt: expect.any(Date) as Date,
      },
    ]);
    expect(failedMarks).toEqual([]);
  });

  it('records publish failures without marking the event published', async () => {
    const event = givenOutboxEvent();
    const { service, publisher, publishedMarks, failedMarks } =
      givenTestContext([event]);
    const error = new Error('broker unavailable');
    publisher.publish = () => Promise.reject(error);

    await service.publishOnce();

    expect(publishedMarks).toEqual([]);
    expect(failedMarks).toEqual([{ eventId: event.id, error }]);
  });
});
