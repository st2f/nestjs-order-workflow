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
- Frontend formalized as a separate HTTP-only service:
  - local Vite `/api` proxy kept for development
  - frontend Docker image serves the React build through nginx
  - nginx proxies `/api/*` to the backend container
  - `docker-compose.app.yml` adds backend and frontend services

## Next

1. Add simple admin login:
   - `POST /auth/login`
   - Passport local strategy
   - Passport JWT strategy
   - seeded hardcoded admin role
   - protected `/ops/*`
2. Add frontend login and protected debug route.
3. Add processed-events visibility to the debug UI.
4. Make API response contracts explicit with DTOs where missing.
5. Add targeted tests for auth, protected ops routes, and frontend auth behavior.

## Later

- Replace hardcoded admin with persisted users.
- Add richer replay/dead-letter tooling.
- Split backend modules into separate deployable services as a learning goal
  to move modular monolith to real microservices.
- Add Traefik or another edge proxy for sandbox deployment.
