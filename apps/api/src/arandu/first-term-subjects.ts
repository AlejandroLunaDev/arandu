import type { Source } from '@arandu/contracts';
import type { Sql } from '../database.module.js';

/** One course's first-term subjects in one shift, as one curriculum source publishes them. */
export interface CourseFirstTerm {
  institution: string;
  course: string;
  city: string;
  /** A course can publish one grade per shift (USP Administração: integral and noturno). Null: the source states none. */
  shift: string | null;
  /** True when the source groups by year only (FIAP): the subjects are the whole first year. */
  wholeYear: boolean;
  subjects: {
    name: string;
    hours: number | null;
    isElective: boolean | null;
  }[];
  source: Source;
}

export interface ProfessionFirstTerm {
  name: string;
  courses: CourseFirstTerm[];
}

interface Row {
  course_id: string;
  institution: string;
  course: string;
  city: string;
  shift: string | null;
  term: number | null;
  subject: string;
  hours: string | null;
  is_elective: boolean | null;
  source_label: string;
  source_url: string;
  retrieved_at: Date;
}

/** The profession and its courses' first-term subjects; null when no profession has that slug. */
export async function findFirstTermSubjects(
  sql: Sql,
  slug: string,
): Promise<ProfessionFirstTerm | null> {
  const [profession] = await sql<
    { name: string }[]
  >`select name from public.professions where slug = ${slug}`;
  if (!profession) return null;

  // First term: term 1 (a range like 'Semestres 1 - 3' starts there too), or year 1 when the source states no term.
  const rows = await sql<Row[]>`
    select c.id as course_id, coalesce(i.short_name, i.name) as institution, c.name as course, c.city,
      cs.shift, cs.term, cs.name as subject, cs.hours, cs.is_elective,
      s.label as source_label, s.url as source_url, s.last_fetched_at as retrieved_at
    from public.professions p
    join public.courses c on c.profession_id = p.id
    join public.institutions i on i.id = c.institution_id
    join public.curriculum_subjects cs on cs.course_id = c.id
    join public.sources s on s.id = cs.source_id
    where p.slug = ${slug} and (cs.term = 1 or (cs.term is null and cs.year = 1))
    order by institution, c.city, c.id, cs.shift, cs.is_elective nulls last, cs.name`;

  const courses = new Map<string, CourseFirstTerm>();
  for (const row of rows) {
    const key = [row.course_id, row.shift, row.source_url].join(' ');
    let course = courses.get(key);
    if (!course) {
      course = {
        institution: row.institution,
        course: row.course,
        city: row.city,
        shift: row.shift,
        wholeYear: row.term === null,
        subjects: [],
        source: {
          label: row.source_label,
          url: row.source_url,
          retrievedAt: row.retrieved_at.toISOString(),
        },
      };
      courses.set(key, course);
    }
    course.subjects.push({
      name: row.subject,
      hours: row.hours === null ? null : Number(row.hours),
      isElective: row.is_elective,
    });
  }
  return { name: profession.name, courses: [...courses.values()] };
}
