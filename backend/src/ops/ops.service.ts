import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import {
  EVENT_MESSAGE_PUBLISHER,
  type EventMessagePublisher,
} from '../events/application/event-message-publisher';
import { CreateOrderService } from '../orders/application/create-order.service';
import {
  ENROLLMENT_FAILURE_COURSE_ID,
  PAYMENT_FAILURE_COURSE_ID,
  SCENARIO_USER_ID,
  SUCCESS_COURSE_ID,
} from '../shared/scenario-course-ids';
import type {
  DebugStateDto,
  OpsOrderSummaryDto,
  OutboxEventDto,
  TimelineEventDto,
} from './ops.dto';

@Injectable()
export class OpsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly createOrderService: CreateOrderService,
    @Inject(EVENT_MESSAGE_PUBLISHER)
    private readonly publisher: EventMessagePublisher,
  ) {}

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

  async createOrderSuccess(): Promise<OpsOrderSummaryDto> {
    return this.createScenarioOrder(SUCCESS_COURSE_ID);
  }

  async createOrderPaymentFailure(): Promise<OpsOrderSummaryDto> {
    return this.createScenarioOrder(PAYMENT_FAILURE_COURSE_ID);
  }

  async createOrderEnrollmentFailure(): Promise<OpsOrderSummaryDto> {
    return this.createScenarioOrder(ENROLLMENT_FAILURE_COURSE_ID);
  }

  async republishOutboxEvent(id: string): Promise<OutboxEventDto> {
    const event = await this.findOutboxRow(id);

    if (!event) {
      throw new NotFoundException(`Outbox event ${id} was not found`);
    }

    await this.publisher.publish(
      event as Parameters<EventMessagePublisher['publish']>[0],
    );
    await this.dataSource.query(
      'UPDATE outbox_events SET published_at = $1, last_error = NULL WHERE id = $2',
      [new Date(), event.id],
    );

    const updated = await this.findOutboxRow(id);

    if (!updated) {
      throw new NotFoundException(`Outbox event ${id} was not found`);
    }

    return toOutboxEventDto(updated);
  }

  private async createScenarioOrder(
    courseId: string,
  ): Promise<OpsOrderSummaryDto> {
    const order = await this.createOrderService.create({
      userId: SCENARIO_USER_ID,
      courseId,
      amount: '49.99',
      correlationId: randomUUID(),
    });

    return toOrderSummaryDto(order);
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

  private async findOutboxRow(id: string): Promise<OutboxRow | undefined> {
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

type OrderRow = {
  id: string;
  courseId: string;
  status: string;
};

type OutboxRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  publishedAt: Date | null;
  retryCount: number;
  lastError: string | null;
};

function toOrderSummaryDto(order: OrderRow): OpsOrderSummaryDto {
  return {
    id: order.id,
    courseId: order.courseId,
    status: order.status,
  };
}

function toOutboxEventDto(event: OutboxRow): OutboxEventDto {
  return {
    id: event.id,
    type: event.type,
    status: statusForOutboxEvent(event),
    retryCount: event.retryCount,
    lastError: event.lastError,
    payload: event.payload,
  };
}

function toTimelineEventDto(event: OutboxRow): TimelineEventDto | undefined {
  const orderId = orderIdFromOutboxPayload(event.payload);

  if (!orderId) {
    return undefined;
  }

  return {
    id: event.id,
    orderId,
    type: event.type,
    status: statusForOutboxEvent(event),
    createdAt: event.occurredAt.toISOString(),
    error: event.lastError,
  };
}

function isTimelineEvent(
  event: TimelineEventDto | undefined,
): event is TimelineEventDto {
  return event !== undefined;
}

function statusForOutboxEvent(event: OutboxRow): string {
  if (event.lastError) {
    return 'FAILED';
  }

  return event.publishedAt ? 'PUBLISHED' : 'PENDING';
}

function orderIdFromOutboxPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const candidate = payload as { data?: { orderId?: unknown } };

  return typeof candidate.data?.orderId === 'string'
    ? candidate.data.orderId
    : undefined;
}
