import { request } from './apiClient';

export type OrderSummary = {
  id: string;
  courseId: string;
  status: string;
};

export type TimelineEvent = {
  id: string;
  orderId: string;
  type: string;
  status: string;
  createdAt: string;
  error?: string | null;
};

export type OutboxEvent = {
  id: string;
  type: string;
  status: string;
  retryCount: number;
  lastError?: string | null;
  payload: unknown;
};

export type DebugState = {
  orders: OrderSummary[];
  selectedOrderId?: string;
  timeline: TimelineEvent[];
  outbox: OutboxEvent[];
};

export const opsApi = {
  getDebugState: (accessToken: string) =>
    request<DebugState>('/ops/debug', { accessToken }),
  createOrderSuccess: (accessToken: string) =>
    request<OrderSummary>('/ops/scenarios/order-success', {
      accessToken,
      method: 'POST',
    }),
  createOrderPaymentFailure: (accessToken: string) =>
    request<OrderSummary>('/ops/scenarios/payment-failure', {
      accessToken,
      method: 'POST',
    }),
  createOrderEnrollmentFailure: (accessToken: string) =>
    request<OrderSummary>('/ops/scenarios/enrollment-failure', {
      accessToken,
      method: 'POST',
    }),
  republishOutboxEvent: (accessToken: string, id: string) =>
    request<OutboxEvent>(`/ops/outbox/${id}/republish`, {
      accessToken,
      method: 'POST',
    }),
};
