# ADR-0004: Profession book contract and first ingestion scope

- Status: accepted; its São Paulo state scope is superseded by ADR-0007
- Date: 2026-11-17
- Decided by: Alejandro (owner), with the data squad ingeniero

## Context

The landing's shelves hold books. Each book is a profession: a degree course, a tecnólogo, and so on. The shelf shows a sample of professions that rotates over time. Opening a book lists the São Paulo institutions that offer that profession, each on a page like the phone screen in the hero: photo, logo, how to get in with its cut-off, and the first-year subjects when they are known.

The owner's rule: **no invented data, ever.** A fact that is not in a source is not shown.

The research behind the sources is in the owner's research notes of 2026-11-12 (`04-sp-data-mapping-summary.md` and `data-mapping/`). They are kept outside this repository for now. The scope is São Paulo state only.

Institution logos are shown: the owner decided this on 2026-11-13 (product docs, commit `0f487fb` on `squad/diseno`). Earlier lines in the product docs that rule logos out are superseded.

## Decisions

### The book contract

`GET` one book returns this shape. The types live in `packages/contracts`; the API validates each response at runtime with its DTOs.

```json
{
  "profession": { "slug": "psicologia", "name": "Psicologia" },
  "offerings": [
    {
      "institution": {
        "name": "Universidade Federal de São Paulo",
        "shortName": "Unifesp",
        "kind": "public",
        "logo": { "url": "...", "license": "Public domain", "sourceUrl": "..." },
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
            {
              "edition": "1-2024",
              "metric": "final_cutoff",
              "callNumber": null,
              "scholarship": null,
              "quota": "AC",
              "quotaLabel": "Ampla concorrência",
              "score": 752.40
            }
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
| Missing data | `institution.shortName`, `logo`, `photo`, `course.degree`, `course.shift`, `course.durationYears`, `campus.name` and `curriculum` may be `null`; `admission` may be empty. The UI hides what is missing. There are no fallback values |
| Sources | Every fact carries its source URL and retrieval date |
| Scores | `score` is a number; the UI formats it (`752,40`). Cut-offs are ordered oldest edition first |
| Scales | `scale` is `enem`, `fuvest` or `prouni`. Scores of different scales are never compared. A ProUni score is a scholarship cut-off and is labelled that way |
| Metrics | `metric` is `final_cutoff`, `first_call_min` or `phase1_min`. Fuvest's `phase1_min` is in points out of 90; the others are out of 1000. A `first_call_min` is labelled as the first call's minimum, never as the cut-off, because later calls lower it. Scores of different metrics are never compared |
| Calls and scholarships | `callNumber` is set for Fuvest and ENEM-USP lists, otherwise `null`. `scholarship` is `integral` or `parcial` for ProUni, otherwise `null` |
| Curriculum | The database keeps subjects per term; the book groups them by year |
| Photos and logos | From Wikimedia Commons, with licence and source, or `null`. A photo also carries its author |
| Rotation | The API lists the professions with enough real data; the web picks which to show |

### Professions and their categories

Decided by the owner on 2026-11-17, after checking the 2024 census.

- A profession is one INEP CINE course label (`CO_CINE_ROTULO`, `NO_CINE_ROTULO`), with the code and name exactly as INEP publishes them. Every institution that offers it shares that code, which is what links a course to its profession.
- Professions are grouped by CINE's three area levels, also as published: área geral (10 in SP), específica (34) and detalhada (79). The future student enters through these categories.
- A teacher-training label is its own profession: "Biologia formação de professor" sits under Educação, apart from "Biologia".
- Some shelf names are categories, not professions: Engenharia covers 44 labels in SP, Letras 24 and Design 7.

### First ingestion scope

The professions already on the shelf: Psicologia, Medicina, Engenharia, Letras, Filosofia, Economia, Biologia, História, Design, Música.

This replaces the product docs' first draft, which had the engine cover every course of the 8 demo institutions, curricula included (owner's decision, 2026-11-17).

| Data | Source | Covers |
|---|---|---|
| Offerings | INEP Censo da Educação Superior 2024 microdata (official ZIP, no scraping) | Every in-person course in SP |
| Cut-offs | MEC public Power BI behind `acessounico.mec.gov.br/busca` | SISU 1-2020 to 1-2024 (Unifesp, UFSCar, UFABC, IFSP, Famema; USP up to 2022), ProUni 1-2023 to 2-2026 |
| Cut-offs | Fuvest and ENEM-USP PDFs, per chamada | USP |
| Curricula | USP JupiterWeb, Unifesp, Mackenzie, FIAP | Subjects per term (FIAP: per year) |
| Photos and logos | Wikimedia Commons | Where a file exists |

**Out of this scope:**
- Collecting from institutions that block it: Unicamp, Unesp, FMU, Cruzeiro do Sul, UNICID, Anhanguera. Their courses still appear in the books, because they come from the INEP census; their cut-offs and curricula need permission or a data partnership.
- SISU 2025 and 2026, which need a gov.br login.
- The other curricula (UFABC, UFSCar, IFSP, São Judas and Anhembi), for a later batch.

### Engine behaviour

- Sources and their schedules live in the database. Every run is logged with its status, errors and row counts.
- Each fetched document is stored with a content hash, so an unchanged document is not parsed again.
- There is one adapter per source, tested against saved fixtures.
- Writes are idempotent upserts.
- A run that returns far fewer rows than the last one raises an alert: the source probably changed its format.

## Consequences

- The hero phone shows mock figures. They are replaced with real data, and its source label links the exact URL the figures come from.
- Most offerings show no curriculum in this first batch.
- The 2024 census may list courses that are no longer offered; it has no status column.

## Open points

- Terms of use, checked on 2026-11-17 (research, not legal advice). Nothing read forbids taking facts with a citation:
  - MEC, INEP and gov.br pages are CC BY-ND 3.0, and Decreto 8.777/2016 makes data the federal Executive publishes free to use.
  - The Power BI report warns that heavy use locks it for a while, so the engine queries it slowly. Microsoft's Power BI terms of service could not be read (HTTP 403).
  - USP forbids reproducing its portal content without written authorization; JupiterWeb and Fuvest publish no terms. Only facts are taken.
  - Mackenzie and FIAP publish no terms page. Unifesp's pages returned HTTP 403, so its terms are unread.
  - Wikimedia allows reuse under each file's licence, crediting the author, and requires bots to send a User-Agent with contact details.
- The order of offerings inside a book. It must be neutral: no institution pays for placement.
- How many institutions have a usable photo and logo on Commons.
