import { OutboxEvent } from '../entities/outbox-event.entity';

export const EVENT_MESSAGE_PUBLISHER = Symbol('EVENT_MESSAGE_PUBLISHER');

export type EventMessagePublisher = {
  publish(event: OutboxEvent): Promise<void>;
};
