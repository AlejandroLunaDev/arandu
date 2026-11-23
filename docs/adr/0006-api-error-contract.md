# ADR-0006: API error contract

- Status: accepted
- Date: 2026-11-22
- Decided by: Alejandro (owner), with the back-api session

## Context

The API answered errors in Nest's default shape, `{ statusCode, message, error }`, with no code. Two 409s of the same
area (`no_novelos_left` and `reread_used` today) could only be told apart by their message text. The wrapped shape
landed in 8473e57 (PR #105); named codes per error came with this repository's engineering-rules pass.

## Decision

- Every error body is wrapped: `{ "error": { "statusCode", "code", "message", "details"? } }`, as Google (AIP-193)
  and Stripe do. The owner chose the wrapped shape over v2.0's flat one, so it can be indexed by `error.code`.
- `code` is always present and is what clients branch on; `message` is for people and may change.
- Each module throws through named factories in `<module>.errors.ts`, each with its own code (`stop_not_found`,
  `novelos_left`).
- An error thrown without a code gets its lowercased status name (`not_found`); any unexpected error is a 500
  `internal_error`; an unavailable dependency is a 503 `<name>_unavailable` (`model_unavailable`).
- Validation errors are 400 `validation_failed`, with `details` grouped by field.
- A malformed id in the path is the resource's 404, not a 400: an id that cannot exist is a resource that does not exist.
- A Postgres unique violation (23505) is a 409 `conflict`.
- No `path`, `timestamp` or stack in the body. One filter builds every body: `apps/api/src/core/http/all-exceptions.filter.ts`.

## Consequences

- Clients branch on `error.code` when the status is not enough, never on the message. Today the web branches on
  statuses (`apps/web/src/caminho/actions.ts:27`) and on the auth codes `user_banned` and `unauthorized`
  (`apps/web/src/app-shell/api.ts:46`, `apps/web/src/auth/sign-in.ts:51`); this keeps both.
- Adding an error means adding a factory and, when the web branches on it, its code to `packages/contracts`.
