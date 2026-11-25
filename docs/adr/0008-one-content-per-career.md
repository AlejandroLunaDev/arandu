# ADR-0008: One content per career

- Status: accepted
- Date: 2026-11-25
- Decided by: Alejandro (owner), with the back-api session

## Context

ADR-0004 scoped ingestion per institution: each institution's curricula, and its cut-offs. Working that way, the engine
and its linking rules tried to pair every grid page with one exact census course of its institution. On 2026-11-25,
after the reload of São Paulo city (ADR-0007), 141 grids that were fetched and parsed stayed unused for that reason
alone: a grid written "Letras - Bacharelado - Habilitação: Português e Alemão" where the census writes "Letras -
Alemão", a "Ciclo Básico" shared by several courses, or two shifts (integral, noturno) against two census courses with
no shift (`staging.unlinked_curricula`, `supabase/migrations/20261118050000_mec_powerbi.sql`). Effort and fetches went
into institutions instead of careers.

The owner's rule, repeated through the session: the person using Arandu learns a career's subjects. Small differences
between institutions do not matter to that.

## Decision

- The career is the unit of content: one INEP CINE profession (ADR-0004, "Professions and their categories").
- One career has one list of first-semester subjects and one content, for the whole app. Odontologia is one career
  with one content, whichever institutions offer it.
- Institutions and their courses are for display only: who offers the career, where, in which modality, each with its
  own grid when it is known. They are never a reason to fetch or generate content again.
- The career's one content is for the app: building the exercises and Arandu's conversations with the person.
- A career's first-semester subjects come from one complete, real grid of that career that states the term, from any
  institution.
- A subject's content comes from one complete source of its topics (an ementa or programa), found once, stored and
  reused. The same subject is never fetched again, nor compared or merged across institutions.
- A subject is one row for every career that lists it (`public.subjects`,
  `supabase/migrations/20261125160000_subjects.sql`). Names group only when identical after accents, case,
  punctuation, spacing and roman numerals: no word is dropped ("Bioquímica" is not "Bioquímica Celular").
- A grid only has to be linked to its career. Its shift, its habilitação, a "Ciclo Básico" label or how the institution
  spells the course do not decide anything, and no grid is discarded for them.
- Fetching is driven by what a career still lacks: a career with no first-semester grid, or a subject with no topics.
  No full reloads, and nothing already stored is fetched again.
- The product shows no cut-offs (`supabase/migrations/20261125170000_drop_admission_cutoffs.sql`).
- A subject's content is organised as subject → chapters → lessons (one chapter per topic, played as lessons).

## Consequences

- Coverage is measured per career, not per institution. On 2026-11-25, reading only what was already fetched: 256
  careers in São Paulo city, 113 with a first-semester list, 89 of them with at least one subject with topics, 143 with
  no first-semester list yet.
- The linking rules change from "one grid, one exact course" to "one grid, its career": the 141 unused grids become
  usable without fetching anything.
- Fewer fetches and generations: one source per career and per subject, not one per institution.
- A career shows real subjects from one institution's grid; another institution may teach them in a slightly different
  order. This is accepted: the content is the subject, not the institution's timetable.
- A grid links to every course of its institution that carries its name, and `public.career_grids` picks one grid per
  career (`supabase/migrations/20261125180000_grids_by_career.sql`). The API's paths, recommendations, career chat and
  book sample read the career's subjects from it; each offering in a book still shows its own institution's grade.
