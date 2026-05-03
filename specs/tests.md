# Adding tests and UI during implementation

## Step 1 — Entities/schema foundation

Goal: prove the app boots and tables are valid.

Keep it simple:

- test/app.e2e-spec.ts

Tests:

```ts
it('starts the Nest app with TypeORM/Postgres');
it('GET / returns backend status');
it('can insert and read an Order');
it('can insert and read a Payment with orderId');
it('can insert and read an OutboxEvent');
it('can enforce enum/status values');
```

Important: this is not business testing yet. It is “schema smoke testing”.

Add a small test helper:

```ts
async function clearDatabase(dataSource: DataSource) {
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
```

## Step 2 — Create order use case

Add:

- src/orders/application/create-order.service.ts
- src/orders/orders.controller.ts

Unit tests:

```ts
describe('CreateOrderService', () => {
  it('creates an order with PENDING status');
  it('writes an order.created outbox event');
  it('writes order + outbox event in the same transaction');
});
```

E2E test:

- POST /orders
- GET /orders/:id

Expected behavior:

```txt
POST /orders
=> creates order
=> status: PENDING
=> outbox has order.created
```

This is probably the first “real” wiring test. It connects entities, service, repository, events, and future RabbitMQ wiring without needing RabbitMQ yet.

# Step 3 — Outbox publisher

Add tests around:

- src/events/application/publish-outbox.service.ts

Tests:

```ts
it('publishes pending outbox events');
it('marks published events as published');
it('does not publish already published events');
it('leaves failed events pending or increments retry count');
```

Fake RabbitMQ in unit tests. Use real Postgres in integration/e2e tests.

# Step 4 — Payment consumer

When order.created is consumed:

```txt
order.created
=> create payment
=> emit payment.succeeded or payment.failed
```

Tests:

```ts
it('creates a payment when order.created is received');
it('emits payment.succeeded after fake successful payment');
it('does not process the same event twice');
it('records processed_events');
```

This is where processed_events becomes useful.

## Step 5 — Order reacts to payment

Tests:

```ts
it('moves order from PENDING to PAID on payment.succeeded');
it('moves order to PAYMENT_FAILED on payment.failed');
it('rejects invalid state transitions');
it('ignores duplicate payment.succeeded event');
```

I would make the state transition a small pure function:

`transitionOrderStatus(current, event)`

Then unit-test it heavily. That makes the workflow easier to understand than reading controllers/consumers.

## Step 6 — Enrollment consumer

Tests:

```ts
it('creates enrollment after payment.succeeded');
it('emits enrollment.granted on success');
it('emits enrollment.failed on simulated failure');
it('does not duplicate enrollment for same event');
```

Then order tests:

```ts
it('moves order to COMPLETED on enrollment.granted');
it(
  'moves order to REFUND_IN_PROGRESS on enrollment.failed after payment succeeded',
);
```

## Step 7 — Refund / compensation

Tests:

```ts
it('emits refund.requested when enrollment fails after payment success');
it('payment module creates refund on refund.requested');
it('order moves to REFUNDED on refund.succeeded');
```

This is the most valuable part because it shows async failure handling.

## Step 8 — Ops/debug endpoints

These are very useful for learning and demo.

Endpoints:

```txt
GET /ops/orders/:id/timeline
GET /ops/outbox
GET /ops/processed-events
POST /ops/failures/payment
POST /ops/failures/enrollment
POST /ops/tick/outbox
```

Tests:

```ts
it('returns order timeline');
it('can simulate enrollment failure');
it('can trigger one outbox publishing tick');
```
