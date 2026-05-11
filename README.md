[![CI](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml)

# OrderFlow

OrderFlow is a small learning project for building an event-driven purchase
workflow with NestJS, Postgres, and RabbitMQ.

It models a course purchase from order creation through asynchronous payment
processing, using a transactional outbox so database changes and published
events stay reliable. The goal is not to build a production shop, but to make
the moving parts of event-driven systems visible and testable.

You can use this repo to explore:

- creating an order through an HTTP API
- storing domain events in an outbox table
- publishing events to RabbitMQ
- consuming events in another module
- updating order state from asynchronous payment results
- handling duplicate messages safely with processed-event tracking

<img width="1200" height="721" alt="image" src="https://github.com/user-attachments/assets/88ee3562-9aa4-4308-9187-f9db5479dd91" />

## Repository layout

- `backend/` contains the NestJS API, domain modules, RabbitMQ consumers, and
  outbox publisher.
- `frontend/` contains the minimal React debug UI.
- [`specs/project.md`](specs/project.md) contains the full project
  specifications, architecture notes, and implementation order.

## Quick start

```bash
docker compose up -d postgres rabbitmq

cd backend
cp .env.example .env
npm install
npm run start:dev
```

The backend starts at `http://localhost:3000`.

Create an order:

```bash
curl -X POST http://localhost:3000/orders \
  -H 'content-type: application/json' \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "courseId": "00000000-0000-0000-0000-000000000002",
    "amount": "49.99"
  }'
```

## Backend setup

Install dependencies:

```bash
cd backend
npm install
```

Create a local environment file:

```bash
cd backend
cp .env.example .env
```

The backend uses `backend/.env` for local development. The `test:e2e` script
sets `NODE_ENV=test` and loads `backend/.env.test`, which points at the
separate `orderflow_test` database.

Start local infrastructure:

```bash
docker compose up -d postgres rabbitmq
```

Start the backend in watch mode:

```bash
cd backend
npm run start:dev
```

With `TYPEORM_SYNCHRONIZE=true` in `.env`, TypeORM automatically creates tables from entities at startup (development only).

RabbitMQ is available at:

- AMQP: `localhost:5672`
- Management UI: `http://localhost:15672`
- Username: `orderflow`
- Password: `orderflow`

The backend listens on `http://localhost:3000` by default.

## Frontend setup

Install dependencies:

```bash
cd frontend
npm install
```

Start the frontend in watch mode:

```bash
cd frontend
npm run dev
```

The frontend listens on `http://localhost:5173` by default. Vite proxies `/api`
requests to the backend at `http://localhost:3000`, so keep the backend running
when testing UI calls.

## Verification

Run the current checks:

```bash
cd backend
npm run build
npm run lint
npm run test

cd ../frontend
npm run build
npm run test
```

The e2e test imports the full Nest application and therefore expects the local
database settings to be available. Start Postgres first if you run:

```bash
cd backend
npm run test:e2e
```

The e2e suite uses a separate Postgres database named `orderflow_test` by
default. It creates that database when needed, then truncates only test-looking
database names before each test. This keeps local development data in
`orderflow` away from the e2e cleanup step.

## Current progress

### Step 1 — Entities and schema foundation

Implemented so far:

- TypeORM and Postgres wiring in the Nest app module.
- Domain module shells for `orders`, `payments`, `enrollments`, `events`, and
  `notifications`.
- TypeORM entities for the core tables:
  - `orders`
  - `payments`
  - `enrollments`
  - `outbox_events`
  - `processed_events`
  - `notifications`
- Enums for order, payment, enrollment, and notification statuses/types.
- A local `docker-compose.yml` with Postgres and RabbitMQ services.
- `backend/.env.example` with the database settings used by the local compose stack.
- A simple root endpoint returning backend status text.

### Step 2 — Order creation + outbox write

Implemented so far:

- `POST /orders` endpoint.
- `CreateOrderService` application use case.
- `OrderRepository` port with a TypeORM implementation.
- Transaction runner abstraction backed by TypeORM transactions.
- Outbox event repository abstraction backed by the `outbox_events` table.
- Order creation with initial `PENDING` status.
- Transactional `order.created` outbox write in the same database transaction as
  the order row.
- Unit tests for the create-order use case.
- E2E coverage proving `POST /orders` creates both the order and the outbox
  event.

### Step 3 — Outbox publisher

Implemented so far:

- Polling outbox publisher registered in the backend process.
- RabbitMQ publishing through a durable topic exchange named
  `orderflow.events` by default.
- Event routing keys match `outbox_events.type`, for example `order.created`.
- Successful publishes set `outbox_events.published_at`.
- Failed publishes keep the row unpublished, increment `retry_count`, and store
  `last_error` for later retry/inspection.
- Publisher configuration through `.env`:
  - `RABBITMQ_EXCHANGE`
  - `OUTBOX_PUBLISHER_ENABLED`
  - `OUTBOX_PUBLISHER_POLL_INTERVAL_MS`
  - `OUTBOX_PUBLISHER_BATCH_SIZE`
- Unit tests for successful publish and failed publish handling.

### Step 4 — Payment consumer

Implemented so far:

- RabbitMQ `order.created` consumer registered in the backend process.
- Durable queue named `payments.order-created.v1` by default.
- Queue binding from `payments.order-created.v1` to the `orderflow.events`
  topic exchange with routing key `order.created`.
- `ProcessOrderCreatedService` application use case.
- `PaymentRepository` port with a TypeORM implementation.
- Fake payment provider behavior that succeeds by default.
- Payment creation with `SUCCEEDED` status and one attempt.
- Transactional `payment.succeeded` outbox write in the same database
  transaction as the payment row.
- Duplicate `order.created` handling at the payment table boundary: if a
  payment already exists for the order, no second payment or event is created.
- Consumer configuration through `.env`:
  - `RABBITMQ_CONSUMERS_ENABLED`
  - `RABBITMQ_PAYMENTS_ORDER_CREATED_QUEUE`
- Unit tests for the payment use case.

### Step 5 — Order status updates from payment events

Implemented so far:

- RabbitMQ payment-events consumer registered in the Orders module.
- Durable queue named `orders.payment-events.v1` by default.
- Queue bindings from `orders.payment-events.v1` to the `orderflow.events`
  topic exchange with routing keys:
  - `payment.succeeded`
  - `payment.failed`
- `ProcessPaymentEventService` application use case.
- Order repository support for finding an order and updating its status.
- `payment.succeeded` updates a `PENDING` order to `PAID`.
- `payment.failed` updates a `PENDING` order to `PAYMENT_FAILED`.
- Explicit transition validation: invalid order status transitions are rejected.
- Processed-event idempotency guard backed by the `processed_events` table.
- Duplicate payment events are skipped for the stable consumer name
  `orders.payment-events.v1`.
- Consumer configuration through `.env`:
  - `RABBITMQ_ORDERS_PAYMENT_EVENTS_QUEUE`
- Unit tests for paid, payment-failed, duplicate-event, and invalid-transition
  behavior.

### Step 6 — Enrollment consumer

Implemented so far:

- RabbitMQ `payment.succeeded` consumer registered in the Enrollments module.
- Durable queue named `enrollments.payment-succeeded.v1` by default.
- Queue binding from `enrollments.payment-succeeded.v1` to the
  `orderflow.events` topic exchange with routing key `payment.succeeded`.
- `ProcessPaymentSucceededService` application use case.
- `EnrollmentRepository` port with a TypeORM implementation.
- `payment.succeeded` now carries `courseId` so enrollment can grant access
  without reading Orders internals.
- Enrollment creation with `GRANTED` status.
- Transactional `enrollment.granted` outbox write in the same database
  transaction as the enrollment row.
- Processed-event idempotency guard backed by the `processed_events` table.
- Duplicate payment events are skipped for the stable consumer name
  `enrollments.payment-succeeded.v1`.
- Duplicate enrollment creation is also guarded at the enrollment table
  boundary: if an enrollment already exists for the order, no second enrollment
  or event is created.
- Consumer configuration through `.env`:
  - `RABBITMQ_ENROLLMENTS_PAYMENT_SUCCEEDED_QUEUE`
- Unit tests for enrollment creation, duplicate-event handling, and existing
  enrollment handling.

### Step 7 — Compensation flow

Implemented so far:

- RabbitMQ order lifecycle consumer registered in the Orders module.
- Durable queue named `orders.lifecycle-events.v1` by default.
- Queue bindings from `orders.lifecycle-events.v1` to the `orderflow.events`
  topic exchange with routing keys:
  - `enrollment.granted`
  - `enrollment.failed`
  - `refund.succeeded`
- `ProcessOrderLifecycleEventService` application use case.
- `enrollment.granted` updates a `PAID` order to `COMPLETED`.
- `enrollment.failed` updates a `PAID` order to `REFUND_IN_PROGRESS` and writes
  `refund.requested` to the outbox in the same transaction.
- Duplicate or repeated `enrollment.failed` events do not write another
  `refund.requested` once the order is already `REFUND_IN_PROGRESS`.
- `refund.succeeded` updates a `REFUND_IN_PROGRESS` order to `REFUNDED`.
- RabbitMQ `refund.requested` consumer registered in the Payments module.
- Durable queue named `payments.refund-requested.v1` by default.
- `ProcessRefundRequestedService` application use case.
- `refund.requested` updates a succeeded payment to `REFUND_SUCCEEDED` and
  writes `refund.succeeded` to the outbox in the same transaction.
- Duplicate refund requests are skipped for the stable consumer name
  `payments.refund-requested.v1`; already-refunded payments do not emit another
  `refund.succeeded`.
- Consumer configuration through `.env`:
  - `RABBITMQ_ORDERS_LIFECYCLE_EVENTS_QUEUE`
  - `RABBITMQ_PAYMENTS_REFUND_REQUESTED_QUEUE`
- Unit tests for order completion, refund request emission, refund completion,
  duplicate handling, and invalid transition behavior.

### Ops endpoints and real frontend flow

Implemented so far:

- `GET /ops/debug` returns:
  - last 10 orders
  - timeline events for those orders
  - last 10 outbox events
- Scenario endpoints used by the frontend:
  - `POST /ops/scenarios/order-success`
  - `POST /ops/scenarios/payment-failure`
  - `POST /ops/scenarios/enrollment-failure`
- `POST /ops/outbox/:id/republish` publishes an existing outbox event to
  RabbitMQ again so duplicate handling can be tested from the UI.
- The frontend scenario buttons call the real `/ops` endpoints through the
  Vite `/api` proxy.
- The frontend polls `/ops/debug` periodically so async state transitions become
  visible without manual refresh.
- Payment and enrollment failure scenarios use reserved scenario course IDs, so
  they still travel through the normal outbox, RabbitMQ, and consumer flow:
  - payment failure emits `payment.failed`
  - enrollment failure emits `enrollment.failed`, then compensation emits
    `refund.requested` and `refund.succeeded`

Not implemented yet:

- Dedicated processed-events UI table.
- Advanced replay tooling beyond outbox re-publish.

## Architecture

### Orders create flow

The orders feature is split into small layers so the HTTP API, business flow,
database persistence, and event contract stay separate.

```text
backend/src/orders/
|-- orders.module.ts
|   Registers the controller, create service, Order entity, and repository binding.
|
|-- orders.controller.ts
|   POST /orders
|   - accepts CreateOrderDto from the request body
|   - reads optional x-correlation-id header
|   - delegates to CreateOrderService
|   - maps the saved Order entity to CreateOrderResponseDto
|
|-- dto/
|   `-- create-order.dto.ts
|       Request/response shapes for the HTTP boundary.
|
|-- application/
|   |-- create-order.service.ts
|   |   Main use case:
|   |   - opens a transaction
|   |   - creates a pending order through OrderRepository
|   |   - creates an order.created event payload
|   |   - appends that event to the transactional outbox
|   |
|   `-- order-repository.ts
|       Repository port/interface used by the application layer.
|       The service depends on this abstraction, not on TypeORM directly.
|
|-- infrastructure/
|   `-- typeorm-order.repository.ts
|       Repository adapter that implements OrderRepository with TypeORM.
|       It uses the transaction EntityManager when one is provided.
|
|-- entities/
|   `-- order.entity.ts
|       TypeORM mapping for the orders database table.
|
|-- contracts/
|   `-- events.ts
|       Domain event payload types published through the outbox.
|
`-- order-status.enum.ts
    Shared order status values, for example pending.
```

```text
POST /orders
    |
    v
OrdersController.create()
    |
    |  CreateOrderDto + optional x-correlation-id
    v
CreateOrderService.create()
    |
    |  transaction.run(...)
    v
+----------------------------- transaction -----------------------------+
|                                                                       |
|  OrderRepository.create(...)                                          |
|      |                                                                |
|      v                                                                |
|  TypeormOrderRepository.create(...)                                   |
|      |                                                                |
|      v                                                                |
|  orders table                                                         |
|                                                                       |
|  build OrderCreatedEventV1                                            |
|      |                                                                |
|      v                                                                |
|  OutboxEventRepository.append(...)                                    |
|      |                                                                |
|      v                                                                |
|  outbox_events table                                                  |
|                                                                       |
+-----------------------------------------------------------------------+
    |
    v
Order entity -> CreateOrderResponseDto -> HTTP 201
```

The key idea is that `CreateOrderService` owns the business workflow, while
`TypeormOrderRepository` owns the database details. The `ORDER_REPOSITORY`
symbol in `order-repository.ts` is the Nest injection token that connects those
two pieces in `orders.module.ts`.

### Payment event status flow

Payment events are domain facts published by the payments module through the
outbox. RabbitMQ routing sends those facts to the Orders module queue so orders
can update their own lifecycle state.

```text
payments emits payment.succeeded
    |
    v
outbox_events row with type = payment.succeeded
    |
    v
OutboxPublisherService
    |
    |  publish to exchange orderflow.events
    |  routing key payment.succeeded
    v
RabbitMQ topic exchange
    |
    |  binding: payment.succeeded -> orders.payment-events.v1
    v
orders.payment-events.v1 queue
    |
    v
AmqpPaymentEventsConsumer
    |
    v
ProcessPaymentEventService
    |
    |  insert processed_events(event_id, consumer)
    |  find order
    |  validate transition
    |  update status
    v
orders.status = PAID
```

`payment.failed` follows the same route, but updates a `PENDING` order to
`PAYMENT_FAILED`.

`bindQueue(...)` sets up the RabbitMQ routing. `consume(...)` is the part that
actually listens to messages from the queue.

```text
payment.succeeded ----+
                      |
                      v
              orders.payment-events.v1
                      ^
                      |
payment.failed -------+
```

For this step, the workflow intentionally skips `PAYMENT_IN_PROGRESS`; newly
created orders remain `PENDING` until a final payment event changes them to
`PAID` or `PAYMENT_FAILED`.
