import type {
  Book,
  BookSummary,
  Offering,
  OwnBook,
  StoryPage,
  SampleSubject,
  Source,
} from '@arandu/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { SQL, type Sql } from '../platform/database/database.module.js';

/** The book is small, two pages and a short carousel: the owner caps it at 3 institutions. */
export const BOOK_OFFERINGS = 3;

/** FIAP (INEP code 852): the owner's decision, it is always in the books of the professions it offers. */
const FIAP = 852;

/** One rule for the sample: a first-semester subject (term 1, or year 1 without a term) whose discipline has topics. */
const sampleSubject = (cs: string, d: string) =>
  `${d}.topics is not null and (${cs}.term = 1 or (${cs}.term is null and ${cs}.year = 1))`;

/** A profession on the shelf: it has a sample subject, the taste of the path. */
const IN_POOL = `exists (
  select 1 from public.courses pc
  join public.curriculum_subjects pcs on pcs.course_id = pc.id
  join public.disciplines pd on pd.id = pcs.discipline_id
  where pc.profession_id = p.id and ${sampleSubject('pcs', 'pd')})`;

/** The book's sample: at most 2 subjects (the contract's 1-2). */
const SAMPLE_SIZE = 2;

/**
 * The one institution a book's sample comes from: among those with a sample subject for the profession ($1), a fixed
 * pick that varies by profession (a hash, not a preference), so the shelf does not open every book with the same one.
 */
const SAMPLE_INSTITUTION = `(
  select d.institution_id from public.disciplines d
  join public.curriculum_subjects cs on cs.discipline_id = d.id
  join public.courses c on c.id = cs.course_id
  join public.professions p on p.id = c.profession_id
  where p.slug = $1 and ${sampleSubject('cs', 'd')}
  group by d.institution_id
  order by md5($1 || ':' || d.institution_id)
  limit 1)`;

/** The first-year mandatory subjects of the profession's courses. Undated subjects (no year, no term) stay out. */
const GRADE = `
  select cs.course_id, cs.source_id, cs.name, cs.term, cs.discipline_id
  from public.curriculum_subjects cs
  join public.courses c on c.id = cs.course_id
  join public.professions p on p.id = c.profession_id
  where p.slug = $1 and coalesce(cs.year, (cs.term + 1) / 2) = 1 and cs.is_elective is not true`;

interface OfferingRow {
  course_id: string;
  /** Null for a FIAP course whose grade is unknown. */
  grade_source_id: string | null;
  institution: string;
  short_name: string | null;
  kind: Offering['institution']['kind'];
  logo_url: string | null;
  logo_license: string | null;
  logo_source_url: string | null;
  photo_url: string | null;
  photo_credit: string | null;
  photo_license: string | null;
  photo_source_url: string | null;
  course: string;
  degree: Offering['course']['degree'];
  duration_years: string | null;
  campus_name: string | null;
  city: string;
  source_label: string;
  source_url: string;
  retrieved_at: Date;
}

interface SourceRow {
  source_label: string;
  source_url: string;
  retrieved_at: Date;
}

// The queries join only sources with a fetch date: every fact shown carries when it was retrieved (ADR-0004).
const source = (row: SourceRow): Source => ({
  label: row.source_label,
  url: row.source_url,
  retrievedAt: row.retrieved_at.toISOString(),
});

/** The shelf's books: each profession, up to 3 of its São Paulo offerings and a taste of its first semester. */
@Injectable()
export class BooksRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  list(): Promise<BookSummary[]> {
    return this.sql<BookSummary[]>`
      select json_build_object('slug', p.slug, 'name', p.name) as profession,
        (select count(*)::int from public.courses c where c.profession_id = p.id) as "offeringCount"
      from public.professions p
      where ${this.sql.unsafe(IN_POOL)}
      order by p.name`;
  }

  /** The book of one profession; null when it is not on the shelf. */
  async book(slug: string): Promise<Book | null> {
    const sql = this.sql;
    const [profession] = await sql<Book['profession'][]>`
      select p.slug, p.name from public.professions p where p.slug = ${slug} and ${sql.unsafe(IN_POOL)}`;
    if (!profession) return null;

    const [rows, sample] = await Promise.all([
      this.offerings(slug),
      this.sample(slug),
    ]);
    const subjects = await sql.unsafe<
      (SourceRow & { course_id: string; source_id: string; name: string })[]
    >(
      `select g.course_id::text as course_id, g.source_id::text as source_id, g.name,
        s.label as source_label, s.url as source_url, s.last_fetched_at as retrieved_at
      from (${GRADE}) g join public.sources s on s.id = g.source_id and s.last_fetched_at is not null
      where g.course_id = any($2::bigint[])
      order by g.term nulls first, g.name`,
      [slug, rows.map((r) => r.course_id)],
    );

    const offerings = rows.map((r): Offering => {
      const grade = subjects.filter(
        (s) => s.course_id === r.course_id && s.source_id === r.grade_source_id,
      );
      return {
        institution: {
          name: r.institution,
          shortName: r.short_name,
          kind: r.kind,
          logo:
            r.logo_url && r.logo_license && r.logo_source_url
              ? {
                  url: r.logo_url,
                  license: r.logo_license,
                  sourceUrl: r.logo_source_url,
                }
              : null,
          photo:
            r.photo_url &&
            r.photo_credit &&
            r.photo_license &&
            r.photo_source_url
              ? {
                  url: r.photo_url,
                  credit: r.photo_credit,
                  license: r.photo_license,
                  sourceUrl: r.photo_source_url,
                }
              : null,
        },
        course: {
          name: r.course,
          degree: r.degree,
          // The census states no shift, and course.source is the census: a grade's shift would be credited to it.
          shift: null,
          durationYears:
            r.duration_years === null ? null : Number(r.duration_years),
          campus: { name: r.campus_name, city: r.city },
          source: source(r),
        },
        // The owner keeps cut-offs out of the book: it is about the career and its first year, not getting in.
        admission: [],
        curriculum: grade.length
          ? {
              years: [
                { year: 1, subjects: [...new Set(grade.map((g) => g.name))] },
              ],
              source: source(grade[0]),
            }
          : null,
      };
    });
    return { profession, offerings, sample };
  }

  /**
   * Up to 3 institutions, one offering each and never repeated (owner's decision): fewer when fewer qualify. Only
   * institutions with a real photo (owner's decision), filtered before the cap so the next one fills the slot. An
   * offering has a real first-year grade, FIAP's even without one. Neutral order, no institution pays for its place:
   * the sample's institution first, then FIAP, then alphabetical by institution and city. An institution's offering is its sample course, else one with a grade, else by city. A course with two
   * grades (one per shift) shows the one holding the sample subjects, else the first.
   */
  private offerings(slug: string): Promise<OfferingRow[]> {
    return this.sql.unsafe<OfferingRow[]>(
      `with grade as (${GRADE}),
      course_grade as (
        (select distinct on (g.course_id) g.course_id, g.source_id,
          exists (
            select 1 from public.curriculum_subjects scs
            join public.disciplines sd on sd.id = scs.discipline_id
            where scs.course_id = g.course_id and ${sampleSubject('scs', 'sd')}
          ) as sample
        from grade g
        left join public.disciplines d on d.id = g.discipline_id and d.topics is not null
        order by g.course_id, (d.id is not null) desc, g.source_id)
        union all
        -- FIAP is in the book even where its grade is unknown: then it shows no subjects.
        select c.id, null, false from public.courses c
        join public.professions p on p.id = c.profession_id
        join public.institutions i on i.id = c.institution_id
        where p.slug = $1 and i.inep_code = ${FIAP}
          and not exists (select 1 from grade g where g.course_id = c.id)
      ),
      ranked as (
        select cg.*, c.institution_id, c.city, i.name, i.inep_code = ${FIAP} as fiap,
          row_number() over (partition by c.institution_id order by cg.sample desc, cg.source_id is null, c.city, cg.course_id
          ) as nth
        from course_grade cg
        join public.courses c on c.id = cg.course_id
        join public.institutions i on i.id = c.institution_id
        -- The same fields the photo object needs: a book never shows a university without its own photo.
        where i.photo_url is not null and i.photo_credit is not null and i.photo_license is not null
          and i.photo_source_url is not null
      ),
      picked as (
        select ranked.*, institution_id = ${SAMPLE_INSTITUTION} as lead from ranked
        where nth = 1
        order by lead desc nulls last, fiap desc, name, city, course_id
        -- shortcut: the cap applies before the fetch-date joins, so an unfetched source can leave fewer than 3 (none
        -- today); filter sources here if the engine ever writes facts before stamping their fetch date.
        limit $2
      )
      select k.course_id::text as course_id, k.source_id::text as grade_source_id,
        i.name as institution, i.short_name, i.kind, i.logo_url, i.logo_license, i.logo_source_url, i.photo_url,
        i.photo_credit, i.photo_license, i.photo_source_url, c.name as course, c.degree, c.duration_years,
        c.campus_name, c.city, s.label as source_label, s.url as source_url, s.last_fetched_at as retrieved_at
      from picked k
      join public.courses c on c.id = k.course_id
      join public.institutions i on i.id = c.institution_id
      join public.sources s on s.id = c.source_id and s.last_fetched_at is not null
      order by k.lead desc nulls last, k.fiap desc, k.name, k.city, k.course_id`,
      [slug, BOOK_OFFERINGS],
    );
  }

  /** The sample subjects, the taste of the path: all from the one institution SAMPLE_INSTITUTION picks. */
  private async sample(slug: string): Promise<SampleSubject[]> {
    const rows = await this.sql.unsafe<
      (SourceRow & Omit<SampleSubject, 'source'>)[]
    >(
      `select d.name, d.topics, coalesce(i.short_name, i.name) as institution,
        s.label as source_label, s.url as source_url, s.last_fetched_at as retrieved_at
      from public.disciplines d
      join public.institutions i on i.id = d.institution_id
      join public.sources s on s.id = d.source_id and s.last_fetched_at is not null
      where d.institution_id = ${SAMPLE_INSTITUTION} and exists (
        select 1 from public.curriculum_subjects cs
        join public.courses c on c.id = cs.course_id
        join public.professions p on p.id = c.profession_id
        where cs.discipline_id = d.id and p.slug = $1 and ${sampleSubject('cs', 'd')}
      )
      order by d.name
      limit $2`,
      [slug, SAMPLE_SIZE],
    );
    return rows.map(({ name, topics, institution, ...row }) => ({
      name,
      topics,
      institution,
      source: source(row),
    }));
  }

  /** A landing's own book, its pages in reading order. Only an https link is served: the page renders it as a link. */
  async ownBook(book: OwnBook['book']): Promise<OwnBook> {
    const rows = await this.sql<
      {
        page: number;
        title: string;
        figure: string | null;
        text: string | null;
        source_label: string | null;
        source_url: string | null;
        verified_on: Date | null;
      }[]
    >`select p.page, p.title, f.figure, f.text, f.source_label, f.source_url, f.verified_on
      from public.story_pages p
      left join public.story_facts f on f.book = p.book and f.page = p.page
      where p.book = ${book}
      order by p.page, f.position`;
    const pages: (StoryPage & { n: number })[] = [];
    for (const row of rows) {
      if (pages.at(-1)?.n !== row.page)
        pages.push({ n: row.page, title: row.title, facts: [] });
      if (row.text === null) continue; // a page with no facts yet
      pages.at(-1)!.facts.push({
        figure: row.figure,
        text: row.text,
        source: row.source_label
          ? {
              label: row.source_label,
              url: row.source_url?.startsWith('https://')
                ? row.source_url
                : null,
              verifiedOn: row.verified_on!.toISOString().slice(0, 10),
            }
          : null,
      });
    }
    // Every book is seeded with its pages: none is a data error, not an empty book.
    if (!pages.length) throw new Error(`Own book "${book}" has no pages`);
    return { book, pages: pages.map(({ title, facts }) => ({ title, facts })) };
  }
}
