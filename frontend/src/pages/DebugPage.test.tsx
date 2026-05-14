import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DebugPage } from './DebugPage';

type TestSocket = {
  handlers: Record<string, () => void>;
  on: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

const sockets: TestSocket[] = [];

vi.mock('../api/opsLive', async () => {
  const actual =
    await vi.importActual<typeof import('../api/opsLive')>('../api/opsLive');

  return {
    ...actual,
    createOpsLiveSocket: vi.fn((accessToken: string) => {
      const socket: TestSocket = {
        handlers: {},
        on: vi.fn((event: string, handler: () => void) => {
          socket.handlers[event] = handler;
          return socket;
        }),
        disconnect: vi.fn(),
      };
      sockets.push(socket);
      return socket;
    }),
  };
});

describe('DebugPage', () => {
  afterEach(() => {
    sockets.length = 0;
    vi.restoreAllMocks();
  });

  it('renders workflow controls and empty debug sections', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          orders: [],
          timeline: [],
          outbox: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(
      <DebugPage
        accessToken="token-1"
        userLabel="admin"
        onLogout={() => undefined}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /orderflow debug/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create success/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign out/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument();
  });

  it('refetches debug state when live invalidation arrives', async () => {
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

    render(
      <DebugPage
        accessToken="token-1"
        userLabel="admin"
        onLogout={() => undefined}
      />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [socket] = sockets;

    expect(socket.on).toHaveBeenCalledWith(
      'debug.state.updated',
      expect.any(Function),
    );

    act(() => {
      socket.handlers['debug.state.updated']();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
