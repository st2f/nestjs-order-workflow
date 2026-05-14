# Architecture

OrderFlow demonstrates an event-driven purchase workflow with a backend service,
a separate HTTP-only frontend service, Postgres, and RabbitMQ.

## System Shape

```txt
Browser
  -> frontend service
      -> calls backend HTTP APIs only

Backend service
  -> public API
  -> ops/debug API
  -> auth API
  -> domain modules
  -> outbox publisher
  -> RabbitMQ consumers

Postgres
RabbitMQ
```

## Service Boundaries

### Frontend service

Owns:

- screens and presentation state
- HTTP API client code

Must not:

- access backend infrastructure or source internals

May:

- call backend HTTP APIs

Detailed frontend boundary, screens, auth behavior, and tests live in
[frontend.md](frontend.md).

### Backend service

Owns:

- HTTP API contracts
- authentication and authorization
- order, payment, enrollment, notification, event, and ops modules
- database writes
- RabbitMQ publishing and consuming
- domain state transitions
- idempotency and compensation

### Infrastructure

- Postgres stores backend-owned state.
- RabbitMQ transports domain events.
- The frontend has no infrastructure dependency except HTTP access to the backend.

## Backend Modules

| Module | Owns | Publishes | Consumes |
| --- | --- | --- | --- |
| `auth` | login, JWT creation, route protection | none | none |
| `orders` | order creation and lifecycle state | `order.created`, `refund.requested` | `payment.succeeded`, `payment.failed`, `enrollment.granted`, `enrollment.failed`, `refund.succeeded` |
| `payments` | fake payment and refund records | `payment.succeeded`, `payment.failed`, `refund.succeeded` | `order.created`, `refund.requested` |
| `enrollments` | fake course enrollment decision | `enrollment.granted`, `enrollment.failed` | `payment.succeeded` |
| `notifications` | fake notification persistence | `notification.sent` | final workflow events |
| `events` | outbox, publisher, processed-events | broker messages from outbox rows | none |
| `ops` | demo scenarios and debug inspection | none directly | none directly |

## Auth Boundary

The debug/ops UI is protected by backend auth. `/ops/*` routes require an admin
JWT, while `POST /auth/login` stays public.

The detailed login, Passport strategy, JWT, and seeded admin rules live in
[auth.md](auth.md).

## Data Ownership Rules

- Each domain writes only its own tables.
- Backend modules must not import another domain module's repositories or
  application services directly.
- Cross-domain communication should happen through events or explicit public
  contracts.
- Cross-domain references use IDs, not ORM relations.
- Event payloads are service contracts and should be versioned.

## Shared Contracts

Stable interfaces should be explicit even while the backend is still a modular
monolith.

Suggested structure:

```txt
backend/src/contracts/
  api/
  auth/
  events/
```

Use these folders for cross-boundary types that are intentionally shared:

- `contracts/api/` - HTTP request and response shapes that frontend clients may mirror.
- `contracts/auth/` - auth user and JWT payload shapes.
- `contracts/events/` - versioned event payloads and envelopes.

Domain internals should stay inside their module folders. Repositories,
application services, TypeORM entities, and infrastructure adapters are not
cross-module contracts.

## Order State Machine

States:

- `PENDING`
- `PAID`
- `COMPLETED`
- `PAYMENT_FAILED`
- `REFUND_IN_PROGRESS`
- `REFUNDED`
- `FAILED`

Allowed transitions:

| Trigger | From | To |
| --- | --- | --- |
| create order | none | `PENDING` |
| `payment.succeeded` | `PENDING` | `PAID` |
| `payment.failed` | `PENDING` | `PAYMENT_FAILED` |
| `enrollment.granted` | `PAID` | `COMPLETED` |
| `enrollment.failed` | `PAID` | `REFUND_IN_PROGRESS` |
| `refund.succeeded` | `REFUND_IN_PROGRESS` | `REFUNDED` |

Invalid transitions should be rejected or skipped explicitly.

## Core Tables

| Table | Purpose |
| --- | --- |
| `orders` | order lifecycle state |
| `payments` | fake payment and refund state |
| `enrollments` | fake enrollment state |
| `notifications` | fake sent notifications |
| `outbox_events` | durable event publication queue |
| `processed_events` | consumer idempotency markers |

## Runtime Shapes

Local development:

- Postgres container
- RabbitMQ container
- backend app in Node
- frontend app through Vite dev server
- Vite proxies `/api` to backend

Later sandbox/VPS:

- frontend static container or web service
- backend Node container
- Postgres
- RabbitMQ
- optional Traefik in front of both services
