import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('requires login before rendering the debug route', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /orderflow debug/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /create success/i }),
    ).not.toBeInTheDocument();
  });

  it('logs in and renders the protected debug route', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        if (input === '/api/auth/login') {
          return new Response(
            JSON.stringify({
              accessToken: 'token-1',
              user: { id: 'seed-admin', username: 'admin', roles: ['admin'] },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            orders: [],
            timeline: [],
            outbox: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

    render(<App />);

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'orderflow-admin' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByRole('button', { name: /create success/i }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('orderflow.admin.session')).toContain(
      'token-1',
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/ops/debug', {
        headers: {
          Authorization: 'Bearer token-1',
        },
      });
    });
  });
});
