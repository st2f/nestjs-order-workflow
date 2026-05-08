import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import type { EventMessagePublisher } from '../application/event-message-publisher';
import type { DomainEvent } from '../contracts/domain-event';
import { OutboxEvent } from '../entities/outbox-event.entity';

@Injectable()
export class AmqpEventMessagePublisher
  implements EventMessagePublisher, OnModuleDestroy
{
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private initializing?: Promise<void>;
  private readonly exchange: string;
  private readonly host: string;
  private readonly port: number;
  private readonly username: string;
  private readonly password: string;

  constructor(config: ConfigService) {
    this.exchange = config.getOrThrow<string>('rabbitmq.exchange');
    this.host = config.getOrThrow<string>('rabbitmq.host');
    this.port = config.getOrThrow<number>('rabbitmq.port');
    this.username = config.getOrThrow<string>('rabbitmq.username');
    this.password = config.getOrThrow<string>('rabbitmq.password');
  }

  async publish(event: OutboxEvent): Promise<void> {
    await this.ensureChannel();

    if (!this.channel) {
      throw new Error('RabbitMQ channel was not initialized');
    }

    const payload = event.payload as DomainEvent<
      string,
      number,
      Record<string, unknown>
    >;
    const content = Buffer.from(JSON.stringify(event.payload));

    this.channel.publish(this.exchange, event.type, content, {
      contentType: 'application/json',
      persistent: true,
      messageId:
        typeof payload.eventId === 'string' ? payload.eventId : event.id,
      timestamp: Math.floor(event.occurredAt.getTime() / 1000),
      type: event.type,
      headers: {
        correlationId: payload.correlationId,
        eventId: payload.eventId,
        eventType: event.type,
        outboxEventId: event.id,
      },
    });

    await this.channel.waitForConfirms();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async ensureChannel(): Promise<void> {
    if (this.channel) {
      return;
    }

    this.initializing ??= this.openChannel();

    try {
      await this.initializing;
    } finally {
      this.initializing = undefined;
    }
  }

  private async openChannel(): Promise<void> {
    this.connection = await amqp.connect({
      protocol: 'amqp',
      hostname: this.host,
      port: this.port,
      username: this.username,
      password: this.password,
    });

    this.connection.on('close', () => {
      this.channel = undefined;
      this.connection = undefined;
    });

    this.connection.on('error', () => {
      this.channel = undefined;
      this.connection = undefined;
    });

    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
  }
}
