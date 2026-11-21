import type { CareerOption, Source } from '@arandu/contracts';
import { Inject, Injectable } from '@nestjs/common';
import {
  type InstitutionRow,
  toInstitution,
} from '../books/books.repository.js';
import { SQL, type Sql } from '../platform/database/database.module.js';

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

/** A career Arandu can recommend: it has a real first-term curriculum somewhere, so its path can be lived. */
export type Career = Omit<CareerOption, 'reason'>;

/** The career catalog: professions, where they are offered and their real first-term curricula. */
@Injectable()
export class CareersRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  /** The careers with a real first-term curriculum. */
  async withFirstTerm(): Promise<Career[]> {
    const sql = this.sql;
    const rows = await sql<
      (InstitutionRow & {
        slug: string;
        name: string;
        course_id: number;
        course: string;
        city: string;
      })[]
    >`
      select p.slug, p.name, c.id::int as course_id, c.name as course, c.city, i.name as institution, i.short_name, i.kind,
        i.logo_url, i.logo_license, i.logo_source_url, i.photo_url, i.photo_credit, i.photo_license, i.photo_source_url
      from public.professions p
      join public.courses c on c.profession_id = p.id
      join public.institutions i on i.id = c.institution_id
      where exists (
        select 1 from public.curriculum_subjects cs
        where cs.course_id = c.id and (cs.term = 1 or (cs.term is null and cs.year = 1))
      )
      order by p.name, coalesce(i.short_name, i.name), c.city, c.id`;

    const careers = new Map<string, Career>();
    for (const row of rows) {
      const { slug, name } = row;
      const career = careers.get(slug) ?? {
        profession: { slug, name },
        offerings: [],
      };
      career.offerings.push({
        courseId: row.course_id,
        course: row.course,
        institution: toInstitution(row),
        city: row.city,
      });
      careers.set(slug, career);
    }
    return [...careers.values()];
  }

  /** The profession and its courses' first-term subjects; null when no profession has that slug. */
  async firstTerm(slug: string): Promise<ProfessionFirstTerm | null> {
    const sql = this.sql;
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
}
