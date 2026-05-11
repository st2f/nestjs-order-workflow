export type OpsOrderSummaryDto = {
  id: string;
  courseId: string;
  status: string;
};

export type TimelineEventDto = {
  id: string;
  orderId: string;
  type: string;
  status: string;
  createdAt: string;
  error?: string | null;
};

export type OutboxEventDto = {
  id: string;
  type: string;
  status: string;
  retryCount: number;
  lastError?: string | null;
  payload: unknown;
};

export type DebugStateDto = {
  orders: OpsOrderSummaryDto[];
  selectedOrderId?: string;
  timeline: TimelineEventDto[];
  outbox: OutboxEventDto[];
};
