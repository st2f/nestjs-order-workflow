import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import './database/serialize-postgres-query-runner';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import rabbitmqConfig from './config/rabbitmq.config';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpsModule } from './ops/ops.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test' ? '.env.test' : ['.env', '../.env'],
      load: [appConfig, authConfig, databaseConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().port().default(3000),
        ADMIN_USERNAME: Joi.string().required(),
        ADMIN_PASSWORD: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default('1h'),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().required(),
        DB_USERNAME: Joi.string(),
        DB_PASSWORD: Joi.string(),
        DB_NAME: Joi.string(),
        POSTGRES_USER: Joi.string(),
        POSTGRES_PASSWORD: Joi.string(),
        POSTGRES_DB: Joi.string(),
        TYPEORM_SYNCHRONIZE: Joi.boolean().required(),
        TYPEORM_LOGGING: Joi.boolean().required(),
        RABBITMQ_HOST: Joi.string().required(),
        RABBITMQ_PORT: Joi.number().port().required(),
        RABBITMQ_USERNAME: Joi.string(),
        RABBITMQ_PASSWORD: Joi.string(),
        RABBITMQ_DEFAULT_USER: Joi.string(),
        RABBITMQ_DEFAULT_PASS: Joi.string(),
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
        RABBITMQ_ORDERS_LIFECYCLE_EVENTS_QUEUE: Joi.string().default(
          'orders.lifecycle-events.v1',
        ),
        RABBITMQ_ENROLLMENTS_PAYMENT_SUCCEEDED_QUEUE: Joi.string().default(
          'enrollments.payment-succeeded.v1',
        ),
        RABBITMQ_PAYMENTS_REFUND_REQUESTED_QUEUE: Joi.string().default(
          'payments.refund-requested.v1',
        ),
      })
        .or('DB_USERNAME', 'POSTGRES_USER')
        .or('DB_PASSWORD', 'POSTGRES_PASSWORD')
        .or('DB_NAME', 'POSTGRES_DB')
        .or('RABBITMQ_USERNAME', 'RABBITMQ_DEFAULT_USER')
        .or('RABBITMQ_PASSWORD', 'RABBITMQ_DEFAULT_PASS'),
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
    AuthModule,
    OpsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
