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

## Next

1. Formalize the frontend as a separate HTTP-only service in code and deployment docs.
2. Add simple admin login:
   - `POST /auth/login`
   - Passport local strategy
   - Passport JWT strategy
   - seeded hardcoded admin role
   - protected `/ops/*`
3. Add frontend login and protected debug route.
4. Add processed-events visibility to the debug UI.
5. Make API response contracts explicit with DTOs where missing.
6. Add targeted tests for auth, protected ops routes, and frontend auth behavior.

## Later

- Replace hardcoded admin with persisted users.
- Add richer replay/dead-letter tooling.
- Split backend modules into separate deployable services as a learning goal
  to move modular monolith to real microservices.
- Add Traefik or another edge proxy for sandbox deployment.
