import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage, Options } from 'amqplib';
import type {
  PaymentFailedEventV1,
  PaymentSucceededEventV1,
} from '../../payments/contracts/events';
import {
  InvalidOrderStatusTransitionError,
  ProcessPaymentEventService,
  type OrderPaymentEventV1,
} from '../application/process-payment-event.service';

@Injectable()
export class AmqpPaymentEventsConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AmqpPaymentEventsConsumer.name);
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
    private readonly processPaymentEvent: ProcessPaymentEventService,
  ) {
    this.enabled = config.getOrThrow<boolean>('rabbitmq.consumersEnabled');
    this.exchange = config.getOrThrow<string>('rabbitmq.exchange');
    this.queue = config.getOrThrow<string>('rabbitmq.ordersPaymentEventsQueue');
    this.host = config.getOrThrow<string>('rabbitmq.host');
    this.port = config.getOrThrow<number>('rabbitmq.port');
    this.username = config.getOrThrow<string>('rabbitmq.username');
    this.password = config.getOrThrow<string>('rabbitmq.password');
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Order payment events consumer is disabled');
      return;
    }

    this.connection = await amqp.connect(this.connectionOptions());
    this.channel = await this.connection.createChannel();
    // make sure exchange exists
    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
    // make sure queue exists
    await this.channel.assertQueue(this.queue, {
      durable: true,
    });
    // route selected event types into the queue
    await this.channel.bindQueue(
      this.queue,
      this.exchange,
      'payment.succeeded',
    );
    await this.channel.bindQueue(this.queue, this.exchange, 'payment.failed');
    await this.channel.prefetch(1);
    // listen to messages from the queue
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
      const event = this.parsePaymentEvent(message);
      await this.processPaymentEvent.process(event);
      this.channel.ack(message);
    } catch (error) {
      const consumerError =
        error instanceof Error ? error : new Error(String(error));

      if (
        consumerError instanceof NonRetryableMessageError ||
        consumerError instanceof InvalidOrderStatusTransitionError
      ) {
        this.logger.warn(consumerError.message);
        this.channel.ack(message);
        return;
      }

      this.logger.warn(
        `Failed to consume payment event message: ${consumerError.message}`,
      );
      this.channel.nack(message, false, true);
    }
  }

  private parsePaymentEvent(message: ConsumeMessage): OrderPaymentEventV1 {
    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString()) as unknown;
    } catch {
      throw new NonRetryableMessageError('Invalid JSON in payment message');
    }

    if (!isOrderPaymentEventV1(parsed)) {
      throw new NonRetryableMessageError('Invalid payment message');
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

function isOrderPaymentEventV1(event: unknown): event is OrderPaymentEventV1 {
  if (!event || typeof event !== 'object') {
    return false;
  }

  const candidate = event as Partial<OrderPaymentEventV1>;

  if (
    candidate.version !== 1 ||
    typeof candidate.eventId !== 'string' ||
    typeof candidate.occurredAt !== 'string' ||
    typeof candidate.correlationId !== 'string' ||
    !candidate.data ||
    typeof candidate.data.orderId !== 'string' ||
    typeof candidate.data.paymentId !== 'string'
  ) {
    return false;
  }

  return isPaymentSucceededEvent(candidate) || isPaymentFailedEvent(candidate);
}

function isPaymentSucceededEvent(
  event: Partial<OrderPaymentEventV1>,
): event is PaymentSucceededEventV1 {
  return (
    event.eventType === 'payment.succeeded' &&
    typeof event.data?.amount === 'string'
  );
}

function isPaymentFailedEvent(
  event: Partial<OrderPaymentEventV1>,
): event is PaymentFailedEventV1 {
  return (
    event.eventType === 'payment.failed' &&
    typeof event.data?.reason === 'string'
  );
}
