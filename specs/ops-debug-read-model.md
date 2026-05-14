# Ops Debug Read Model

## Goal

Keep the debug UI backed by one stable dashboard endpoint:

```http
GET /ops/debug
```

The frontend should receive dashboard-ready state from this endpoint. It should
not need to know which domain module owns orders, payments, enrollments,
outbox events, or processed-event state.

## Current Implementation

The app is still a modular monolith, so ops adapters may use in-process Nest
services and backend tables for now. The ops module is split by responsibility
and dependency direction:

- `OpsService`
  - acts as the controller-facing orchestration facade
  - delegates reads to `DebugStateQueryService`
  - delegates replay to `OutboxReplayService`
  - delegates scenarios through the `ScenarioOrderCreator` port
- `use-cases/DebugStateQueryService`
  - builds `DebugStateDto` through the `DebugStateReader` port
- `use-cases/OutboxReplayService`
  - republishes an outbox event through the `OutboxReplayPort`
  - triggers debug-state invalidation after the command completes
- `ports/`
  - `DebugStateReader`
  - `OutboxReplayPort`
  - `ScenarioOrderCreator`
- `adapters/`
  - `PostgresDebugStateRepository`
  - `PostgresOutboxReplayRepository`
  - `NestOrdersScenarioClient`
- `ops-read-model`
  - defines dashboard row shapes
  - maps query rows into `DebugStateDto` response DTOs

The current controller-facing commands are:

- `OpsService`
  - create success scenario
  - create payment-failure scenario
  - create enrollment-failure scenario
  - republish an outbox event
  - get debug state

The important boundary is code ownership:

- repositories persist module-owned data
- use cases decide what happened
- ops query services assemble dashboard state
- ops command services run scenarios and replay tools
- adapters are the only ops classes that know current monolith internals such
  as SQL, `CreateOrderService`, and `EventMessagePublisher`

The controller keeps the same external API:

```text
GET  /ops/debug
POST /ops/scenarios/order-success
POST /ops/scenarios/payment-failure
POST /ops/scenarios/enrollment-failure
POST /ops/outbox/:id/republish
```

## Future Read Model

Later, `DebugStateQueryService` can evolve without changing the frontend
contract:

- direct backend-table queries
- dashboard projection tables such as `debug_order_timeline`,
  `debug_outbox_status`, and `debug_workflow_summary`
- service clients such as `OrdersClient`, `EventsClient`, `PaymentsClient`,
  and `EnrollmentsClient`
- a separate operational read-model database

The long-term direction is:

```text
domain events happen
  -> debug projection listens
  -> projection writes dashboard-friendly tables
  -> GET /ops/debug reads the projection
```

This keeps the ops/debug service as an orchestrator and read-model owner rather
than a module that reaches into every domain module's internals.
