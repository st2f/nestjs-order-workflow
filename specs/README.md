# Specs

Read the docs in this order:

1. [architecture.md](architecture.md) - system boundaries and module ownership.
2. [api.md](api.md) - backend HTTP contracts used by the frontend and ops UI.
3. [events.md](events.md) - RabbitMQ event contracts, outbox, idempotency, and retries.
4. [auth.md](auth.md) - seeded admin login, Passport strategies, JWT, and route protection.
5. [frontend.md](frontend.md) - React UI service boundary, screens, auth, and API usage.
6. [testing.md](testing.md) - focused test strategy by layer.
7. [roadmap.md](roadmap.md) - current status and next work.

## Documentation Rules

- Keep `README.md` short enough for quick project onboarding.
- Keep specs focused on contracts and decisions, not implementation history.
- Put progress notes in `roadmap.md`.
- Prefer tables and short checklists over long prose.
- When behavior changes, update the smallest spec that owns that behavior.
