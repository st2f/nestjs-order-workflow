import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import './database/serialize-postgres-query-runner';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import rabbitmqConfig from './config/rabbitmq.config';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      load: [appConfig, databaseConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().port().default(3000),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        TYPEORM_SYNCHRONIZE: Joi.boolean().required(),
        TYPEORM_LOGGING: Joi.boolean().required(),
        RABBITMQ_HOST: Joi.string().required(),
        RABBITMQ_PORT: Joi.number().port().required(),
        RABBITMQ_USERNAME: Joi.string().required(),
        RABBITMQ_PASSWORD: Joi.string().required(),
        RABBITMQ_MANAGEMENT_URL: Joi.string().uri().required(),
        RABBITMQ_EXCHANGE: Joi.string().default('orderflow.events'),
        OUTBOX_PUBLISHER_ENABLED: Joi.boolean().default(
          process.env.NODE_ENV !== 'test',
        ),
        OUTBOX_PUBLISHER_POLL_INTERVAL_MS: Joi.number()
          .integer()
          .min(100)
          .default(1000),
        OUTBOX_PUBLISHER_BATCH_SIZE: Joi.number().integer().min(1).default(20),
        RABBITMQ_CONSUMERS_ENABLED: Joi.boolean().default(
          process.env.NODE_ENV !== 'test',
        ),
        RABBITMQ_PAYMENTS_ORDER_CREATED_QUEUE: Joi.string().default(
          'payments.order-created.v1',
        ),
        RABBITMQ_ORDERS_PAYMENT_EVENTS_QUEUE: Joi.string().default(
          'orders.payment-events.v1',
        ),
        RABBITMQ_ENROLLMENTS_PAYMENT_SUCCEEDED_QUEUE: Joi.string().default(
          'enrollments.payment-succeeded.v1',
        ),
      }),
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('database.host'),
        port: config.getOrThrow<number>('database.port'),
        username: config.getOrThrow<string>('database.username'),
        password: config.getOrThrow<string>('database.password'),
        database: config.getOrThrow<string>('database.name'),
        autoLoadEntities: true,
        synchronize: config.getOrThrow<boolean>('database.synchronize'),
        logging: config.getOrThrow<boolean>('database.logging'),
      }),
    }),
    OrdersModule,
    PaymentsModule,
    EnrollmentsModule,
    EventsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
