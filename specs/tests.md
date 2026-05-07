Pure use-case / business logic:

- Vitest only
- no Nest
- no Suites

Nest service with constructor DI:

- Vitest + Suites (https://docs.nestjs.com/recipes/suites)

Nest module wiring / guards / pipes / controllers:

- @nestjs/testing, but only a few tests

HTTP e2e:

- Vitest + Supertest, or keep Nest e2e setup minimal

DB / RabbitMQ integration:

- Vitest + Docker Compose or Testcontainers
