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
  EnrollmentFailedEventV1,
  EnrollmentGrantedEventV1,
} from '../../enrollments/contracts/events';
import type { RefundSucceededEventV1 } from '../../payments/contracts/events';
import {
  InvalidOrderLifecycleTransitionError,
  ProcessOrderLifecycleEventService,
  type OrderLifecycleEventV1,
} from '../application/process-order-lifecycle-event.service';

@Injectable()
export class AmqpOrderLifecycleEventsConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AmqpOrderLifecycleEventsConsumer.name);
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
    private readonly processOrderLifecycleEvent: ProcessOrderLifecycleEventService,
  ) {
    this.enabled = config.getOrThrow<boolean>('rabbitmq.consumersEnabled');
    this.exchange = config.getOrThrow<string>('rabbitmq.exchange');
    this.queue = config.getOrThrow<string>(
      'rabbitmq.ordersLifecycleEventsQueue',
    );
    this.host = config.getOrThrow<string>('rabbitmq.host');
    this.port = config.getOrThrow<number>('rabbitmq.port');
    this.username = config.getOrThrow<string>('rabbitmq.username');
    this.password = config.getOrThrow<string>('rabbitmq.password');
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Order lifecycle events consumer is disabled');
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
    await this.channel.bindQueue(
      this.queue,
      this.exchange,
      'enrollment.granted',
    );
    await this.channel.bindQueue(
      this.queue,
      this.exchange,
      'enrollment.failed',
    );
    await this.channel.bindQueue(this.queue, this.exchange, 'refund.succeeded');
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
      const event = this.parseOrderLifecycleEvent(message);
      await this.processOrderLifecycleEvent.process(event);
      this.channel.ack(message);
    } catch (error) {
      const consumerError =
        error instanceof Error ? error : new Error(String(error));

      if (
        consumerError instanceof NonRetryableMessageError ||
        consumerError instanceof InvalidOrderLifecycleTransitionError
      ) {
        this.logger.warn(consumerError.message);
        this.channel.ack(message);
        return;
      }

      this.logger.warn(
        `Failed to consume order lifecycle event message: ${consumerError.message}`,
      );
      this.channel.nack(message, false, true);
    }
  }

  private parseOrderLifecycleEvent(
    message: ConsumeMessage,
  ): OrderLifecycleEventV1 {
    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString()) as unknown;
    } catch {
      throw new NonRetryableMessageError(
        'Invalid JSON in order lifecycle message',
      );
    }

    if (!isOrderLifecycleEventV1(parsed)) {
      throw new NonRetryableMessageError('Invalid order lifecycle message');
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

function isOrderLifecycleEventV1(
  event: unknown,
): event is OrderLifecycleEventV1 {
  if (!event || typeof event !== 'object') {
    return false;
  }

  const candidate = event as Partial<OrderLifecycleEventV1>;

  if (
    candidate.version !== 1 ||
    typeof candidate.eventId !== 'string' ||
    typeof candidate.occurredAt !== 'string' ||
    typeof candidate.correlationId !== 'string' ||
    !candidate.data ||
    typeof candidate.data.orderId !== 'string'
  ) {
    return false;
  }

  return (
    isEnrollmentGrantedEvent(candidate) ||
    isEnrollmentFailedEvent(candidate) ||
    isRefundSucceededEvent(candidate)
  );
}

function isEnrollmentGrantedEvent(
  event: Partial<OrderLifecycleEventV1>,
): event is EnrollmentGrantedEventV1 {
  return (
    event.eventType === 'enrollment.granted' &&
    typeof event.data?.courseId === 'string' &&
    typeof event.data?.enrollmentId === 'string'
  );
}

function isEnrollmentFailedEvent(
  event: Partial<OrderLifecycleEventV1>,
): event is EnrollmentFailedEventV1 {
  return (
    event.eventType === 'enrollment.failed' &&
    typeof event.data?.courseId === 'string' &&
    typeof event.data?.reason === 'string'
  );
}

function isRefundSucceededEvent(
  event: Partial<OrderLifecycleEventV1>,
): event is RefundSucceededEventV1 {
  return (
    event.eventType === 'refund.succeeded' &&
    typeof event.data?.paymentId === 'string'
  );
}
