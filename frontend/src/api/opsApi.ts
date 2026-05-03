export type OrderSummary = {
  id: string;
  courseId: string;
  status: string;
};

export type TimelineEvent = {
  id: string;
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

const API_BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export const opsApi = {
  getDebugState: () => request<DebugState>('/ops/debug'),
  createOrderSuccess: () =>
    request<OrderSummary>('/ops/scenarios/order-success', { method: 'POST' }),
  createOrderPaymentFailure: () =>
    request<OrderSummary>('/ops/scenarios/payment-failure', { method: 'POST' }),
  createOrderEnrollmentFailure: () =>
    request<OrderSummary>('/ops/scenarios/enrollment-failure', {
      method: 'POST',
    }),
  republishOutboxEvent: (id: string) =>
    request<OutboxEvent>(`/ops/outbox/${id}/republish`, { method: 'POST' }),
};
