# ADR-0004: Profession book contract and first ingestion scope

- Status: accepted
- Date: 2026-11-17
- Decided by: Alejandro (owner), with the data squad ingeniero

## Context

The landing's shelves hold books. Each book is a profession: a degree course, a tecnólogo, and so on. The shelf shows a sample of professions that rotates over time. Opening a book lists the São Paulo institutions that offer that profession, each on a page like the phone screen in the hero: photo, logo, how to get in with its cut-off, and the first-year subjects when they are known.

The owner's rule: **no invented data, ever.** A fact that is not in a source is not shown.

The research behind the sources is in the product docs (`04-sp-data-mapping-summary.md` and `data-mapping/`, 2026-11-12). The scope is São Paulo state only.

## Decisions

### The book contract

`GET` one book returns this shape (types live in `packages/contracts`):

```json
{
  "profession": { "slug": "psicologia", "name": "Psicologia" },
  "offerings": [
    {
      "institution": {
        "name": "Universidade Federal de São Paulo",
        "shortName": "Unifesp",
        "kind": "public",
        "logo": { "url": "...", "sourceUrl": "..." },
        "photo": { "url": "...", "credit": "...", "license": "CC BY-SA 4.0", "sourceUrl": "..." }
      },
      "course": {
        "name": "Psicologia",
        "degree": "bacharelado",
        "shift": "integral",
        "durationYears": 5,
        "campus": { "name": "...", "city": "..." },
        "source": { "label": "INEP Censo da Educação Superior 2024", "url": "...", "retrievedAt": "..." }
      },
      "admission": [
        {
          "route": "sisu",
          "scale": "enem",
          "source": { "label": "...", "url": "...", "retrievedAt": "..." },
          "cutoffs": [
            { "edition": "1-2024", "quota": "AC", "quotaLabel": "Ampla concorrência", "score": 752.40 }
          ]
        }
      ],
      "curriculum": {
        "years": [{ "year": 1, "subjects": ["..."] }],
        "source": { "label": "...", "url": "...", "retrievedAt": "..." }
      }
    }
  ]
}
```

| Rule | Detail |
|---|---|
| Missing data | `logo`, `photo` and `curriculum` may be `null`; `admission` may be empty. The UI hides what is missing. There are no fallback values |
| Sources | Every fact carries its source URL and retrieval date |
| Scores | `score` is a number; the UI formats it (`752,40`). Cut-offs are ordered oldest edition first |
| Scales | `scale` is `enem`, `fuvest` or `prouni`. Scores of different scales are never compared. A ProUni score is a scholarship cut-off and is labelled that way |
| Curriculum | The database keeps subjects per term; the book groups them by year |
| Photos and logos | From Wikimedia Commons, with real author and licence, or `null` |
| Rotation | The API lists the professions with enough real data; the web picks which to show |

### First ingestion scope

The professions already on the shelf: Psicologia, Medicina, Engenharia, Letras, Filosofia, Economia, Biologia, História, Design.

| Data | Source | Covers |
|---|---|---|
| Offerings | INEP Censo da Educação Superior 2024 microdata (official ZIP, no scraping) | Every in-person course in SP |
| Cut-offs | MEC public Power BI behind `acessounico.mec.gov.br/busca` | SISU 1-2020 to 1-2024 (Unifesp, UFSCar, UFABC, IFSP, Famema; USP up to 2022), ProUni 1-2023 to 2-2026 |
| Cut-offs | Fuvest and ENEM-USP PDFs, per chamada | USP |
| Curricula | USP JupiterWeb, Unifesp, Mackenzie, FIAP | Subjects per term (FIAP: per year) |
| Photos and logos | Wikimedia Commons | Where a file exists |

**Out of this scope:**
- Institutions that block collection: Unicamp, Unesp, FMU, Cruzeiro do Sul, UNICID, Anhanguera. They need permission or a data partnership.
- SISU 2025 and 2026, which need a gov.br login.
- The other curricula (UFABC, UFSCar, IFSP, São Judas and Anhembi), for a later batch.

### Collection rules

- Read robots.txt before every run, and check each source's terms of use before its first run.
- At least 1.5 s between requests to one host, with backoff on 429 and 503. No logins, no captcha bypass, no proxy rotation.
- Store facts only, never institution prose. Store no personal data.

### Engine behaviour

- Sources and their schedules live in the database. Every run is logged with its status, errors and row counts.
- Each fetched document is stored with a content hash, so an unchanged document is not parsed again.
- There is one adapter per source, tested against saved fixtures.
- Writes are idempotent upserts.
- A run that returns far fewer rows than the last one raises an alert: the source probably changed its format.

## Consequences

- The hero phone shows mock figures. They are replaced with real data, and its source label names the real source (the MEC Power BI, not "dados abertos do SISU").
- Most offerings show no curriculum in this first batch.
- The 2024 census may list courses that are no longer offered; it has no status column.

## Open points

- The terms of use of the Power BI, fuvest.br and each institution site: not checked yet. Nothing runs at volume before they are.
- How courses map to a profession. The proposal is INEP's CINE label (`NO_CINE_ROTULO`), not yet tested against the shelf's names.
- The order of offerings inside a book. It must be neutral: no institution pays for placement.
- How many institutions have a usable photo and logo on Commons.
