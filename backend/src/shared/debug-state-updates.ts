import { EventEmitter } from 'events';

export const DEBUG_STATE_UPDATED = 'debug.state.updated';

type DebugStateEvents = {
  [DEBUG_STATE_UPDATED]: [];
};

class DebugStateUpdateBus {
  private readonly emitter = new EventEmitter();

  on<K extends keyof DebugStateEvents>(
    event: K,
    listener: (...args: DebugStateEvents[K]) => void,
  ): void {
    this.emitter.on(event, listener);
  }

  off<K extends keyof DebugStateEvents>(
    event: K,
    listener: (...args: DebugStateEvents[K]) => void,
  ): void {
    this.emitter.off(event, listener);
  }

  emit<K extends keyof DebugStateEvents>(
    event: K,
    ...args: DebugStateEvents[K]
  ): void {
    this.emitter.emit(event, ...args);
  }
}

export const debugStateUpdates = new DebugStateUpdateBus();

export function broadcastDebugStateUpdated(): void {
  debugStateUpdates.emit(DEBUG_STATE_UPDATED);
}
