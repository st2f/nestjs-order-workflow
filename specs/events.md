# Events

Events are the service contracts between backend domains. Producers write events
to the transactional outbox; the publisher sends them to RabbitMQ.

## Event Envelope

All events should include:

```ts
type EventEnvelope<T> = {
  eventId: string;
  type: string;
  version: 1;
  occurredAt: string;
  correlationId: string;
  data: T;
};
```

## Event Catalog

| Event | Producer | Consumers | Meaning |
| --- | --- | --- | --- |
| `order.created` | `orders` | `payments` | a new order exists and payment may start |
| `payment.succeeded` | `payments` | `orders`, `enrollments` | payment was accepted |
| `payment.failed` | `payments` | `orders`, optional `notifications` | payment reached a final failure |
| `enrollment.granted` | `enrollments` | `orders`, optional `notifications` | course access was granted |
| `enrollment.failed` | `enrollments` | `orders` | course access could not be granted |
| `refund.requested` | `orders` | `payments` | compensation is required |
| `refund.succeeded` | `payments` | `orders`, optional `notifications` | compensation completed |
| `notification.sent` | `notifications` | none required | fake notification was persisted |

## Required Payload Data

### `order.created`

- `orderId`
- `userId`
- `courseId`
- `amount`

### `payment.succeeded`

- `orderId`
- `paymentId`
- `amount`

### `payment.failed`

- `orderId`
- `paymentId`
- `reason`

### `enrollment.granted`

- `orderId`
- `courseId`
- `enrollmentId`

### `enrollment.failed`

- `orderId`
- `courseId`
- `reason`

### `refund.requested`

- `orderId`
- `paymentId` when available
- `reason`

### `refund.succeeded`

- `orderId`
- `paymentId`

## Happy Path

1. user creates order
2. `orders` writes order with `PENDING`
3. `orders` emits `order.created`
4. `payments` consumes `order.created`
5. `payments` writes successful payment and emits `payment.succeeded`
6. `orders` updates order to `PAID`
7. `enrollments` consumes `payment.succeeded`
8. `enrollments` grants access and emits `enrollment.granted`
9. `orders` updates order to `COMPLETED`

## Compensation Path

Scenario: payment succeeds, enrollment fails.

1. `payments` emits `payment.succeeded`
2. `orders` updates order to `PAID`
3. `enrollments` emits `enrollment.failed`
4. `orders` updates order to `REFUND_IN_PROGRESS`
5. `orders` emits `refund.requested`
6. `payments` records refund success and emits `refund.succeeded`
7. `orders` updates order to `REFUNDED`

## Outbox Rule

When a module emits an event:

1. write domain state
2. write `outbox_events` row in the same transaction
3. commit
4. outbox publisher reads unpublished rows
5. publisher sends to RabbitMQ
6. publisher marks `published_at`

This prevents publishing events for state changes that did not commit.

## Consumer Idempotency Rule

Every consumer must:

1. validate payload
2. check `processed_events` for `(eventId, consumer)`
3. acknowledge and skip if already processed
4. perform side effects inside a transaction when possible
5. insert processed marker
6. commit

Consumer names must be stable and explicit, for example
`payments.order-created.v1`.

## Retry Guidance

Retry:

- broker temporary unavailability
- DB lock or timeout
- fake provider timeout
- transient infrastructure errors

Do not retry as a business action:

- invalid event payload
- unsupported event version
- no seats available
- final fake payment rejection

Suggested V1 policy:

- max consumer retries: `3`
- fixed delay is acceptable
- after max retries, dead-letter or expose failure visibly through ops/debug
