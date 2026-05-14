import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  EVENT_MESSAGE_PUBLISHER,
  type EventMessagePublisher,
} from '../../events/application/event-message-publisher';
import type { OutboxRow } from '../ops-read-model';
import type { OutboxReplayPort } from '../ports/outbox-replay-port';

@Injectable()
export class PostgresOutboxReplayRepository implements OutboxReplayPort {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(EVENT_MESSAGE_PUBLISHER)
    private readonly publisher: EventMessagePublisher,
  ) {}

  async findOutboxRow(id: string): Promise<OutboxRow | undefined> {
    const rows = await this.dataSource.query<OutboxRow[]>(
      `
        SELECT
          id,
          type,
          payload,
          occurred_at AS "occurredAt",
          published_at AS "publishedAt",
          retry_count AS "retryCount",
          last_error AS "lastError"
        FROM outbox_events
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return rows[0];
  }

  publish(event: OutboxRow): Promise<void> {
    return this.publisher.publish(
      event as Parameters<EventMessagePublisher['publish']>[0],
    );
  }

  async markPublished(eventId: string, publishedAt: Date): Promise<void> {
    await this.dataSource.query(
      'UPDATE outbox_events SET published_at = $1, last_error = NULL WHERE id = $2',
      [publishedAt, eventId],
    );
  }
}
