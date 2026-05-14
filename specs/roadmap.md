# Roadmap

## Done

- TypeORM and Postgres wiring.
- Domain modules for orders, payments, enrollments, notifications, events, and ops.
- Core entities and status enums.
- `POST /orders`.
- Transactional outbox writes for domain events.
- Polling outbox publisher to RabbitMQ.
- Payment consumer for `order.created`.
- Order consumer for payment events.
- Enrollment consumer for `payment.succeeded`.
- Compensation flow through `refund.requested` and `refund.succeeded`.
- Processed-event idempotency guards.
- Debug endpoints for scenarios, outbox republish, and dashboard data.
- React/Vite debug UI calling real backend endpoints.
- Frontend formalized as a separate service:
  - local Vite `/api` proxy kept for development
  - frontend Docker image serves the React build through nginx
  - nginx proxies `/api/*` to the backend container
  - `docker-compose.app.yml` adds backend and frontend services
- Simple seeded admin backend auth:
  - `POST /auth/login`
  - Passport local strategy
  - Passport JWT strategy
  - seeded hardcoded admin role
  - protected `/ops/*`
- Add frontend login and protected debug route.

## Next

1. Replace dashboard polling with protected live invalidation:
   - backend exposes `WS /ops/live`
   - connection requires admin JWT
   - backend broadcasts `debug.state.updated`
   - frontend refetches `GET /ops/debug` after each notification
   - keep HTTP as the source of truth for dashboard state
2. Add processed-events visibility to the debug UI.
3. Make API response contracts explicit with DTOs where missing.
4. Add targeted tests for live update behavior and frontend auth behavior.

## Later

- Replace hardcoded admin with persisted users.
- Add richer replay/dead-letter tooling.
- Split backend modules into separate deployable services as a learning goal
  to move modular monolith to real microservices.
- Add Traefik or another edge proxy for sandbox deployment.
