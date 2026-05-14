import type { OutboxRow } from '../ops-read-model';

export const OUTBOX_REPLAY_PORT = Symbol('OUTBOX_REPLAY_PORT');

export interface OutboxReplayPort {
  findOutboxRow(id: string): Promise<OutboxRow | undefined>;
  publish(event: OutboxRow): Promise<void>;
  markPublished(eventId: string, publishedAt: Date): Promise<void>;
}
