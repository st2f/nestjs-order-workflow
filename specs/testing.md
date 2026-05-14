# Testing

Tests should prove the workflow contracts without making every layer heavy.

## Backend

### Pure use cases

Use Vitest only.

Test:

- order transition rules
- idempotency decisions
- compensation trigger rule
- event payload creation
- retry decision helpers

### Nest services with constructor DI

Use Vitest with lightweight Nest testing helpers when useful.

Test:

- service wiring that depends on injected ports
- auth service credential validation
- JWT payload creation

### Controllers, guards, strategies, pipes

Use `@nestjs/testing` sparingly.

Test:

- `AuthController` login success/failure
- `LocalStrategy` validates username/password
- `JwtStrategy` validates token payload
- `/ops/*` rejects missing or invalid JWT
- `/ops/live` rejects missing or invalid JWT during connection
- role guard allows seeded `admin`

### Database integration

Use Vitest with local Docker Compose or Testcontainers.

Test:

- repositories
- outbox write in the same transaction as domain state
- processed-events persistence

### HTTP e2e

Keep to a few high-value flows:

- login then access protected ops endpoint
- create order happy path
- payment success then enrollment failure then refund

## Frontend

Use Vitest and React Testing Library.

Test:

- login form calls `POST /api/auth/login`
- JWT is attached to protected ops calls
- live update client sends the JWT when connecting
- auth failure returns to login
- dashboard renders from `/api/ops/debug` fixture data
- dashboard refetches `/api/ops/debug` after `debug.state.updated`
- scenario buttons call the correct ops endpoints
- outbox republish button calls `POST /api/ops/outbox/:id/republish`

Frontend tests must not require:

- Postgres
- RabbitMQ
- Nest application boot
- backend source imports

## Manual Verification

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

Run e2e when Postgres is available:

```bash
cd backend
npm run test:e2e
```
