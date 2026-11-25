import postgres from 'postgres';
import { PathsRepository } from '../paths/paths.repository.js';
import { CareersRepository } from './careers.repository.js';

// Integration, against the real database (the owner's rule: no local stack). Skipped without TEST_DATABASE_URL. It
// only writes rows it creates itself (slugs "tc-*", INEP codes 9980000+, sources of adapter "careers_test") and
// removes them at the end. Its namespaces differ from the books spec's, which runs in parallel.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('One content per career (database)', () => {
  const sql = postgres(url ?? '', { max: 2, onnotice: () => {} });
  const careers = new CareersRepository(sql);
  const paths = new PathsRepository(sql);
  let seq = 0;

  const cleanup = async () => {
    await sql`delete from public.courses where inep_code between 99800000 and 99899999`;
    await sql`delete from public.disciplines where source_id in (select id from public.sources where adapter = 'careers_test')`;
    await sql`delete from public.professions where slug like 'tc-%'`;
    await sql`delete from public.institutions where inep_code between 9980000 and 9989999`;
    await sql`delete from public.sources where adapter = 'careers_test'`;
  };

  const source = async (label: string, fetched = true) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.sources (adapter, url, label, last_fetched_at)
      values ('careers_test', ${`https://example.test/careers/${label.replaceAll(' ', '-')}`}, ${label}, ${fetched ? '2026-01-02T03:04:05Z' : null})
      returning id::text`;
    return row!.id;
  };

  const institution = async (inep: number, short: string, base: string) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.institutions (inep_code, name, short_name, kind, source_id)
      values (${inep}, ${`${short} University`}, ${short}, 'public', ${base}) returning id::text`;
    return row!.id;
  };

  let cine = 0;
  const profession = async (slug: string, area: string) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.professions (slug, name, cine_code)
      values (${slug}, ${`Test ${slug}`}, ${`${area}Z${String(++cine).padStart(2, '0')}`}) returning id::text`;
    return row!.id;
  };

  const course = async (
    prof: string,
    inst: string,
    base: string,
    name: string,
  ) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.courses (inep_code, institution_id, profession_id, name, degree, city, modality, source_id)
      values (${99800000 + ++seq}, ${inst}, ${prof}, ${name}, 'bacharelado', 'Sao Paulo', 'presencial', ${base})
      returning id::text`;
    return row!.id;
  };

  /** A discipline with topics: the trigger makes it the one its subject name is taught from. */
  const discipline = async (
    inst: string,
    name: string,
    topics: string[] | null,
    src: string,
  ) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.disciplines (institution_id, code, name, topics, source_id)
      values (${inst}, ${`TC${++seq}`}, ${name}, ${topics}, ${src}) returning id::text`;
    return row!.id;
  };

  const grid = async (courseId: string, src: string, names: string[]) => {
    await sql`insert into public.curriculum_subjects ${sql(
      names.map((name) => ({
        course_id: courseId,
        year: 1,
        term: 1,
        name,
        source_id: src,
      })),
    )}`;
  };

  const made = (discipline: string, topics: string[]) =>
    sql`insert into public.chapter_contents ${sql(
      topics.map((text, topic) => ({
        discipline_id: discipline,
        topic,
        topic_text: text,
        content: sql.json({}),
      })),
    )}`;

  beforeAll(async () => {
    await cleanup();
    const [area] = await sql<{ code: string }[]>`
      select code from public.cine_areas where length(code) = 4 limit 1`;
    const base = await source('Base');
    const zeta = await institution(9980001, 'Zeta', base);
    const alpha = await institution(9980002, 'Alpha', base);
    const beta = await institution(9980003, 'Beta', base);

    // Two grids: the best (two subjects with topics) is held by two zeta courses, the other (one) by an alpha course;
    // a beta course holds none.
    const career = await profession('tc-career', area!.code);
    const best = await source('Best grid');
    const weak = await source('Weak grid');
    const c1 = await course(career, zeta, base, 'c1');
    const c4 = await course(career, zeta, base, 'c4');
    const c2 = await course(career, alpha, base, 'c2');
    await course(career, beta, base, 'c3');
    const a = await discipline(zeta, 'TC Best A', ['a1', 'a2'], base);
    await discipline(zeta, 'TC Best B', ['b1'], base);
    await discipline(alpha, 'TC Weak', ['w1'], base);
    await grid(c1, best, ['TC Best A', 'TC Best B']);
    await grid(c4, best, ['TC Best A', 'TC Best B']);
    await grid(c2, weak, ['TC Weak', 'TC Weak plain']);
    // Only A has its first chapter made: the paths leave B out.
    await made(a, ['a1', 'a2']);

    // A career whose only subject has topics but no chapter made yet: not offered.
    const unmade = await profession('tc-unmade', area!.code);
    await discipline(zeta, 'TC Unmade', ['u1'], base);
    await grid(await course(unmade, zeta, base, 'c5'), await source('Unmade'), [
      'TC Unmade',
    ]);
  }, 120_000);

  afterAll(async () => {
    await cleanup();
    await sql.end();
  }, 120_000);

  describe('paths', () => {
    it('gives every course of the career one path with the career grid’s made subjects, whatever grid the course holds', async () => {
      const result = await paths.careerPaths('tc-career');

      expect(
        result?.paths.map((p) => [p.course, p.shift, p.source.label]).sort(),
      ).toEqual([
        ['c1', null, 'Best grid'],
        ['c2', null, 'Best grid'],
        ['c3', null, 'Best grid'],
        ['c4', null, 'Best grid'],
      ]);
      for (const p of result?.paths ?? [])
        expect(p.subjects.map((s) => [s.name, s.topics])).toEqual([
          ['TC Best A', ['a1', 'a2']],
        ]);
    });

    it('shows a subject code only at the institution that teaches it', async () => {
      const result = await paths.careerPaths('tc-career');
      const code = (course: string) =>
        result?.paths.find((p) => p.course === course)?.subjects[0]!.code;

      expect(code('c1')).toEqual(expect.any(String));
      expect(code('c2')).toBeNull();
    });

    it('answers null for no such profession', async () => {
      expect(await paths.careerPaths('tc-nope')).toBeNull();
    });
  });

  describe('withFirstTerm', () => {
    it('lists every course of a career whose grid has a made first chapter, and no other test career', async () => {
      const mine = (await careers.withFirstTerm()).filter((c) =>
        c.profession.slug.startsWith('tc-'),
      );

      expect(mine.map((c) => c.profession.slug)).toEqual(['tc-career']);
      expect(mine[0]!.offerings.map((o) => o.course).sort()).toEqual([
        'c1',
        'c2',
        'c3',
        'c4',
      ]);
    });
  });

  describe('firstTerm', () => {
    it('gives only the career grid, told once at the first course that holds it', async () => {
      const result = await careers.firstTerm('tc-career');

      expect(result?.courses).toHaveLength(1);
      expect(result?.courses[0]).toMatchObject({
        course: 'c1',
        institution: 'Zeta',
        source: { label: 'Best grid' },
      });
      expect(result?.courses[0]!.subjects.map((s) => s.name)).toEqual([
        'TC Best A',
        'TC Best B',
      ]);
    });

    it('answers null for no such profession', async () => {
      expect(await careers.firstTerm('tc-nope')).toBeNull();
    });
  });
});
