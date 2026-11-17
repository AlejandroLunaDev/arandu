# Plan: data layer for the profession books

Builds what ADR-0003 and ADR-0004 decide. Each step ends in a reviewable pull request.

## Gates (the owner's go-ahead)

- [x] The Supabase project and its credentials exist (`us-east-1`).
- [x] The terms of use of each source are checked (ADR-0004, open points).
- [ ] A live run against real sites is approved.

## Steps

1. **Monorepo skeleton.** Turborepo, `apps/web` (the landing moved, coordinated with the web squad), empty `apps/api`, `apps/engine`, `packages/contracts`, `packages/db-types`.
2. **Schema.** A local Supabase plus migrations: institutions, campuses, courses, professions, admission cut-offs, curriculum terms and subjects, sources, runs, fetched documents, staging tables.
3. **Engine, one adapter at a time**, each with fixture tests:
   1. INEP census: offerings and professions.
   2. Power BI: SISU and ProUni cut-offs.
   3. Fuvest and ENEM-USP PDFs.
   4. Curricula: USP, Unifesp, Mackenzie, FIAP.
   5. Commons: photos and logos.
4. **API.** `GET /professions` (the shelf) and `GET /professions/:slug` (one book), typed by `packages/contracts`.
5. **Deploy.** Dockerfiles for the API and the engine, their Render services, a migration step per deploy, the engine schedule. The landing stays on Vercel.
6. **Landing.** The web squad opens the books against the API.

## Done when

- [ ] A book shows only facts that carry a source URL.
- [ ] A second engine run with no source changes writes nothing new.
- [ ] Every adapter has a fixture test that fails when its parser breaks.
