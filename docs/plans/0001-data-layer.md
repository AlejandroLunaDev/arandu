# Plan: data layer for the profession books

Builds what ADR-0003 and ADR-0004 decide. Each step ends in a reviewable pull request.

## Gates (the owner's go-ahead)

- [x] The Supabase project and its credentials exist (`us-east-1`).
- [x] The terms of use of each source are checked (ADR-0004, open points).
- [ ] A live run against real sites is approved.

## Steps

1. **Monorepo skeleton** (done). Turborepo, `apps/web` (the landing moved, coordinated with the web squad), empty `apps/api`, `apps/engine`, `packages/contracts`, `packages/db-types`.
2. **Schema** (catalog done). A local Supabase plus migrations: sources, scrape runs, professions, institutions, courses (with their campus), admission cut-offs, curriculum subjects (with their term). Staging tables arrive with the first adapter.
3. **Engine, one adapter at a time**, each with fixture tests:
   1. INEP census: offerings, and professions with their CINE areas (ADR-0004).
   2. Curricula: USP, Unifesp, Mackenzie, FIAP. First, because the product lets the student live 1–2 real subjects of a career to choose it (owner, 2026-11-17).
   3. Power BI: SISU and ProUni cut-offs, stored as MEC publishes them. They are context in the book, not preparation to get in.
   4. Fuvest and ENEM-USP PDFs.
   5. Commons: photos and logos.
4. **API.** `GET /professions` (the shelf) and `GET /professions/:slug` (one book), typed by `packages/contracts`.
5. **Deploy.** The API on Render (`render.yaml`), the landing on Vercel, the engine's Dockerfile for manual runs. Migrations are applied from the root before merging.
6. **Landing.** The web squad opens the books against the API.

## Done when

- [ ] A book shows only facts that carry a source URL.
- [ ] A second engine run with no source changes writes nothing new.
- [ ] Every adapter has a fixture test that fails when its parser breaks.
