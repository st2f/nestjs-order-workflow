# Auth

V1 protects the debug/ops UI with a simple seeded admin login. This is a demo
boundary, not a production user-management system.

## Goals

- require login before using protected UI screens
- protect `/ops/*` backend routes
- keep the implementation easy to replace later
- avoid adding full user registration or database-backed users in V1

## Seeded Admin

Use one hardcoded seeded admin identity:

```ts
const SEEDED_ADMIN = {
  id: 'seed-admin',
  username: 'admin',
  roles: ['admin'] as const,
};
```

Password handling:

- prefer a password hash or development password from environment
- never commit a real secret
- acceptable V1 env names: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`

## Backend Components

Suggested structure:

```txt
backend/src/auth/
  auth.controller.ts
  auth.module.ts
  auth.service.ts
  strategies/
    local.strategy.ts
    jwt.strategy.ts
  guards/
    local-auth.guard.ts
    jwt-auth.guard.ts
    roles.guard.ts
  decorators/
    roles.decorator.ts
```

Responsibilities:

| Component | Responsibility |
| --- | --- |
| `AuthController` | exposes `POST /auth/login` |
| `AuthService` | validates seeded credentials and signs JWTs |
| `LocalStrategy` | validates username/password during login |
| `JwtStrategy` | validates JWT payload on protected routes |
| `JwtAuthGuard` | blocks requests without a valid token |
| `RolesGuard` | blocks users without `admin` role |

## Login Contract

Endpoint:

```txt
POST /auth/login
```

Request:

```json
{
  "username": "admin",
  "password": "development-password"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "seed-admin",
    "username": "admin",
    "roles": ["admin"]
  }
}
```

## JWT Payload

```ts
type JwtPayload = {
  sub: string;
  username: string;
  roles: ['admin'];
};
```

## Route Protection

Public:

- `POST /auth/login`
- `POST /orders` may remain public/dev-only for the learning demo

Protected:

- `GET /ops/debug`
- `POST /ops/scenarios/order-success`
- `POST /ops/scenarios/payment-failure`
- `POST /ops/scenarios/enrollment-failure`
- `POST /ops/outbox/:id/republish`

All protected routes require:

```txt
Authorization: Bearer <accessToken>
```

## Frontend Behavior

- show login before debug/ops screens
- call `POST /api/auth/login`
- store the token for the demo session
- attach `Authorization: Bearer <token>` on `/api/ops/*`
- clear token on logout or `401`
- redirect back to login when unauthenticated

## Tests

Backend:

- login succeeds for seeded admin
- login fails for invalid credentials
- JWT strategy accepts valid token payload
- `/ops/*` rejects missing/invalid JWT
- admin role can access `/ops/*`

Frontend:

- login form calls auth API
- successful login opens debug dashboard
- protected ops calls include bearer token
- `401` clears auth state and returns to login
