# AGENTS.md

Arandu Reka helps people choose a career by living one or two of its real subjects with Arandu, a black cat. Only rules
that cannot be read from the code live here; each app has its own `AGENTS.md`.

## Layout

| Path | What it holds |
|---|---|
| `apps/web` | Next.js landing and product app; also the backend-for-frontend (ADR-0005) |
| `apps/api` | NestJS API, the only door to the database (ADR-0003) |
| `apps/engine` | Python ingestion engine, run by hand |
| `packages/contracts` | Hand-written types of the API's requests, responses and error codes |
| `packages/db-types` | Types generated from the schema (`npm run db:types`) |
| `supabase/migrations` | The only place the schema changes |
| `docs/adr` | Decisions, one per file, from `docs/adr/template.md` |

## Process

- Work by IDD: the issue is the brief, the PR is the delivery. No spec or plan files in the repository.
- Open issues from `.github/ISSUE_TEMPLATE`. Branch from `dev` as `<type>/<issue#>-<slug>`; target `dev`. Only release
  PRs go `dev → main`; `dev` deploys to the dev environment, `main` to production.
- Conventional Commits, `<type>(<scope>): ...`, scope = `api`, `web`, `contracts`, `db-types`, `engine` or none for the
  root. No AI attribution in commits or PRs.
- Start the PR body with `Closes #N` and fill `.github/pull_request_template.md`, with the exact commands run.
- The owner OKs every push, PR, merge and real-database change. One OK never covers another PR.
- An AI reviewer posts a verdict on every PR (correctness and unmet requirements only); merge on "Verdict: APPROVED".
- A PR that changes an API contract (paths, shapes, error codes) is announced to the web and merged with the PR that
  consumes it.
- Code, comments, identifiers, commits and docs are in English. Product copy is Brazilian Portuguese.

## Verification (there is no hosted CI)

- `npm install` sets `core.hooksPath=.githooks`. The pre-push hook runs `npm run verify` (affected typecheck and lint
  against `origin/dev`). Never skip it with `--no-verify`.
- Before opening a PR, build the affected apps. Before merging, run `npm run check` and report its result on the PR.
- Changing lint configuration needs the owner's approval: fix the code, not the rule. `.claude/settings.json` enforces
  this for agents and lints every file they edit.
- TypeScript is strict everywhere, with `noUncheckedIndexedAccess`; `any` and unused disable directives are lint
  errors.

## Data model

- The career is the unit of content (ADR-0008): one first-semester subject list and one content per career for the
  whole app. Institutions are display only. Read ADR-0008 before any engine, linking or fetching work.

## Database

- Every schema change is a new file in `supabase/migrations`, applied with `supabase db push` from the root before the
  PR that adds it is merged. Never change the schema or data by hand (no direct `UPDATE`); SQL consoles are for
  read-only checks.
- Supabase is on the free tier (500 MB): measure the size before loading data.

## ADRs

- Write one when a decision is hard to reverse, crosses apps, or someone will ask "why?". Never delete or rewrite an
  ADR: supersede it and set the status on both.

## Overrides of the owner's engineering rules

The owner's general rules are applied here except where this list says otherwise.

| Rule | Here | Why |
|---|---|---|
| pnpm workspaces | npm workspaces | Vercel and Render build with npm; switching means changing both deploys (owner, 2026-11-22) |
| API types generated from an OpenAPI file | `packages/contracts`, hand-written | The API has no OpenAPI document yet (ADR-0003); revisit after the hackathon |
| Web split into `features/` and `shared/`, Server Actions, i18n | Business-area folders (ADR-0001), route handlers, pt-BR only | Restructuring the demo screens before the 2026-11-30 deadline risks the demo; the app has one language |
| Unauthenticated routes under `/public` | Marked `@Public()` at their own paths | The landing already calls them; renaming changes a contract for no gain now |
| Migrations inside the API | `supabase/migrations` at the root | The Supabase CLI and the engine share them (ADR-0003) |
| A changeset per package change | No changesets | Nothing is published; apps deploy from `dev` and `main` |
