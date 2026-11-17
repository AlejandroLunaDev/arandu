# ADR-0003: Backend architecture and monorepo

- Status: accepted
- Date: 2026-11-17
- Decided by: Alejandro (owner), with the data squad ingeniero

## Context

The landing will open a book on the shelf for one profession and show real data on the São Paulo institutions that offer it (ADR-0004). Later, the product app reuses that data and adds AI, reports and accounts. Whether the app is a web PWA or mobile is not decided yet.

That needs three things the repository does not have: a database, an engine that keeps public data up to date, and an API. Today the repository holds only the Next.js landing, at the root, on npm.

## Decisions

### Repository

The repository becomes a Turborepo monorepo on npm workspaces.

| Path | What it holds |
|---|---|
| `apps/web` | The Next.js landing, moved from the root |
| `apps/api` | The NestJS API |
| `apps/engine` | The Python ingestion engine |
| `packages/contracts` | TypeScript types of the API responses, shared by `api` and `web` |
| `packages/db-types` | Types generated from the database schema (`supabase gen types`) |
| `supabase/` | Migrations and seed data |

- New apps and packages are added only when something real needs them.
- The product front end goes under `apps/` once its platform is decided.

### Services

| Piece | Decision |
|---|---|
| Database | Supabase Postgres. pgvector for the RAG is a later step |
| API | NestJS is the only door for the web and the app. Neither reads Supabase directly. Responses are validated against `packages/contracts` |
| Engine | Python, run on a schedule. Python is chosen for parsing PDFs (pdfplumber), OCR (Tesseract) and pages that need JavaScript (Playwright) |
| How they talk | Only through the database. The engine writes; the API reads. Neither calls the other |
| Data processing | The Python standard library, plus SQL in Postgres. The engine loads raw rows into staging tables, and normalization is versioned SQL. pandas is allowed in exploration notebooks only, not in the engine |

### Schema and migrations

- `supabase/migrations` is the only place the schema changes. Neither Nest nor Python runs ORM migrations.
- Migrations run once per deploy, as their own pipeline step, never when a service starts.

### Deploy

- Render, one service per app, each built from its own Dockerfile, in the Virginia region.
- The Supabase project lives in `us-east-1` (N. Virginia), next to Render's Virginia region and Vercel's default function region. Render has no South American region.
- Services reach the database through Supabase's session pooler (IPv4, port 5432). The direct database host is IPv6-only, and Render services connect out over IPv4 only.
- Docker also pins the engine's system dependencies (Chromium, Tesseract), so the engine runs the same locally and on Render.

### Secrets

- No secret is committed. Locally they sit in git-ignored `.env` files; on Render, in environment variables.
- The Supabase service-role key is used only by the engine and the API, server-side. Nothing secret reaches the web.

## Consequences

- Two languages. The engine shares no TypeScript types: its contract is the schema, protected by Postgres constraints and by parser tests.
- Every web request goes through Nest. That is one more hop, and one more service to keep awake for the demo.
- Moving the landing into `apps/web` touches the web squad's work and ADR-0001, which left monorepo rules out. The move is coordinated with that squad.

## Open points

- The Render plan, and how a migration step runs before each deploy there: not verified.
- The product front-end platform: web PWA or mobile.
- Measured latency between the Render, Vercel and Supabase regions: not checked.
