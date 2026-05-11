import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage, Options } from 'amqplib';
import type { RefundRequestedEventV1 } from '../../orders/contracts/events';
import {
  InvalidPaymentRefundTransitionError,
  ProcessRefundRequestedService,
} from '../application/process-refund-requested.service';

@Injectable()
export class AmqpRefundRequestedConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AmqpRefundRequestedConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private readonly enabled: boolean;
  private readonly exchange: string;
  private readonly queue: string;
  private readonly host: string;
  private readonly port: number;
  private readonly username: string;
  private readonly password: string;

  constructor(
    config: ConfigService,
    private readonly processRefundRequested: ProcessRefundRequestedService,
  ) {
    this.enabled = config.getOrThrow<boolean>('rabbitmq.consumersEnabled');
    this.exchange = config.getOrThrow<string>('rabbitmq.exchange');
    this.queue = config.getOrThrow<string>(
      'rabbitmq.paymentsRefundRequestedQueue',
    );
    this.host = config.getOrThrow<string>('rabbitmq.host');
    this.port = config.getOrThrow<number>('rabbitmq.port');
    this.username = config.getOrThrow<string>('rabbitmq.username');
    this.password = config.getOrThrow<string>('rabbitmq.password');
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Payment refund.requested consumer is disabled');
      return;
    }

    this.connection = await amqp.connect(this.connectionOptions());
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
    await this.channel.assertQueue(this.queue, {
      durable: true,
    });
    await this.channel.bindQueue(this.queue, this.exchange, 'refund.requested');
    await this.channel.prefetch(1);
    await this.channel.consume(this.queue, (message) => {
      void this.handleMessage(message);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    try {
      const event = this.parseRefundRequestedEvent(message);
      await this.processRefundRequested.process(event);
      this.channel.ack(message);
    } catch (error) {
      const consumerError =
        error instanceof Error ? error : new Error(String(error));

      if (
        consumerError instanceof NonRetryableMessageError ||
        consumerError instanceof InvalidPaymentRefundTransitionError
      ) {
        this.logger.warn(consumerError.message);
        this.channel.ack(message);
        return;
      }

      this.logger.warn(
        `Failed to consume refund.requested message: ${consumerError.message}`,
      );
      this.channel.nack(message, false, true);
    }
  }

  private parseRefundRequestedEvent(
    message: ConsumeMessage,
  ): RefundRequestedEventV1 {
    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString()) as unknown;
    } catch {
      throw new NonRetryableMessageError(
        'Invalid JSON in refund.requested message',
      );
    }

    if (!isRefundRequestedEventV1(parsed)) {
      throw new NonRetryableMessageError('Invalid refund.requested message');
    }

    return parsed;
  }

  private connectionOptions(): Options.Connect {
    return {
      protocol: 'amqp',
      hostname: this.host,
      port: this.port,
      username: this.username,
      password: this.password,
    };
  }
}

class NonRetryableMessageError extends Error {}

function isRefundRequestedEventV1(
  event: unknown,
): event is RefundRequestedEventV1 {
  if (!event || typeof event !== 'object') {
    return false;
  }

  const candidate = event as Partial<RefundRequestedEventV1>;

  return (
    candidate.eventType === 'refund.requested' &&
    candidate.version === 1 &&
    typeof candidate.eventId === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.correlationId === 'string' &&
    !!candidate.data &&
    typeof candidate.data.orderId === 'string' &&
    (candidate.data.paymentId === undefined ||
      typeof candidate.data.paymentId === 'string') &&
    typeof candidate.data.reason === 'string'
  );
}
