import type { DebugStateDto } from '../ops.dto';

export const DEBUG_STATE_READER = Symbol('DEBUG_STATE_READER');

export interface DebugStateReader {
  getDebugState(): Promise<DebugStateDto>;
}
