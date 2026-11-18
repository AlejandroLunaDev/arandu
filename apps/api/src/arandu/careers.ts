import type { CareerOption } from '@arandu/contracts';
import type { Sql } from '../database.module.js';

export type Career = Omit<CareerOption, 'reason'>;

/** The careers Arandu can recommend: those with a real first-term curriculum somewhere, so their path can be lived. */
export async function findCareers(sql: Sql): Promise<Career[]> {
  const rows = await sql<
    { slug: string; name: string; institution: string; city: string }[]
  >`
    select distinct p.slug, p.name, coalesce(i.short_name, i.name) as institution, c.city
    from public.professions p
    join public.courses c on c.profession_id = p.id
    join public.institutions i on i.id = c.institution_id
    where exists (
      select 1 from public.curriculum_subjects cs
      where cs.course_id = c.id and (cs.term = 1 or (cs.term is null and cs.year = 1))
    )
    order by p.name, institution, c.city`;

  const careers = new Map<string, Career>();
  for (const { slug, name, institution, city } of rows) {
    const career = careers.get(slug) ?? {
      profession: { slug, name },
      offerings: [],
    };
    career.offerings.push({ institution, city });
    careers.set(slug, career);
  }
  return [...careers.values()];
}
