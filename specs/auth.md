# Auth

V1 protects the debug/ops UI with a simple seeded admin login. This is a demo
boundary, not a production user-management system.

## Goals

- require login before using protected UI screens
- protect `/ops/*` backend routes
- keep the implementation easy to replace later
- avoid adding full user registration or database-backed users in V1

## Seeded Admin

V1 uses one seeded admin identity. The user ID and role are fixed in
`AuthService`; the username and password come from environment variables.

```ts
type AuthenticatedUser = {
  id: 'seed-admin';
  username: string;
  roles: ['admin'];
};
```

Required environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=1h`

Do not commit concrete credential values. Keep local values in ignored `.env`
files or in deployment secret storage.

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
  "username": "<admin-username>",
  "password": "<admin-password>"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "seed-admin",
    "username": "<admin-username>",
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
- `WS /ops/live`
- `POST /ops/scenarios/order-success`
- `POST /ops/scenarios/payment-failure`
- `POST /ops/scenarios/enrollment-failure`
- `POST /ops/outbox/:id/republish`

Protected HTTP routes require:

```txt
Authorization: Bearer <accessToken>
```

The protected WebSocket endpoint must validate the same JWT during connection
and reject non-admin clients before accepting the socket.

## Frontend Behavior

- show login before debug/ops screens
- call `POST /api/auth/login`
- store the token for the demo session
- attach `Authorization: Bearer <token>` on `/api/ops/*`
- send the token when connecting to `/api/ops/live`
- clear token on logout or `401`
- redirect back to login when unauthenticated

## Tests

Backend:

- login succeeds for seeded admin
- login fails for invalid credentials
- JWT strategy accepts valid token payload
- `/ops/*` rejects missing/invalid JWT
- `/ops/live` rejects missing/invalid JWT during connection
- admin role can access `/ops/*`
- admin role can connect to `/ops/live`

Frontend:

- login form calls auth API
- successful login opens debug dashboard
- protected ops calls include bearer token
- live update connection includes token
- `401` clears auth state and returns to login
