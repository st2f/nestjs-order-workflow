[![CI](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml)

# OrderFlow

OrderFlow is a small NestJS backend for demonstrating an event-driven course
purchase workflow.

This repository is split into two application directories:

- `backend/` contains the NestJS API and worker-facing domain modules.
- `frontend/` contains the minimal React debug UI.

## Step 1 — Entities and schema foundation

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

Not implemented yet:

- Order creation.
- Transactional outbox writes.
- RabbitMQ publisher/consumers.
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
