# ADR-0005: API-owned sessions and a backend-for-frontend

- Status: accepted
- Date: 2026-11-21
- Decided by: Alejandro (owner), with the back-api session

## Context

The web signed people in with Supabase Auth and called the API with the Supabase token. Revoking a session, banning a
person or signing out everywhere then depended on Supabase, and the token sat in the browser. The owner's v2.0 project
already solved this with sessions owned by its API; that design was ported (PR #105, merge 35dab5f).

## Decision

- Supabase (Google) only proves who the person is. The web's server exchanges that proof once for an API session.
- The API owns users, sessions and rotating refresh tokens (`supabase/migrations/20261121120000_api_users_and_sessions.sql`),
  stores only the SHA-256 of each refresh token, and revokes the whole session when a spent token comes back.
- A person can start as a guest (a user with no Google identity). Signing in with a new Google keeps the guest's
  progress; a Google that already has a user loads that user and deletes the guest (`apps/api/src/modules/auth/auth.service.ts`).
- The browser never holds a token: the web's Next server keeps them in one HttpOnly, Secure, SameSite=Lax cookie
  (`__Host-session`, `apps/web/src/auth/cookie.ts`).
- Every call from the web's server carries `x-internal-secret`; the API's guard refuses any call without it
  (`apps/api/src/modules/auth/auth.guard.ts`).
- CORS allows only `GET` from the listed origins, for the landing's public books (`apps/api/src/main.ts`).

## Consequences

- Revocation and bans take effect on the next request, because the guard looks the session up every time.
- Every product call goes browser → Next server → API: one more hop than calling the API directly.
- The internal secret must match on Vercel and Render; rotating it means changing both.
