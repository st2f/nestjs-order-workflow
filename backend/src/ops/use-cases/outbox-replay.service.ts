import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { broadcastDebugStateUpdated } from '../../shared/debug-state-updates';
import type { OutboxEventDto } from '../ops.dto';
import { toOutboxEventDto } from '../ops-read-model';
import {
  OUTBOX_REPLAY_PORT,
  type OutboxReplayPort,
} from '../ports/outbox-replay-port';

@Injectable()
export class OutboxReplayService {
  constructor(
    @Inject(OUTBOX_REPLAY_PORT)
    private readonly outboxReplay: OutboxReplayPort,
  ) {}

  async republishOutboxEvent(id: string): Promise<OutboxEventDto> {
    const event = await this.outboxReplay.findOutboxRow(id);

    if (!event) {
      throw new NotFoundException(`Outbox event ${id} was not found`);
    }

    await this.outboxReplay.publish(event);
    await this.outboxReplay.markPublished(event.id, new Date());
    broadcastDebugStateUpdated();

    const updated = await this.outboxReplay.findOutboxRow(id);

    if (!updated) {
      throw new NotFoundException(`Outbox event ${id} was not found`);
    }

    return toOutboxEventDto(updated);
  }
}
