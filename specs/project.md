# Project: OrderFlow (event-driven course purchase)

---

## 1. Goal

Build a small NestJS backend system that demonstrates, end to end:

- event-driven workflow
- eventual consistency
- idempotency / duplicate handling
- retry vs non-retry failure decisions
- compensation (refund after enrollment failure)
- observable async behavior through debug endpoints and a minimal frontend

Frontend is minimal and exists only to observe system behavior.

---

## 2. Scope

Keep V1 intentionally small.

### In scope

- create order
- emit `order.created`
- process payment asynchronously
- process enrollment asynchronously
- complete order on success
- trigger refund when payment succeeded but enrollment fails
- persist processed events for idempotency
- expose order timeline / debug state
- simulate a few failures

### Out of scope for V1

- real payment provider
- real email service
- full auth system
- full catalog/product UI
- separate worker container
- Kubernetes
- production-grade security
- advanced replay tooling beyond a few debug endpoints

---

## 3. High-Level Architecture

### External

Browser
→ Traefik (basic auth for sandbox/debug)
→ `/` frontend (React + nginx)
→ `/api` backend (NestJS)
→ `/ops` backend debug endpoints

### Internal

- Postgres
- RabbitMQ

### Backend modules

- `orders`
- `payments`
- `enrollments`
- `notifications`
- `events` (outbox, publisher, processed-events)
- `ops`

---

## 4. Ownership by Module

### orders

Owns:

- order creation
- order lifecycle / state transitions
- order timeline

Publishes:

- `order.created`
- `refund.requested` (compensation trigger, or equivalent compensation event)

Consumes:

- `payment.succeeded`
- `payment.failed`
- `enrollment.granted`
- `enrollment.failed`
- `refund.succeeded`

### payments

Owns:

- payment attempts
- fake payment provider call
- refund handling

Publishes:

- `payment.succeeded`
- `payment.failed`
- `refund.succeeded`

Consumes:

- `order.created`
- `refund.requested`

### enrollments

Owns:

- seat reservation / enrollment decision

Publishes:

- `enrollment.granted`
- `enrollment.failed`

Consumes:

- `payment.succeeded`

### notifications

Owns:

- persistence of fake sent notifications

Publishes:

- `notification.sent`

Consumes:

- final events only (`order.completed`, `payment.failed`, `refund.succeeded`, or equivalent final states if modeled as events later)

### events

Owns:

- outbox persistence
- event publishing to RabbitMQ
- processed-events idempotency tracking

### ops

Owns:

- failure simulation
- state inspection
- replay helpers (minimal)

---

## 5. Order State Machine

### States

- `PENDING`
- `PAYMENT_IN_PROGRESS`
- `PAID`
- `ENROLLMENT_IN_PROGRESS`
- `COMPLETED`
- `PAYMENT_FAILED`
- `REFUND_IN_PROGRESS`
- `REFUNDED`
- `FAILED`

### Allowed transitions

- create order → `PENDING`
- publish `order.created` / begin payment work → `PAYMENT_IN_PROGRESS`
- `payment.succeeded` → `PAID`
- start enrollment after payment success → `ENROLLMENT_IN_PROGRESS`
- `enrollment.granted` → `COMPLETED`
- `payment.failed` → `PAYMENT_FAILED`
- `enrollment.failed` after successful payment → `REFUND_IN_PROGRESS`
- `refund.succeeded` → `REFUNDED`

### Notes

- `FAILED` is optional in V1 and can represent a terminal technical/business failure if needed.
- Keep transition rules explicit in code and unit-tested.
- Reject invalid transitions rather than silently mutating state.

---

## 6. Core Data Model

### orders

- `id`
- `user_id`
- `course_id`
- `amount`
- `status`
- `created_at`
- `updated_at`

### payments

- `id`
- `order_id`
- `status`
- `attempt_count`
- `provider_reference` (fake)
- `created_at`
- `updated_at`

### enrollments

- `id`
- `order_id`
- `course_id`
- `status`
- `created_at`
- `updated_at`

### outbox_events

- `id`
- `type`
- `payload`
- `occurred_at`
- `published_at`
- `retry_count`
- `last_error`

### processed_events

- `event_id`
- `consumer`
- `processed_at`

### notifications

- `id`
- `order_id`
- `type`
- `sent_at`

### Optional later

- `order_timeline` table, or derive timeline from state changes and stored events
- DLQ table view for UI inspection without exposing broker internals

---

## 7. Event Catalog

All event payloads should include at least:

- `eventId`
- `eventType`
- `occurredAt`
- `orderId`
- `correlationId`

Add module-specific fields as needed.

### `order.created`

Producer:

- `orders`

Consumers:

- `payments`

Meaning:

- a new order exists and payment processing may start

Payload minimum:

- `eventId`
- `orderId`
- `userId`
- `courseId`
- `amount`
- `occurredAt`
- `correlationId`

Consumer assumptions:

- order row exists
- event was stored durably before publish

Retry guidance:

- yes for transient consumer failure

### `payment.succeeded`

Producer:

- `payments`

Consumers:

- `orders`
- `enrollments`

Meaning:

- payment was accepted and enrollment can proceed

Payload minimum:

- `eventId`
- `orderId`
- `paymentId`
- `amount`
- `occurredAt`
- `correlationId`

Retry guidance:

- yes for transient consumer failure

### `payment.failed`

Producer:

- `payments`

Consumers:

- `orders`
- optional `notifications`

Meaning:

- payment could not be completed

Payload minimum:

- `eventId`
- `orderId`
- `paymentId`
- `reason`
- `occurredAt`
- `correlationId`

Retry guidance:

- usually no business retry by downstream consumer; producer itself may retry transient provider calls before emitting final failure

### `enrollment.granted`

Producer:

- `enrollments`

Consumers:

- `orders`
- optional `notifications`

Meaning:

- seat was reserved / access was granted

Payload minimum:

- `eventId`
- `orderId`
- `courseId`
- `enrollmentId`
- `occurredAt`
- `correlationId`

Retry guidance:

- yes for transient consumer failure

### `enrollment.failed`

Producer:

- `enrollments`

Consumers:

- `orders`

Meaning:

- enrollment could not be completed

Payload minimum:

- `eventId`
- `orderId`
- `courseId`
- `reason`
- `occurredAt`
- `correlationId`

Retry guidance:

- no retry if failure is business-final (example: no seats available)
- yes only for transient technical failure before final outcome is decided

### `refund.requested`

Producer:

- `orders` (or compensation coordinator inside order lifecycle)

Consumers:

- `payments`

Meaning:

- compensation is required because payment succeeded but order cannot complete

Payload minimum:

- `eventId`
- `orderId`
- `paymentId` (if available)
- `reason`
- `occurredAt`
- `correlationId`

Retry guidance:

- yes for transient consumer failure

### `refund.succeeded`

Producer:

- `payments`

Consumers:

- `orders`
- optional `notifications`

Meaning:

- compensation completed successfully

Payload minimum:

- `eventId`
- `orderId`
- `paymentId`
- `occurredAt`
- `correlationId`

Retry guidance:

- yes for transient consumer failure

### `notification.sent`

Producer:

- `notifications`

Consumers:

- none required in V1

Meaning:

- fake notification persisted as sent

---

## 8. Happy Path Sequence

1. user calls create-order API
2. `orders` writes order with status `PENDING`
3. `orders` emits(\*) `order.created`
4. `payments` consumes `order.created`
5. `payments` records payment success and emits(\*) `payment.succeeded`
6. `orders` updates status to `PAID`
7. `enrollments` consumes `payment.succeeded`
8. `enrollments` grants seat and emits(\*) `enrollment.granted`
9. `orders` updates status to `COMPLETED`
10. optional `notifications` persists a fake sent notification

### (\*) Emit vs Publish

When a module **emits** an event:

- it writes the event into the `outbox_events` table inside the same transaction as its state change
- this is part of the **domain/application logic**

Then a separate **publisher** component:

- reads unpublished events from the outbox
- sends them to RabbitMQ
- marks them as published

This separation ensures:

- reliable delivery (no event without committed state)
- retry capability at the infrastructure level
- clean separation between business logic and messaging infrastructure

---

## 9. Compensation Sequence

Scenario: payment succeeds, enrollment fails.

1. `payments` emits `payment.succeeded`
2. `orders` updates to `PAID`
3. `enrollments` consumes `payment.succeeded`
4. `enrollments` determines no seat / cannot grant access
5. `enrollments` emits `enrollment.failed`
6. `orders` updates status to `REFUND_IN_PROGRESS`
7. `orders` emits `refund.requested`
8. `payments` consumes `refund.requested`
9. `payments` records fake refund success and emits `refund.succeeded`
10. `orders` updates status to `REFUNDED`

---

## 10. Failure Matrix

| Step                                  | Example failure                       |                    Retry? |                  DLQ? | Idempotency needed? |                                 Compensation? |
| ------------------------------------- | ------------------------------------- | ------------------------: | --------------------: | ------------------: | --------------------------------------------: |
| outbox publish                        | broker temporarily unavailable        |                       yes |                    no |                 n/a |                                            no |
| consume `order.created`               | DB timeout while creating payment row |                       yes | yes after max retries |                 yes |                                            no |
| fake payment provider                 | transient timeout                     | yes, before final failure | yes after max retries |                 yes |                                            no |
| fake payment provider                 | card declined / business rejection    |                        no |                    no |                 yes |                                            no |
| consume `payment.succeeded` in orders | duplicate delivery                    |  no extra business action |                    no |                 yes |                                            no |
| enrollment decision                   | no seats available                    |                        no |                    no |                 yes |                                           yes |
| enrollment consumer                   | transient DB error                    |                       yes | yes after max retries |                 yes | maybe later depending on partial side effects |
| notification send                     | fake provider temporary error         |            optional retry |              optional |                 yes |                                            no |

### Rule of thumb

- retry transient technical failures
- do not retry final business failures
- always assume duplicate delivery is possible

---

## 11. Idempotency Strategy

### Consumer rule

Before processing an event:

1. validate payload
2. check `processed_events` for `(eventId, consumer)`
3. if already processed, acknowledge and exit
4. otherwise perform side effects inside transaction when possible
5. insert processed-events record
6. commit

### Notes

- consumer name must be stable and explicit (example: `payments.order-created.v1`)
- event IDs must be unique and producer-generated
- duplicate messages must not create duplicate payments, enrollments, or refunds

---

## 12. Outbox Strategy

### Producer rule

When a module emits an event:

1. write domain state change
2. write `outbox_events` row in same DB transaction
3. commit
4. publisher reads unpublished outbox rows
5. publish to broker
6. mark `published_at`

### Why

This avoids publishing events for state changes that were never committed.

### V1 simplification

A polling publisher is enough. No need for advanced CDC (Change Data Capture = Detecting changes in the database automatically → and turning them into events; advanced, infrastructure-heavy, not needed here)

---

## 13. Retry / DLQ Rules

### Retryable failures

- broker temporary unavailability
- DB lock / timeout
- fake payment provider timeout
- transient network or infrastructure issues

### Non-retryable failures

- invalid event payload
- unknown event schema version (for now)
- no seats available
- business rejection from fake payment provider

### Suggested V1 policy

- max consumer retries: `3`
- exponential backoff optional; fixed delay is acceptable in V1
- after max retries, move message to DLQ or mark as dead-lettered in a visible way

---

## 14. Observability / Debug

### Minimum visibility

- inspect order by ID
- inspect order timeline
- inspect outbox rows
- inspect processed-events rows
- inspect failed/dead-lettered messages or equivalent status

### Debug endpoints (`/ops`)

- replay one event by ID (optional/minimal)
- simulate payment transient failure
- simulate payment business failure
- simulate enrollment no-seat failure
- inspect outbox
- inspect processed events

### Correlation

Every log line and event should include a `correlationId` so an order flow can be followed across modules.

---

## 15. Testing Blueprint

### Level 1 — Unit

Test:

- order transition rules
- idempotency guard logic
- compensation trigger rule
- retry decision helpers

### Level 2 — Integration (DB)

Test:

- repositories
- outbox write in same transaction as domain state
- processed-events persistence

### Level 3 — Messaging

Test:

- producer/consumer happy path
- duplicate message handling
- retry then success
- retry then dead-letter

### Level 4 — API

Test:

- create order endpoint
- get order status / timeline endpoint
- debug endpoints if enabled

### Level 5 — Minimal UI

Test:

- order status polling / rendering only

### Level 6 — E2E

Keep to 1–2 flows:

- happy path
- payment success then enrollment failure then refund

---

## 16. What the Demo Should Prove

The project should make it easy to explain and demonstrate:

- asynchronous workflow instead of simple CRUD
- eventual consistency visible through state transitions
- duplicate-safe consumers
- clear distinction between retryable and non-retryable failures
- compensation flow after partial success
- realistic backend/system thinking in NestJS

---

## 17. Final Philosophy

- backend is the product
- frontend is a probe
- debug tools are intentional
- deployment is sandbox but realistic
- tests grow with complexity
- V1 must stay explainable end to end

---

## 18. Stack

Backend

- NestJS
- TypeScript
- Postgres
- RabbitMQ
- TypeORM
- Jest

Frontend

- React
- Vite
- TypeScript
- Vitest

Repository structure

- /backend
- /frontend
- docker-compose.yml
- docker-compose.traefik.yml (later)
- .env
- .env.example

Deployment shape

V1 local development

- Postgres container
- RabbitMQ container
- backend app running in Node
- frontend app running with Vite dev server
- no Traefik yet

Later sandbox / VPS shape

- Traefik
- Postgres
- RabbitMQ
- backend Node container
- frontend nginx container serving the built app

Notes

- no separate worker container for V1
- one backend process handles API, ops endpoints, RabbitMQ consumers, and outbox polling publisher

---

## 19. Suggested Implementation Order

1. define entities / schema
2. implement order creation + outbox write
3. implement publisher
4. implement payment consumer
5. implement order status updates from payment events
6. implement enrollment consumer
7. implement compensation (`refund.requested` → `refund.succeeded`)
8. add idempotency protection
9. add debug endpoints

During implementation at any stages:

- [prepare for microservices split](/specs/services-split.md)
- [add tests](/specs/tests.md) progressively when it is proving something useful
- [add minimal frontend view](/specs/ui.md)
- when a stage is complete, update the [README](/README.md) with bare minimum such as the app current working state and potentially new commands.
