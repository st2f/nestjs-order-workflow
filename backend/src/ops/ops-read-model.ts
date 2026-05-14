import type {
  OpsOrderSummaryDto,
  OutboxEventDto,
  TimelineEventDto,
} from './ops.dto';

export type OrderRow = {
  id: string;
  courseId: string;
  status: string;
};

export type OutboxRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  publishedAt: Date | null;
  retryCount: number;
  lastError: string | null;
};

export function toOrderSummaryDto(order: OrderRow): OpsOrderSummaryDto {
  return {
    id: order.id,
    courseId: order.courseId,
    status: order.status,
  };
}

export function toOutboxEventDto(event: OutboxRow): OutboxEventDto {
  return {
    id: event.id,
    type: event.type,
    status: statusForOutboxEvent(event),
    retryCount: event.retryCount,
    lastError: event.lastError,
    payload: event.payload,
  };
}

export function toTimelineEventDto(
  event: OutboxRow,
): TimelineEventDto | undefined {
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

export function isTimelineEvent(
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
