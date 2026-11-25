# ADR-0007: São Paulo city scope, with distance courses

- Status: accepted
- Date: 2026-11-25
- Decided by: Alejandro (owner), with the back-api session

## Context

ADR-0004 set the scope to São Paulo state and kept in-person courses only (`TP_DIMENSAO = 1` in
`apps/engine/src/engine/inep_census.py`). On 2026-11-25 the database was cleared of test data
(`20261125120000_reset_test_data.sql`) so the catalog could be reloaded and checked against its sources. The owner
narrowed the scope for the demo: a smaller area with complete, verified data.

The INEP census 2024 (`microdados_censo_da_educacao_superior_2024.zip`, measured 2026-11-25):

| | São Paulo state | São Paulo city |
|---|---|---|
| In-person degree courses | 7,961 | 2,604 |
| Distance degree courses with students there | 5,940 | 4,392 |
| Institutions with an in-person course | 545 | 155 |

Its data dictionary says of distance courses that it "não é possível quantificar o número de cursos, vagas e
inscritos por (...) Municípios": a distance course is listed once per municipality where it has students
(`TP_DIMENSAO = 2`), with `QT_CURSO = 0` and no campus.

## Decision

- The scope is São Paulo city (`SG_UF = 'SP'`, `NO_MUNICIPIO = 'São Paulo'`). This supersedes ADR-0004's state scope.
- Distance courses are in: `TP_DIMENSAO = 2` rows of the city, stored once each.
- A course carries `modality`, `presencial` or `a_distancia`. A distance course has no city, and the book contract's
  `course.campus` is `null` for it.
- What lies outside the city is deleted and not fetched. The census load deletes the courses and institutions it no
  longer stages, and a curriculum page for another city is not registered (`curricula.load_courses`).
- The UFSCar, UFABC, UMC and IFSP Salto adapters are removed: none of them covers a unit in the city.

## Consequences

- Fewer sources to fetch and fewer PDF pages to convert: 625 of the 720 Fatec sources were outside the city.
- Curricula link only to in-person courses, which have a city, so the careers and paths endpoints keep a non-null
  city. A distance course shows in a book only through FIAP's no-grade rule.
- The landing's figures that speak of the state must be measured again.
