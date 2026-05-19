import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './authApi';

describe('authApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts login credentials through /api', async () => {
    const credentials = {
      username: 'admin',
      password: 'test-password',
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'token-1',
          user: { id: 'seed-admin', username: 'admin', roles: ['admin'] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(authApi.login(credentials)).resolves.toEqual({
      accessToken: 'token-1',
      user: { id: 'seed-admin', username: 'admin', roles: ['admin'] },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      body: JSON.stringify(credentials),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  });
});
