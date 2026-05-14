import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/auth.types';
import {
  DEBUG_STATE_UPDATED,
  debugStateUpdates,
} from '../shared/debug-state-updates';

@Injectable()
@WebSocketGateway({
  namespace: 'ops',
  cors: { origin: true },
})
export class OpsLiveGateway implements OnGatewayConnection, OnModuleDestroy {
  private readonly logger = new Logger(OpsLiveGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {
    debugStateUpdates.on(DEBUG_STATE_UPDATED, this.broadcastDebugStateUpdated);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = authTokenFromClient(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);

      if (!payload.roles.includes('admin')) {
        client.disconnect(true);
        return;
      }

      this.logger.debug(
        `Accepted live debug connection for ${payload.username}`,
      );
    } catch {
      client.disconnect(true);
    }
  }

  onModuleDestroy(): void {
    debugStateUpdates.off(DEBUG_STATE_UPDATED, this.broadcastDebugStateUpdated);
  }

  broadcastDebugStateUpdated = (): void => {
    this.server.emit(DEBUG_STATE_UPDATED);
  };
}

function authTokenFromClient(client: Socket): string | undefined {
  const auth = client.handshake.auth as unknown;

  if (!auth || typeof auth !== 'object') {
    return undefined;
  }

  const token = (auth as { token?: unknown }).token;

  return typeof token === 'string' ? token : undefined;
}
