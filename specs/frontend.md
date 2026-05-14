# Frontend Service

The frontend is a separate UI microservice for observing and triggering the
OrderFlow demo. It is not a backend admin module and does not own business
state.

## Boundary

The frontend must only integrate through backend HTTP APIs.

It must not:

- connect to Postgres
- connect to RabbitMQ
- import backend source files
- import TypeORM entities
- call backend services/repositories directly
- implement order, payment, enrollment, refund, or idempotency decisions

It may:

- render order and event state returned by `/api/ops/debug`
- call scenario endpoints
- call `POST /orders`
- login through `POST /auth/login`
- store the JWT in browser state/storage appropriate for the demo
- attach the JWT to protected ops calls

## Runtime

Local development:

```txt
Browser -> http://localhost:5173
Vite proxy /api -> http://localhost:3000
```

Sandbox/deployment:

```txt
Browser -> frontend service
frontend service -> backend /api over HTTP
```

## Authentication UX

The UI should show a login screen before protected debug/ops screens.

V1 login:

- username/password form
- submits to `POST /auth/login`
- stores returned JWT
- redirects to debug dashboard after success
- sends `Authorization: Bearer <token>` on `/api/ops/*`
- clears token on logout or auth failure

The seeded user is an admin role. Do not build user management in V1.

## Screens

### Login

Purpose:

- protect debug/ops UI with a simple admin login

Uses:

- `POST /api/auth/login`

### Debug dashboard

Purpose:

- trigger workflow scenarios
- observe event flow
- test idempotency by republishing events

Uses:

- `GET /api/ops/debug`
- `POST /api/ops/scenarios/order-success`
- `POST /api/ops/scenarios/payment-failure`
- `POST /api/ops/scenarios/enrollment-failure`
- `POST /api/ops/outbox/:id/republish`

### Controls

Actions:

- create success scenario
- create payment failure scenario
- create enrollment failure scenario

### Orders list

Show last orders:

- id
- courseId
- status

### Selected order timeline

Show:

- event type
- status
- createdAt
- error

### Outbox list

Show last outbox events:

- id
- type
- status
- retryCount
- lastError
- republish action
- JSON detail action

Republish behavior:

- sends the existing event to RabbitMQ again through the backend ops API
- can be used on pending, failed, or already published events
- is used to test idempotency and recovery

## Suggested Code Layout

```txt
frontend/
  src/
    api/
      authApi.ts
      opsApi.ts
    pages/
      LoginPage.tsx
      DebugPage.tsx
    components/
      DebugControls.tsx
      OrdersList.tsx
      OrderTimeline.tsx
      OutboxList.tsx
      EventDetail.tsx
    auth/
      AuthProvider.tsx
      ProtectedRoute.tsx
```

## Testing Expectations

- API clients use mocked HTTP responses.
- Protected route behavior is tested without a real backend.
- Dashboard rendering is tested from API-shaped fixtures.
- No frontend test should require Postgres, RabbitMQ, or Nest internals.
