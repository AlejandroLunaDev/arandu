# Arandu Reka

Vocational orientation for anyone in Brazil heading to university, from high-school (ensino médio) students to those who already finished school, guided by Arandu, a curious black cat. Built for Hack Brasil 2026, education track.

## The problem

Choosing a university career at 16 or 17 is hard, and a wrong choice is costly: dropout in Brazilian higher education reaches 24.8% in in-person courses and 41.6% in distance courses (Semesp). The free vocational tools available today are mostly run by universities or course platforms that steer students toward their own offer. Students choose without having lived what a career is really like, and families and schools have little visibility to help.

## The solution

Arandu Reka lets the student try a career before choosing it.

1. **Get to know her.** A short, Duolingo-style questionnaire builds her profile.
2. **Show real options.** Arandu suggests careers that fit her, with real data from universities in São Paulo: where each one is offered, how to get in (SISU, ProUni, Fuvest) and the cut-off, always with its source.
3. **Live the career.** She picks a path made of 1–2 real first-semester subjects. Every day Arandu tells her something new about the career, gives her a real exercise and answers her questions. The exercise depends on the career: solve a problem in computing, reason through a clinical case in medicine, argue a case in law.
4. **Stop and reflect.** At each checkpoint ("a bolinha", the cat's toy), Arandu shows an evidence-based read of what she did and enjoyed. She decides: continue, try another career, or go back to a previous one.
5. **Know herself.** Her profile, "Quem sou eu", fills in over the journey.

The student is not alone. Her **family** and her **school** receive reports on her journey, so they can support her and act when needed. Nobody but the student sees her conversation with Arandu, and every report is built only from what she did and what she can see in her own profile.

## Principles

- **Neutral:** recommendations are never influenced by who pays.
- **Real, cited data:** curricula, entry routes and cut-offs come from public sources, with links and editions. Facts only, never copied prose.
- **Transparent:** no hidden inferences about the student reach her family or school.
- **Synthetic data in the demo:** no real personal data is used (Hack Brasil rule 6.9).

## Repository

A Turborepo monorepo on npm workspaces (`docs/adr/0003-backend-architecture-and-monorepo.md`).

| Path | What it is |
|---|---|
| `apps/web` | The Next.js landing, deployed on Vercel (`docs/adr/0001-web-landing-stack-and-architecture.md`) |
| `apps/api` | The NestJS API, the only door to the data (deployed on Render) |
| `apps/engine` | The Python ingestion engine that keeps the public data up to date |
| `packages/contracts` | The API's response types, shared by `api` and `web` (the book contract: `docs/adr/0004-profession-book-contract-and-ingestion-scope.md`) |
| `packages/db-types` | Types generated from the database schema |
| `supabase/` | Migrations and database tests, the only place the schema changes |

```sh
npm install           # every workspace, from the root
npm run dev           # the landing and the API
npm run build         # lint, typecheck and test work the same way
npx supabase start    # local database (needs Docker); npx supabase test db runs its tests
npm run db:types      # regenerate packages/db-types from the local database
```

Copy `.env.example` to `.env` for the Supabase project values; `.env` is never committed.

Before each merge (there is no CI), run `npm run check`: build, typecheck, lint and tests of every workspace, the landing's tokens check and the database tests.

### Deploy

| Surface | Where | How |
|---|---|---|
| `apps/web` | Vercel | Import the repo with Root Directory `apps/web`; keep "skip unaffected projects" on |
| `apps/api` | Render (Virginia) | Create a Blueprint from `render.yaml` |
| Database | Supabase (`us-east-1`) | Before merging a migration: `npx supabase db push --remote="postgresql://postgres.<ref>:<password>@<pooler host>:5432/postgres"` |

### Landing (`apps/web`)

- `src/app` holds the routes only; code is grouped by business area (`src/landing`, `src/design-system`).
- `src/design-system/tokens.json` is the design system's tokens file, copied as it is. `npm run tokens` regenerates `tokens.css` from it, and `npm run tokens:check` fails when that file is out of date.
- Tailwind's default palette, type scale, spacing, radii and shadows are switched off: only token utilities exist (`bg-surface`, `text-text-muted`, `p-3`, `rounded-card`, `type-h1`).
- `npm run lint` blocks raw design values in the app: hex and rgb colors, px and rem lengths, Tailwind arbitrary values and inline styles.

## Status

Early stage. The product design is in [`docs/01-product-design.md`](docs/01-product-design.md). The landing runs; the data layer is in progress (`docs/plans/0001-data-layer.md`); the app itself is not built yet.

## License

To be defined before the final submission.
