import { afterEach, describe, expect, it, vi } from 'vitest';
import { opsApi } from './opsApi';

describe('opsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the backend through the frontend /api boundary', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          orders: [],
          timeline: [],
          outbox: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(opsApi.getDebugState()).resolves.toEqual({
      orders: [],
      timeline: [],
      outbox: [],
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/ops/debug', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('posts scenario commands through /api', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'order-1',
          courseId: 'course-1',
          status: 'PENDING',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await opsApi.createOrderSuccess();

    expect(fetchMock).toHaveBeenCalledWith('/api/ops/scenarios/order-success', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  });
});
