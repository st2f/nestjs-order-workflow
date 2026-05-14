# HTTP API

The backend is the only HTTP API provider. The frontend and ops/debug UI call
these endpoints over HTTP; they never read backend state directly.

## Auth

### `POST /auth/login`

Public endpoint used by the frontend login screen.

Request:

```json
{
  "username": "admin",
  "password": "development-password"
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

Implementation target:

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

V1 may temporarily support `X-Ops-Api-Key` for local development, but the target
shape is admin JWT protection.

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

## API Client Rules

Frontend API clients should:

- live under `frontend/src/api/`
- use HTTP only
- keep auth token handling in one place
- attach `Authorization: Bearer <token>` for protected ops calls
- expose typed functions to pages/components
- be tested with mocked HTTP responses
