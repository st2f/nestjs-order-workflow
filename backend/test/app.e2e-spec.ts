import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { config as loadEnvFile } from 'dotenv';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { OutboxEvent } from './../src/events/entities/outbox-event.entity';
import { Order } from './../src/orders/entities/order.entity';
import { OrderStatus } from './../src/orders/order-status.enum';
import { Payment } from './../src/payments/entities/payment.entity';
import { PaymentStatus } from './../src/payments/payment-status.enum';

type CreateOrderResponseBody = {
  id: string;
  userId: string;
  courseId: string;
  amount: string;
  status: OrderStatus;
};

describe('Backend smoke tests (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  jest.setTimeout(15000);

  beforeAll(async () => {
    await ensureTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  it('starts the Nest app with TypeORM/Postgres', () => {
    expect(app).toBeDefined();
    expect(dataSource.isInitialized).toBe(true);
  });

  it('GET / returns backend status', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('OrderFlow backend is running');
  });

  it('can insert and read an Order', async () => {
    const orders = dataSource.getRepository(Order);
    const order = await orders.save(
      orders.create({
        userId: randomUUID(),
        courseId: randomUUID(),
        amount: '49.99',
        status: OrderStatus.Pending,
      }),
    );

    const persisted = await orders.findOneByOrFail({ id: order.id });

    expect(persisted.userId).toBe(order.userId);
    expect(persisted.courseId).toBe(order.courseId);
    expect(persisted.amount).toBe('49.99');
    expect(persisted.status).toBe(OrderStatus.Pending);
    expect(persisted.createdAt).toBeInstanceOf(Date);
    expect(persisted.updatedAt).toBeInstanceOf(Date);
  });

  it('can insert and read a Payment with orderId', async () => {
    const orders = dataSource.getRepository(Order);
    const payments = dataSource.getRepository(Payment);
    const order = await orders.save(
      orders.create({
        userId: randomUUID(),
        courseId: randomUUID(),
        amount: '49.99',
      }),
    );

    const payment = await payments.save(
      payments.create({
        orderId: order.id,
        status: PaymentStatus.Pending,
        attemptCount: 1,
        providerReference: 'fake-provider-reference',
      }),
    );

    const persisted = await payments.findOneByOrFail({ id: payment.id });

    expect(persisted.orderId).toBe(order.id);
    expect(persisted.status).toBe(PaymentStatus.Pending);
    expect(persisted.attemptCount).toBe(1);
    expect(persisted.providerReference).toBe('fake-provider-reference');
  });

  it('can insert and read an OutboxEvent', async () => {
    const outboxEvents = dataSource.getRepository(OutboxEvent);
    const event = await outboxEvents.save(
      outboxEvents.create({
        type: 'order.created',
        payload: {
          orderId: randomUUID(),
          courseId: randomUUID(),
        },
      }),
    );

    const persisted = await outboxEvents.findOneByOrFail({ id: event.id });

    expect(persisted.type).toBe('order.created');
    expect(persisted.payload).toEqual(event.payload);
    expect(persisted.occurredAt).toBeInstanceOf(Date);
    expect(persisted.publishedAt).toBeNull();
    expect(persisted.retryCount).toBe(0);
    expect(persisted.lastError).toBeNull();
  });

  it('can enforce enum/status values', async () => {
    await expect(
      dataSource.query(
        `
          INSERT INTO orders (user_id, course_id, amount, status)
          VALUES ($1, $2, $3, $4)
        `,
        [randomUUID(), randomUUID(), '49.99', 'NOT_A_STATUS'],
      ),
    ).rejects.toThrow();
  });

  it('POST /orders creates order + outbox event', async () => {
    const userId = randomUUID();
    const courseId = randomUUID();
    const correlationId = randomUUID();

    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('x-correlation-id', correlationId)
      .send({ userId, courseId, amount: '49.99' })
      .expect(201);
    const body = response.body as CreateOrderResponseBody;

    expect(typeof body.id).toBe('string');
    expect(body.userId).toBe(userId);
    expect(body.courseId).toBe(courseId);
    expect(body.amount).toBe('49.99');
    expect(body.status).toBe(OrderStatus.Pending);

    const order = await dataSource
      .getRepository(Order)
      .findOneByOrFail({ id: body.id });
    const outboxEvent = await dataSource
      .getRepository(OutboxEvent)
      .findOneByOrFail({ type: 'order.created' });

    expect(order.status).toBe(OrderStatus.Pending);
    expect(outboxEvent.publishedAt).toBeNull();
    expect(outboxEvent.payload).toMatchObject({
      eventType: 'order.created',
      version: 1,
      correlationId,
      data: {
        orderId: order.id,
        userId,
        courseId,
        amount: '49.99',
      },
    });
  });

  afterAll(async () => {
    await app?.close();
  });
});

async function ensureTestDatabase() {
  loadEnvFile({
    path: '.env.test',
    quiet: true,
  });

  const database = process.env.DB_NAME;

  if (!database || !isSafeTestDatabaseName(database)) {
    throw new Error(
      `Refusing to run e2e tests against unsafe database name: ${database}`,
    );
  }

  const maintenanceDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: database,
  });

  await maintenanceDataSource.initialize();

  try {
    const existing = await maintenanceDataSource.query<Array<unknown>>(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );

    if (existing.length === 0) {
      await maintenanceDataSource.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await maintenanceDataSource.destroy();
  }
}

async function clearDatabase(dataSource: DataSource) {
  const database = dataSource.options.database;

  if (typeof database !== 'string' || !isSafeTestDatabaseName(database)) {
    throw new Error(`Refusing to clear non-test database: ${String(database)}`);
  }

  await dataSource.query(`
    TRUNCATE
      notifications,
      processed_events,
      outbox_events,
      enrollments,
      payments,
      orders
    RESTART IDENTITY CASCADE
  `);
}

function isSafeTestDatabaseName(database: string) {
  return /^[a-zA-Z0-9_]+$/.test(database) && database.includes('test');
}
