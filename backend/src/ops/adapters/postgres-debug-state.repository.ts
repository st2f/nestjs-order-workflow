import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { DebugStateDto } from '../ops.dto';
import {
  isTimelineEvent,
  type OrderRow,
  type OutboxRow,
  toOrderSummaryDto,
  toOutboxEventDto,
  toTimelineEventDto,
} from '../ops-read-model';
import type { DebugStateReader } from '../ports/debug-state-reader';

@Injectable()
export class PostgresDebugStateRepository implements DebugStateReader {
  constructor(private readonly dataSource: DataSource) {}

  async getDebugState(): Promise<DebugStateDto> {
    const orders = await this.findRecentOrders(10);
    const orderIds = orders.map((order) => order.id);
    const outboxRows = await this.findRecentOutboxRows(10);
    const timelineRows =
      orderIds.length > 0 ? await this.findTimelineRows(orderIds) : [];

    return {
      orders: orders.map(toOrderSummaryDto),
      selectedOrderId: orders[0]?.id,
      timeline: timelineRows.map(toTimelineEventDto).filter(isTimelineEvent),
      outbox: outboxRows.map(toOutboxEventDto),
    };
  }

  private findRecentOrders(limit: number): Promise<OrderRow[]> {
    return this.dataSource.query<OrderRow[]>(
      `
        SELECT id, course_id AS "courseId", status
        FROM orders
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit],
    );
  }

  private findRecentOutboxRows(limit: number): Promise<OutboxRow[]> {
    return this.dataSource.query<OutboxRow[]>(
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
        ORDER BY occurred_at DESC
        LIMIT $1
      `,
      [limit],
    );
  }

  private findTimelineRows(orderIds: string[]): Promise<OutboxRow[]> {
    return this.dataSource.query<OutboxRow[]>(
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
        WHERE payload #>> '{data,orderId}' = ANY($1)
        ORDER BY occurred_at ASC
        LIMIT 100
      `,
      [orderIds],
    );
  }
}
