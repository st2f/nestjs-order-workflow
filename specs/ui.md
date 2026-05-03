# Minimal UI screens

The goal of this UI is to:

- trigger workflow scenarios
- observe event flow
- test idempotency by re-publishing events

## UI

### Controls

- [ button create order success ]
- [ button create order payment failure ]
- [ button create order enrollment failure ]

### Orders list (last 10)

- id
- courseId
- status

### Selected order timeline

- event type
- status
- createdAt
- error

### Outbox list (last 10)

- id
- type
- status
- retryCount
- lastError
- [ Re-publish ]
- [ Show detail -> JSON payload ]

Re-publish event:

- sends the same event again to the broker
- can be used on any event (PENDING, FAILED, PUBLISHED)
- used to test idempotency and recovery

---

## Architecture

Suggestion for endpoints :

- POST /ops/scenarios/order-success
- POST /ops/scenarios/payment-failure
- POST /ops/scenarios/enrollment-failure
- POST /ops/outbox/:id/republish

Suggestion for architecture :

```txt
frontend/
  src/
    api/
      opsApi.ts
    pages/
      DebugPage.tsx
    components/
      OrdersList.tsx
      OrderTimeline.tsx
      OutboxList.tsx
      EventDetail.tsx
      DebugControls.tsx
```

Within the big picture, this repo would contain :

```txt
backend/	<-- NestJS
  src/
frontend/	<-- React/Vitest
  src/
```
