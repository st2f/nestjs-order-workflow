[![CI](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/st2f/nestjs-order-workflow/actions/workflows/ci.yml)

# OrderFlow

OrderFlow is a small learning project for building an event-driven course
purchase workflow with NestJS, Postgres, RabbitMQ, and a separate React debug
UI.

It models a purchase from order creation through asynchronous payment,
enrollment, and refund compensation. The project is intentionally small: the
goal is to make outbox publishing, duplicate-safe consumers, eventual
consistency, and observable async behavior easy to inspect and test.

<img width="2844" height="1490" alt="image" src="https://github.com/user-attachments/assets/26ea5001-3582-459b-861d-5e26010ce9de" />

## Repository Layout

- `backend/` - NestJS API, domain modules, RabbitMQ consumers, and outbox publisher.
- `frontend/` - React/Vite UI service. It talks to the backend through HTTP only.
- `specs/` - architecture, API, events, auth, frontend, testing, and roadmap docs.
- `docker-compose.yml` - local Postgres and RabbitMQ.

Start with [specs/README.md](specs/README.md) for the complete spec map.

## Quick Start

### Infrastructure-only local development

Create local Compose credentials:

```bash
cp .env.example .env
```

The example contains local-development defaults. Adjust them if needed.

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

### Full app stack

Create local Compose credentials if you have not already:

```bash
cp .env.example .env
```

The example contains local-development defaults. Docker Compose reads the root
`.env` automatically.

Build and run infrastructure, backend, and frontend containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.app.yml up -d --build
```

Open the frontend through local Traefik:

```text
https://orderflow.app.localhost/
```

In this shape, the browser calls the frontend container through Traefik.
Frontend nginx serves the React build and proxies `/api/*` to the backend
container over the Compose network.

### Environment files

- Root `.env` is the local source of truth for shared Compose values such as
  Postgres, RabbitMQ, admin, JWT, and `ORDERFLOW_HOST`.
- `backend/.env` is only for direct local backend development with
  `npm run start:dev`. It is not a production env file.

When the backend runs directly, it loads `backend/.env` first and falls back to
the root `.env` for shared credentials. This keeps passwords in one local file
while still allowing direct development to use `localhost` connection targets.

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
- Username: value of `RABBITMQ_DEFAULT_USER` in your root `.env`
- Password: value of `RABBITMQ_DEFAULT_PASS` in your root `.env`

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
cp .env.test.example .env.test
npm run test:e2e
```

Before running e2e tests, fill `DB_USERNAME` and `DB_PASSWORD` in
`backend/.env.test` with the same Postgres credentials as your local
infrastructure. The e2e suite uses a separate `orderflow_test` database by
default.
