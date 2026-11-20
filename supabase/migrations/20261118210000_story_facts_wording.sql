-- Review of #23: 76,428 counted curriculum rows, but 53 courses keep one curriculum per shift, so the distinct
-- (course, subject) pairs are 66,717 (real DB, 2026-11-18). The census figures cover the state, not the city.
update public.story_facts f set text = v.text
from (values
  (2, 'instituições de ensino superior com curso presencial no estado de São Paulo.'),
  (3, 'cursos de graduação presenciais no estado de São Paulo.'),
  (5, 'cursos de 24 instituições com a grade curricular real: 66.717 matérias.')
) as v (position, text)
where f.book = 'produto' and f.position = v.position;
