import { io, type Socket } from 'socket.io-client';

export const DEBUG_STATE_UPDATED = 'debug.state.updated';

export function createOpsLiveSocket(accessToken: string): Socket {
  return io('/ops', {
    auth: { token: accessToken },
  });
}
