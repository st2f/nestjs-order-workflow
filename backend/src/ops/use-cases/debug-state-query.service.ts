import { Inject, Injectable } from '@nestjs/common';
import type { DebugStateDto } from '../ops.dto';
import {
  DEBUG_STATE_READER,
  type DebugStateReader,
} from '../ports/debug-state-reader';

@Injectable()
export class DebugStateQueryService {
  constructor(
    @Inject(DEBUG_STATE_READER)
    private readonly debugState: DebugStateReader,
  ) {}

  async getDebugState(): Promise<DebugStateDto> {
    return this.debugState.getDebugState();
  }
}
