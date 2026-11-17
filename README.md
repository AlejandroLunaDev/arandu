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
- **Real, cited data:** curricula, entry routes and cut-offs come from public sources, with links and editions. Facts only, never copied prose or institution logos.
- **Transparent:** no hidden inferences about the student reach her family or school.
- **Synthetic data in the demo:** no real personal data is used (Hack Brasil rule 6.9).

## Landing

The landing is a Next.js app at the repository root (see `docs/adr/0001-web-landing-stack-and-architecture.md`).

```sh
npm install
npm run dev
```

- `src/app` holds the routes only; code is grouped by business area (`src/landing`, `src/design-system`).
- `src/design-system/tokens.json` is the design system's tokens file, copied as it is. `npm run tokens` regenerates `tokens.css` from it, and `npm run tokens:check` fails when that file is out of date.
- Tailwind's default palette, type scale, spacing, radii and shadows are switched off: only token utilities exist (`bg-surface`, `text-text-muted`, `p-3`, `rounded-card`, `type-h1`).
- `npm run lint` blocks raw design values in the app: hex and rgb colors, px and rem lengths, Tailwind arbitrary values and inline styles.
- `npm test` runs the tests.

## Status

Early stage. The product design is in [`docs/01-product-design.md`](docs/01-product-design.md). The landing runs (see above); the app itself is not built yet.

## License

To be defined before the final submission.
