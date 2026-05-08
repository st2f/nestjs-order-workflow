[![CI](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml)

# OrderFlow

OrderFlow is a small NestJS backend for demonstrating an event-driven course
purchase workflow.

This repository is split into two application directories:

- `backend/` contains the NestJS API and worker-facing domain modules.
- `frontend/` contains the minimal React debug UI.

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

Not implemented yet:

- RabbitMQ consumers.
- Idempotency guard behavior.
- Debug `/ops` endpoints.
- Frontend.

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

RabbitMQ is available for later steps at:

- AMQP: `localhost:5672`
- Management UI: `http://localhost:15672`
- Username: `orderflow`
- Password: `orderflow`

The outbox publisher sends messages to the durable topic exchange
`orderflow.events` by default. Consumers can bind queues with event-type routing
keys such as `order.created`.

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
