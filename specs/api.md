# Backend API

The backend is the only API provider. The frontend and ops/debug UI use HTTP for
state and commands, and one protected WebSocket for live invalidation
notifications. They never read backend state directly.

## Auth

### `POST /auth/login`

Public endpoint used by the frontend login screen.

Request:

```json
{
  "username": "admin",
  "password": "orderflow-admin"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "seed-admin",
    "username": "admin",
    "roles": ["admin"]
  }
}
```

Implementation:

- `AuthController`
- Passport `LocalStrategy` for username/password validation
- Passport `JwtStrategy` for protected routes
- seeded hardcoded admin role for V1

See [auth.md](auth.md) for the full auth spec.

## Public / Demo API

### `POST /orders`

Creates an order and writes `order.created` to the transactional outbox.

Request:

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "courseId": "00000000-0000-0000-0000-000000000002",
  "amount": "49.99"
}
```

Response:

```json
{
  "id": "order-id",
  "userId": "00000000-0000-0000-0000-000000000001",
  "courseId": "00000000-0000-0000-0000-000000000002",
  "amount": "49.99",
  "status": "PENDING",
  "createdAt": "iso-date",
  "updatedAt": "iso-date"
}
```

## Ops API

All `/ops/*` endpoints require an admin JWT:

```txt
Authorization: Bearer <accessToken>
```

HTTP remains the canonical source of dashboard state. The WebSocket channel is
only a live invalidation signal that tells the frontend to refetch HTTP state.

### `GET /ops/debug`

Returns the current debug dashboard state.

Response includes:

- last orders
- timeline events for visible orders
- last outbox events
- later: processed-events and dead-letter/debug failure state

### `POST /ops/scenarios/order-success`

Creates an order that should complete successfully through the normal async
workflow.

### `POST /ops/scenarios/payment-failure`

Creates an order whose fake payment path emits `payment.failed`.

### `POST /ops/scenarios/enrollment-failure`

Creates an order whose fake enrollment path emits `enrollment.failed`, then
triggers refund compensation.

### `POST /ops/outbox/:id/republish`

Publishes an existing outbox event to RabbitMQ again.

Use this to prove duplicate-safe consumers and recovery behavior.

Rules:

- can republish pending, failed, or already published events
- must not mutate domain state directly
- should return the republished event metadata

## Ops Live Updates

### `WS /ops/live`

Protected WebSocket endpoint used by the debug dashboard.

Authentication:

- client sends the admin JWT during connection
- backend accepts only authenticated users with the `admin` role
- unauthenticated or non-admin clients are rejected during the handshake

Recommended browser connection shape:

```txt
ws://localhost:5173/api/ops/live?token=<accessToken>
```

In the container/nginx shape, the browser still connects through the frontend
entrypoint:

```txt
ws://localhost:8080/api/ops/live?token=<accessToken>
```

The frontend nginx proxy must forward WebSocket upgrade requests under `/api/*`
to the backend.

Server message:

```json
{
  "type": "debug.state.updated",
  "occurredAt": "iso-date",
  "reason": "order.status.changed"
}
```

Allowed reasons:

- `scenario.created`
- `order.status.changed`
- `outbox.published`
- `outbox.failed`
- `processed-event.recorded`
- `outbox.republished`

Client behavior:

1. connect after login
2. receive `debug.state.updated`
3. call `GET /ops/debug`
4. render the refreshed HTTP response

Do not push the full dashboard payload through WebSocket in V1.

## API Client Rules

Frontend API clients should:

- live under `frontend/src/api/`
- use HTTP for state and commands
- use WebSocket only for `/ops/live` invalidation notifications
- keep auth token handling in one place
- attach `Authorization: Bearer <token>` for protected ops calls
- expose typed functions to pages/components
- be tested with mocked HTTP responses
