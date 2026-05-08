import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EVENT_MESSAGE_PUBLISHER,
  type EventMessagePublisher,
} from './event-message-publisher';
import {
  OUTBOX_EVENT_REPOSITORY,
  type OutboxEventRepository,
} from './outbox-event-repository';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private readonly enabled: boolean;
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private isPublishing = false;
  private interval?: NodeJS.Timeout;

  constructor(
    @Inject(OUTBOX_EVENT_REPOSITORY)
    private readonly outbox: OutboxEventRepository,
    @Inject(EVENT_MESSAGE_PUBLISHER)
    private readonly publisher: EventMessagePublisher,
    config: ConfigService,
  ) {
    this.enabled = config.getOrThrow<boolean>(
      'rabbitmq.outboxPublisherEnabled',
    );
    this.batchSize = config.getOrThrow<number>('rabbitmq.outboxBatchSize');
    this.pollIntervalMs = config.getOrThrow<number>(
      'rabbitmq.outboxPollIntervalMs',
    );
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Outbox publisher is disabled');
      return;
    }

    this.interval = setInterval(() => {
      void this.publishOnce();
    }, this.pollIntervalMs);

    // allow process to exit if this is the only active timer (no hanging in tests, CLI, shutdown)
    this.interval.unref();

    void this.publishOnce();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async publishOnce(): Promise<void> {
    // prevent overlapping publish cycles
    if (this.isPublishing) {
      return;
    }

    this.isPublishing = true;

    try {
      const events = await this.outbox.findUnpublished(this.batchSize);

      // await Promise.all(events.map(...)) would be faster but less resilient - if one event fails to publish, the rest would be marked as failed and not retried until the next publish cycle
      for (const event of events) {
        try {
          await this.publisher.publish(event);
          await this.outbox.markPublished(event.id, new Date());
        } catch (error) {
          const publishError =
            error instanceof Error ? error : new Error(String(error));
          await this.outbox.markPublishFailed(event.id, publishError);
          this.logger.warn(
            `Failed to publish outbox event ${event.id}: ${publishError.message}`,
          );
        }
      }
    } finally {
      this.isPublishing = false;
    }
  }
}
