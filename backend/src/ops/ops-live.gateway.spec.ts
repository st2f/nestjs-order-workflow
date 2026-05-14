import type { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { broadcastDebugStateUpdated } from '../shared/debug-state-updates';
import { OpsLiveGateway } from './ops-live.gateway';

describe('OpsLiveGateway', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disconnects clients without an auth token', async () => {
    const { gateway, jwt } = givenGateway();
    const { client, disconnect } = givenClient();

    await gateway.handleConnection(client);

    expect(jwt.verifyAsync).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledWith(true);

    gateway.onModuleDestroy();
  });

  it('disconnects clients without the admin role', async () => {
    const { gateway, jwt } = givenGateway();
    const { client, disconnect } = givenClient('token-1');
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      username: 'operator',
      roles: [],
    });

    await gateway.handleConnection(client);

    expect(jwt.verifyAsync).toHaveBeenCalledWith('token-1');
    expect(disconnect).toHaveBeenCalledWith(true);

    gateway.onModuleDestroy();
  });

  it('accepts admin JWT clients and broadcasts debug invalidation', async () => {
    const { gateway, jwt, emit } = givenGateway();
    const { client, disconnect } = givenClient('token-1');
    jwt.verifyAsync.mockResolvedValue({
      sub: 'seed-admin',
      username: 'admin',
      roles: ['admin'],
    });

    await gateway.handleConnection(client);
    broadcastDebugStateUpdated();

    expect(jwt.verifyAsync).toHaveBeenCalledWith('token-1');
    expect(disconnect).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('debug.state.updated');

    gateway.onModuleDestroy();
  });
});

function givenGateway() {
  const jwt = {
    verifyAsync: vi.fn(),
  } as unknown as JwtService & {
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  const emit = vi.fn();
  const server = { emit } as unknown as Server;
  const gateway = new OpsLiveGateway(jwt);
  gateway.server = server;

  return { emit, gateway, jwt };
}

function givenClient(token?: string) {
  const disconnect = vi.fn();
  const client = {
    handshake: { auth: token ? { token } : {} },
    disconnect,
  } as unknown as Socket;

  return { client, disconnect };
}
