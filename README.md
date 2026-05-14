[![CI](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml)

# OrderFlow

OrderFlow is a small learning project for building an event-driven course
purchase workflow with NestJS, Postgres, RabbitMQ, and a separate React debug
UI.

It models a purchase from order creation through asynchronous payment,
enrollment, and refund compensation. The project is intentionally small: the
goal is to make outbox publishing, duplicate-safe consumers, eventual
consistency, and observable async behavior easy to inspect and test.

<img width="1200" height="721" alt="image" src="https://github.com/user-attachments/assets/88ee3562-9aa4-4308-9187-f9db5479dd91" />

## Repository Layout

- `backend/` - NestJS API, domain modules, RabbitMQ consumers, and outbox publisher.
- `frontend/` - React/Vite UI service. It talks to the backend through HTTP only.
- `specs/` - architecture, API, events, auth, frontend, testing, and roadmap docs.
- `docker-compose.yml` - local Postgres and RabbitMQ.

Start with [specs/README.md](specs/README.md) for the complete spec map.

## Quick Start

Start local infrastructure:

```bash
docker compose up -d postgres rabbitmq
```

Start the backend:

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

The backend listens on `http://localhost:3000`.

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend listens on `http://localhost:5173`. Vite proxies `/api` requests
to the backend during local development.

## Try the API

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

RabbitMQ management UI:

- URL: `http://localhost:15672`
- Username: `orderflow`
- Password: `orderflow`

## Verification

Run backend checks:

```bash
cd backend
npm run build
npm run lint
npm run test
```

Run frontend checks:

```bash
cd frontend
npm run build
npm run test
```

Run backend e2e tests when Postgres is available:

```bash
cd backend
npm run test:e2e
```

The e2e suite uses a separate `orderflow_test` database by default.
