import postgres from 'postgres';
import { BOOK_OFFERINGS, BooksRepository } from './books.repository.js';

// Integration: runs the real SQL against a throwaway database with the catalog migrations applied. It is skipped
// without TEST_DATABASE_URL, and it only ever writes rows it creates itself (slugs "t-*", INEP codes 9990000+).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('BooksRepository (database)', () => {
  const sql = postgres(url ?? '', { max: 2, onnotice: () => {} });
  const repository = new BooksRepository(sql);
  const FIAP = 852;
  let createdFiap = false;
  const createdAreas: string[] = [];
  let seq = 0;
  let professions = 0; // its own counter: cine_code allows only two digits after the letter

  const cleanup = async () => {
    await sql`delete from public.courses where inep_code >= 99900000`;
    await sql`delete from public.professions where slug like 't-%'`;
    await sql`delete from public.institutions where inep_code between 9990000 and 9999999`;
    if (createdFiap)
      await sql`delete from public.institutions where inep_code = ${FIAP}`;
    await sql`delete from public.sources where adapter = 'books_test'`;
    if (createdAreas.length)
      await sql`delete from public.cine_areas where code in ${sql(createdAreas)}`;
  };

  const source = async (label: string, fetched = true) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.sources (adapter, url, label, last_fetched_at)
      values ('books_test', ${`https://example.test/${label.replaceAll(' ', '-')}`}, ${label}, ${fetched ? '2026-01-02T03:04:05Z' : null})
      returning id::text`;
    return row.id;
  };

  interface InstitutionOptions {
    short?: string;
    kind?: string;
    logo?: boolean;
    photo?: boolean;
  }
  const institution = async (
    inep: number,
    name: string,
    base: string,
    o: InstitutionOptions = {},
  ) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.institutions (inep_code, name, short_name, kind, source_id, logo_url, logo_license,
        logo_source_url, photo_url, photo_credit, photo_license, photo_source_url)
      values (${inep}, ${name}, ${o.short ?? null}, ${o.kind ?? 'public'}, ${base},
        ${o.logo ? `https://img.test/${name}.png` : null}, ${o.logo ? 'CC0' : null},
        ${o.logo ? `https://commons.test/${name}` : null},
        ${o.photo ? `https://img.test/${name}.jpg` : null}, ${o.photo ? 'Ana Foto' : null},
        ${o.photo ? 'CC BY' : null}, ${o.photo ? `https://commons.test/photo-${name}` : null})
      on conflict (inep_code) do nothing
      returning id::text`;
    if (row) {
      if (inep === FIAP) createdFiap = true;
      return row.id;
    }
    const [existing] = await sql<
      { id: string }[]
    >`select id::text from public.institutions where inep_code = ${inep}`;
    return existing.id;
  };

  const profession = async (slug: string, name: string) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.professions (slug, name, cine_code)
      values (${slug}, ${name}, ${`0411A${String(++professions).padStart(2, '0')}`})
      returning id::text`;
    return row.id;
  };

  interface CourseOptions {
    city?: string;
    duration?: number;
    campus?: string;
    shift?: string;
    degree?: string;
  }
  const course = async (
    prof: string,
    inst: string,
    base: string,
    name: string,
    o: CourseOptions = {},
  ) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.courses (inep_code, institution_id, profession_id, name, degree, shift, duration_years,
        city, campus_name, source_id)
      values (${99900000 + ++seq}, ${inst}, ${prof}, ${name}, ${o.degree ?? 'bacharelado'}, ${o.shift ?? null},
        ${o.duration ?? null}, ${o.city ?? 'Sao Paulo'}, ${o.campus ?? null}, ${base})
      returning id::text`;
    return row.id;
  };

  const discipline = async (
    inst: string,
    name: string,
    topics: string[] | null,
    src: string,
  ) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.disciplines (institution_id, code, name, topics, source_id)
      values (${inst}, ${`D${++seq}`}, ${name}, ${topics}, ${src})
      returning id::text`;
    return row.id;
  };

  interface Row {
    year: number | null;
    term: number | null;
    name: string;
    elective?: boolean;
    shift?: string | null;
    discipline?: string;
  }
  const subjects = async (courseId: string, src: string, rows: Row[]) => {
    for (const r of rows)
      await sql`
        insert into public.curriculum_subjects (course_id, year, term, name, is_elective, shift, discipline_id,
          source_id)
        values (${courseId}, ${r.year}, ${r.term}, ${r.name}, ${r.elective ?? null}, ${r.shift ?? null},
          ${r.discipline ?? null}, ${src})`;
  };

  /** A first-semester subject, the minimum a course needs to carry a sample. */
  const firstTerm = (name: string, discipline?: string): Row => ({
    year: 1,
    term: 1,
    name,
    discipline,
  });

  let base: string;
  const names = (book: { offerings: { course: { name: string } }[] } | null) =>
    book?.offerings.map((o) => o.course.name);

  beforeAll(async () => {
    await cleanup();
    for (const [code, name, parent] of [
      ['04', 'Test area', null],
      ['041', 'Test group', '04'],
      ['0411', 'Test subgroup', '041'],
    ] as const) {
      const [row] = await sql<{ code: string }[]>`
        insert into public.cine_areas (code, name, parent_code) values (${code}, ${name}, ${parent})
        on conflict (code) do nothing returning code`;
      if (row) createdAreas.unshift(row.code);
    }
    base = await source('Base');

    const zeta = await institution(9990001, 'Zeta Univ', base, {
      short: 'ZU',
      kind: 'public',
    });
    const alpha = await institution(9990002, 'Alpha Univ', base, {
      kind: 'private',
    });
    const beta = await institution(9990003, 'Beta Univ', base, {
      logo: true,
    });
    const carl = await institution(9990004, 'Carl Univ', base);
    const echo = await institution(9990005, 'Echo Univ', base, {
      photo: true,
      kind: 'special',
    });
    const fiap = await institution(FIAP, 'FIAP', base);

    // One sample discipline per test profession: the pool needs it, and the course holding it is "the sample's own".
    const sampleCourse = async (
      prof: string,
      name = 'sample',
      o: CourseOptions = {},
    ) => {
      const disc = await discipline(
        zeta,
        `Disc ${prof}`,
        ['Topic one'],
        await source(`Disc ${prof}`),
      );
      const id = await course(prof, zeta, base, name, o);
      await subjects(id, base, [firstTerm('Sample subject', disc)]);
      return id;
    };
    /** A course with one first-year mandatory subject: a candidate for the book. */
    const candidate = async (
      prof: string,
      inst: string,
      name: string,
      o: CourseOptions = {},
    ) => {
      const id = await course(prof, inst, base, name, o);
      await subjects(id, base, [firstTerm(`Intro ${name}`)]);
      return id;
    };

    // Ordering and picking: the sample's course, then FIAP, then images, then names. 3 of 6 institutions.
    const main = await profession('t-main', 'Test Main');
    await sampleCourse(main, 'zeta1', {
      city: 'Sao Paulo',
      duration: 4,
      campus: 'Campus Z',
      degree: 'bacharelado',
    });
    await candidate(main, alpha, 'alpha1');
    await course(main, alpha, base, 'alpha-no-grade');
    await candidate(main, beta, 'beta1');
    const betaElective = await course(main, beta, base, 'beta-elective');
    await subjects(betaElective, base, [
      { year: 1, term: 1, name: 'Opt', elective: true },
    ]);
    await candidate(main, echo, 'echo1');
    await course(main, fiap, base, 'fiap1');

    const order = await profession('t-order', 'Test Order');
    await sampleCourse(order);
    await candidate(order, alpha, 'alpha');
    await candidate(order, beta, 'beta-logo');
    await candidate(order, carl, 'carl');
    await candidate(order, echo, 'echo-photo');

    const byName = await profession('t-name', 'Test Name');
    await sampleCourse(byName);
    await candidate(byName, carl, 'carl');
    await candidate(byName, alpha, 'alpha');
    await candidate(
      byName,
      await institution(9990006, 'Delta Univ', base),
      'delta',
    );

    const secondA = await profession('t-second-a', 'Test Second A');
    await sampleCourse(secondA);
    await candidate(secondA, alpha, 'alpha-campinas', { city: 'Campinas' });
    await candidate(secondA, alpha, 'alpha-bauru', { city: 'Bauru' });
    await candidate(secondA, carl, 'carl');

    const secondB = await profession('t-second-b', 'Test Second B');
    await sampleCourse(secondB);
    await candidate(secondB, alpha, 'alpha-campinas', { city: 'Campinas' });
    await candidate(secondB, alpha, 'alpha-bauru', { city: 'Bauru' });

    const fiapNoGrade = await profession('t-fiap-empty', 'Test Fiap Empty');
    await sampleCourse(fiapNoGrade);
    await course(fiapNoGrade, fiap, base, 'fiap-sp', { city: 'Sao Paulo' });
    await course(fiapNoGrade, fiap, base, 'fiap-campinas', {
      city: 'Campinas',
    });

    const fiapGrade = await profession('t-fiap-grade', 'Test Fiap Grade');
    await sampleCourse(fiapGrade);
    await course(fiapGrade, fiap, base, 'fiap-empty-campinas', {
      city: 'Campinas',
    });
    await candidate(fiapGrade, fiap, 'fiap-grade-sp', { city: 'Sao Paulo' });

    // One grade source: the one holding a sample discipline, else the lowest source id.
    const gradeA = await source('Grade A');
    const gradeB = await source('Grade B');
    const grade = await profession('t-grade', 'Test Grade');
    const sampleDisc = await discipline(zeta, 'Sample Disc', ['x'], gradeB);
    const zg = await course(grade, zeta, base, 'zg');
    await subjects(zg, gradeA, [
      { year: 1, term: 1, name: 'From A', shift: 'noturno' },
    ]);
    await subjects(zg, gradeB, [
      { ...firstTerm('Sample Disc', sampleDisc), shift: 'integral' },
      { year: 1, term: 1, name: 'Beta', shift: 'integral' },
      { year: 1, term: 1, name: 'Alpha', shift: 'integral' },
      { year: 1, term: 2, name: 'Alpha', shift: 'integral' },
      { year: 1, term: 2, name: 'Aaa', shift: 'integral' },
      {
        year: 1,
        term: 3,
        name: 'Elective',
        elective: true,
        shift: 'integral',
      },
      { year: 2, term: 3, name: 'Second year', shift: 'integral' },
      { year: null, term: null, name: 'Undated', shift: 'integral' },
    ]);
    const ag = await course(grade, alpha, base, 'ag');
    await subjects(ag, gradeB, [{ year: 1, term: 1, name: 'B only' }]);
    await subjects(ag, gradeA, [{ year: 1, term: 1, name: 'A only' }]);
    // year null, term 2 is still the first year: coalesce(year, (term + 1) / 2).
    await subjects(ag, gradeA, [{ year: null, term: 2, name: 'Term two' }]);

    // The grade's shift only when every one of its rows shares one value of the four.
    const shiftA = await profession('t-shift-a', 'Test Shift A');
    const sz = await sampleCourse(shiftA, 'same-value', { shift: 'matutino' });
    await sql`update public.curriculum_subjects set shift = 'Noturno' where course_id = ${sz}`;
    await subjects(sz, base, [
      { year: 1, term: 2, name: 'More', shift: 'NOTURNO' },
    ]);
    const mixed = await course(shiftA, alpha, base, 'two-values');
    await subjects(mixed, base, [
      { year: 1, term: 1, name: 'M1', shift: 'noturno' },
      { year: 1, term: 2, name: 'M2', shift: 'integral' },
    ]);
    const unknown = await course(shiftA, carl, base, 'unknown-value');
    await subjects(unknown, base, [
      { year: 1, term: 1, name: 'U1', shift: 'manha' },
    ]);

    const shiftB = await profession('t-shift-b', 'Test Shift B');
    await sampleCourse(shiftB, 'all-null');
    const some = await course(shiftB, echo, base, 'null-and-value');
    await subjects(some, base, [
      { year: 1, term: 1, name: 'S1', shift: 'noturno' },
      { year: 1, term: 2, name: 'S2', shift: null },
    ]);
    const column = await course(shiftB, beta, base, 'course-column-only', {
      shift: 'vespertino',
    });
    await subjects(column, base, [{ year: 1, term: 1, name: 'C1' }]);

    // The sample.
    const sample = await profession('t-sample', 'Test Sample');
    const dz = await discipline(
      zeta,
      'Zoologia',
      ['Zeta last', 'Alpha first', 'Mid'],
      await source('Src Z'),
    );
    const da = await discipline(
      alpha,
      'Anatomia',
      ['A1', 'A2'],
      await source('Src A'),
    );
    const dNull = await discipline(zeta, 'No topics', null, base);
    const dTwo = await discipline(zeta, 'Term two only', ['T'], base);
    const dUndated = await discipline(carl, 'Undated term', ['U'], base);
    const other = await profession('t-sample-other', 'Test Sample Other');
    const dOther = await discipline(zeta, 'Other profession', ['O'], base);
    const sc1 = await course(sample, zeta, base, 'sc1');
    await subjects(sc1, base, [
      firstTerm('Zoologia', dz),
      firstTerm('No topics', dNull),
      { year: 1, term: 2, name: 'Term two only', discipline: dTwo },
    ]);
    const sc2 = await course(sample, alpha, base, 'sc2');
    await subjects(sc2, base, [firstTerm('Anatomia', da)]);
    const sc3 = await course(sample, carl, base, 'sc3');
    await subjects(sc3, base, [
      firstTerm('Anatomia', da),
      { year: 1, term: null, name: 'Undated', discipline: dUndated },
    ]);
    const oc = await course(other, zeta, base, 'oc');
    await subjects(oc, base, [firstTerm('Other', dOther)]);
    // Three linked first-semester disciplines: the sample keeps the first two by name.
    const cap = await profession('t-sample-cap', 'Test Sample Cap');
    const capCourse = await course(cap, zeta, base, 'cap');
    await subjects(capCourse, base, [
      firstTerm('Cap C', await discipline(zeta, 'Cap C', ['C'], base)),
      firstTerm(
        'Cap A',
        await discipline(
          zeta,
          'Cap A',
          ['Zeta last', 'Alpha first', 'Mid'],
          await source('Src Cap'),
        ),
      ),
      firstTerm('Cap B', await discipline(zeta, 'Cap B', ['B'], base)),
    ]);

    // The sample flag follows the shared rule: term 2 does not make a course the sample, a term-1 elective does.
    const flagTerm2 = await profession('t-flag-term2', 'Test Flag Term Two');
    await sampleCourse(flagTerm2, 'pool');
    await candidate(flagTerm2, alpha, 'a-plain');
    const cTerm2 = await candidate(flagTerm2, carl, 'c-term2');
    await subjects(cTerm2, base, [
      {
        year: 1,
        term: 2,
        name: 'Linked',
        discipline: await discipline(carl, 'Flag term 2', ['T'], base),
      },
    ]);
    const flagElective = await profession(
      't-flag-elective',
      'Test Flag Elective',
    );
    await sampleCourse(flagElective, 'pool');
    await candidate(flagElective, alpha, 'a-plain');
    const cElective = await candidate(flagElective, carl, 'c-elective');
    await subjects(cElective, base, [
      {
        year: 1,
        term: 1,
        name: 'Linked',
        elective: true,
        discipline: await discipline(carl, 'Flag elective', ['E'], base),
      },
    ]);

    // A profession with courses but no sample subject at all.
    const noSample = await profession('t-no-sample', 'Test No Sample');
    await subjects(await course(noSample, zeta, base, 'ns'), base, [
      firstTerm('Plain'),
    ]);

    // The pool.
    const pool = async (
      slug: string,
      name: string,
      row: (d: string) => Row,
      topics: string[] | null = ['T'],
    ) => {
      const id = await profession(slug, name);
      const disc = await discipline(zeta, `Pool ${slug}`, topics, base);
      await subjects(await course(id, zeta, base, `${slug}-course`), base, [
        row(disc),
      ]);
    };
    await pool('t-pool-term-null', 'Test Pool Undated Term', (d) => ({
      year: 1,
      term: null,
      name: 'S',
      discipline: d,
    }));
    await pool('t-pool-term-two', 'Test Pool Term Two', (d) => ({
      year: 1,
      term: 2,
      name: 'S',
      discipline: d,
    }));
    await pool('t-pool-year-two', 'Test Pool Year Two', (d) => ({
      year: 2,
      term: null,
      name: 'S',
      discipline: d,
    }));
    await pool(
      't-pool-no-topics',
      'Test Pool No Topics',
      (d) => firstTerm('S', d),
      null,
    );
    await pool('t-pool-undisciplined', 'Test Pool No Discipline', () =>
      firstTerm('S'),
    );
    await profession('t-pool-no-courses', 'Test Pool No Courses');

    // A source never fetched has no date to show: what it backs is left out, never a crash.
    const unfetched = await profession('t-unfetched', 'Test Unfetched');
    await sampleCourse(unfetched);
    const staleSource = await source('Unfetched', false);
    const staleDisc = await discipline(zeta, 'Stale disc', ['S'], staleSource);
    const freshDisc = await discipline(zeta, 'Fresh disc', ['F'], base);
    const unfetchedSample = await course(unfetched, zeta, base, 'sample-2');
    await subjects(unfetchedSample, base, [
      firstTerm('Stale', staleDisc),
      firstTerm('Fresh', freshDisc),
    ]);
    const staleGrade = await course(unfetched, alpha, base, 'stale-grade');
    await subjects(staleGrade, staleSource, [firstTerm('Never fetched')]);
    const staleCensus = await course(
      unfetched,
      echo,
      staleSource,
      'stale-census',
    );
    await subjects(staleCensus, base, [firstTerm('Census unfetched')]);
  });

  afterAll(async () => {
    await cleanup();
    await sql.end();
  });

  const book = (slug: string) => repository.book(slug);
  const summaries = async () =>
    (await repository.list()).filter((s) => s.profession.slug.startsWith('t-'));

  describe('list', () => {
    it('lists only the pool, alphabetically by profession name', async () => {
      const slugs = (await summaries()).map((s) => s.profession.slug);

      expect(slugs).toEqual([
        't-fiap-empty',
        't-fiap-grade',
        't-flag-elective',
        't-flag-term2',
        't-grade',
        't-main',
        't-name',
        't-order',
        't-pool-term-null',
        't-sample',
        't-sample-cap',
        't-sample-other',
        't-second-a',
        't-second-b',
        't-shift-a',
        't-shift-b',
        't-unfetched',
      ]);
    });

    it('counts every census course of the profession, with or without a grade', async () => {
      const main = (await summaries()).find(
        (s) => s.profession.slug === 't-main',
      );

      expect(main).toEqual({
        profession: { slug: 't-main', name: 'Test Main' },
        offeringCount: 7,
      });
    });

    it('counts the courses of the profession only (t-sample has 3)', async () => {
      const sample = (await summaries()).find(
        (s) => s.profession.slug === 't-sample',
      );

      expect(sample?.offeringCount).toBe(3);
    });
  });

  describe('pool', () => {
    it.each([
      ['a first-semester subject with a discipline that has topics', 't-main'],
      ['an undated term in year 1', 't-pool-term-null'],
    ])('includes a profession with %s', async (_n, slug) => {
      expect(await book(slug)).not.toBeNull();
    });

    it.each([
      ['a discipline only in term 2', 't-pool-term-two'],
      ['an undated term in year 2', 't-pool-year-two'],
      ['a discipline without topics', 't-pool-no-topics'],
      ['a first-semester subject without a discipline', 't-pool-undisciplined'],
      ['no courses', 't-pool-no-courses'],
      ['courses but no sample subject', 't-no-sample'],
      ['no such profession', 't-does-not-exist'],
    ])('answers null for a profession with %s', async (_n, slug) => {
      expect(await book(slug)).toBeNull();
    });
  });

  describe('offerings', () => {
    it('caps at BOOK_OFFERINGS and puts the sample course, then FIAP, then an institution with an image first', async () => {
      const result = await book('t-main');

      expect(BOOK_OFFERINGS).toBe(3);
      expect(names(result)).toEqual(['zeta1', 'fiap1', 'beta1']);
    });

    it('ranks institutions with a logo or photo before plain ones, then by name', async () => {
      expect(names(await book('t-order'))).toEqual([
        'sample',
        'beta-logo',
        'echo-photo',
      ]);
      expect(names(await book('t-name'))).toEqual(['sample', 'alpha', 'carl']);
    });

    it('never repeats an institution: its second campus is left out, by city', async () => {
      const result = await book('t-second-a');

      expect(names(result)).toEqual(['sample', 'alpha-bauru', 'carl']);
      expect(names(result)).not.toContain('alpha-campinas');
    });

    it('returns fewer offerings when fewer institutions qualify, never filling up with a second campus', async () => {
      const result = await book('t-second-b');

      expect(names(result)).toEqual(['sample', 'alpha-bauru']);
      expect(result?.offerings).toHaveLength(2);
      expect(
        new Set(result?.offerings.map((o) => o.institution.name)).size,
      ).toBe(2);
    });

    it('skips non-FIAP courses without a first-year mandatory subject', async () => {
      const all = names(await book('t-main'));

      expect(all).not.toContain('alpha-no-grade');
      expect(all).not.toContain('beta-elective');
    });

    it('shows FIAP even with no grade, with a null curriculum, and only once', async () => {
      const result = await book('t-fiap-empty');

      expect(names(result)).toEqual(['sample', 'fiap-campinas']);
      expect(result?.offerings[1].curriculum).toBeNull();
      expect(result?.offerings[1].institution.name).toBe('FIAP');
    });

    it('shows the FIAP course that has a grade, never an empty second FIAP page', async () => {
      const result = await book('t-fiap-grade');

      expect(names(result)).toEqual(['sample', 'fiap-grade-sp']);
      expect(result?.offerings[1].curriculum?.years).toEqual([
        { year: 1, subjects: ['Intro fiap-grade-sp'] },
      ]);
    });

    it('maps the institution, course and sources of an offering', async () => {
      const result = await book('t-main');

      expect(result?.offerings[0]).toEqual({
        institution: {
          name: 'Zeta Univ',
          shortName: 'ZU',
          kind: 'public',
          logo: null,
          photo: null,
        },
        course: {
          name: 'zeta1',
          degree: 'bacharelado',
          shift: null,
          durationYears: 4,
          campus: { name: 'Campus Z', city: 'Sao Paulo' },
          source: {
            label: 'Base',
            url: 'https://example.test/Base',
            retrievedAt: '2026-01-02T03:04:05.000Z',
          },
        },
        admission: [],
        curriculum: {
          years: [{ year: 1, subjects: ['Sample subject'] }],
          source: {
            label: 'Base',
            url: 'https://example.test/Base',
            retrievedAt: '2026-01-02T03:04:05.000Z',
          },
        },
      });
    });

    it('gives a logo or photo only with its full attribution, and null otherwise', async () => {
      const [, , beta] = (await book('t-main'))?.offerings ?? [];
      const echo = (await book('t-order'))?.offerings[2];

      expect(beta.institution.logo).toEqual({
        url: 'https://img.test/Beta Univ.png',
        license: 'CC0',
        sourceUrl: 'https://commons.test/Beta Univ',
      });
      expect(beta.institution.photo).toBeNull();
      expect(echo?.institution.logo).toBeNull();
      expect(echo?.institution.photo).toEqual({
        url: 'https://img.test/Echo Univ.jpg',
        credit: 'Ana Foto',
        license: 'CC BY',
        sourceUrl: 'https://commons.test/photo-Echo Univ',
      });
      expect(echo?.institution.kind).toBe('special');
    });

    it('has no admission cut-offs in any offering', async () => {
      const result = await book('t-main');

      expect(result?.offerings.map((o) => o.admission)).toEqual([[], [], []]);
    });

    it('has a null durationYears when the census gives none, and a number when it does', async () => {
      const result = await book('t-main');

      expect(result?.offerings[0].course.durationYears).toBe(4);
      expect(result?.offerings[2].course.durationYears).toBeNull();
    });
  });

  describe('curriculum', () => {
    it('lists distinct year-1 mandatory subjects by term then name, from the grade holding the sample', async () => {
      const result = await book('t-grade');
      const zg = result?.offerings.find((o) => o.course.name === 'zg');

      expect(zg?.curriculum).toEqual({
        years: [
          {
            year: 1,
            subjects: ['Alpha', 'Beta', 'Sample Disc', 'Aaa'],
          },
        ],
        source: expect.objectContaining({ label: 'Grade B' }),
      });
    });

    it('takes the lowest source id when no grade holds a sample discipline', async () => {
      const result = await book('t-grade');
      const ag = result?.offerings.find((o) => o.course.name === 'ag');

      expect(ag?.curriculum?.years).toEqual([
        { year: 1, subjects: ['A only', 'Term two'] },
      ]);
      expect(ag?.curriculum?.source.label).toBe('Grade A');
    });

    it('counts a year-less subject by its term as first year, and leaves out electives and later years', async () => {
      const result = await book('t-grade');
      const subjects = result?.offerings.flatMap(
        (o) => o.curriculum?.years[0].subjects ?? [],
      );

      expect(subjects).toContain('Term two');
      expect(subjects).not.toContain('Elective');
      expect(subjects).not.toContain('Second year');
      expect(subjects).not.toContain('Undated');
    });
  });

  describe('shift', () => {
    it('is always null, even when the grade states a clean shift', async () => {
      const result = await book('t-shift-a');
      const same = result?.offerings.find(
        (o) => o.course.name === 'same-value',
      );

      expect(same).toBeDefined();
      expect(result?.offerings.map((o) => o.course.shift)).toEqual(
        result?.offerings.map(() => null),
      );
    });
  });

  describe('sample', () => {
    it('lists the pool disciplines of the first semester by name, once each, at most two', async () => {
      const result = await book('t-sample');

      expect(result?.sample.map((s) => s.name)).toEqual([
        'Anatomia',
        'Undated term',
      ]);
    });

    it('returns 2 sample subjects, the first two by name, for 3 linked first-semester disciplines', async () => {
      const result = await book('t-sample-cap');

      expect(result?.sample.map((s) => s.name)).toEqual(['Cap A', 'Cap B']);
    });

    it('keeps topics in source order and uses the short name of the institution and the discipline source', async () => {
      const [first] = (await book('t-sample-cap'))?.sample ?? [];

      expect(first).toEqual({
        name: 'Cap A',
        topics: ['Zeta last', 'Alpha first', 'Mid'],
        institution: 'ZU',
        source: {
          label: 'Src Cap',
          url: 'https://example.test/Src-Cap',
          retrievedAt: '2026-01-02T03:04:05.000Z',
        },
      });
    });

    it('uses the name of an institution without a short name', async () => {
      expect((await book('t-sample'))?.sample[0].institution).toBe(
        'Alpha Univ',
      );
    });

    it('does not rank a course linked only through a term-2 subject as the sample course', async () => {
      expect(names(await book('t-flag-term2'))).toEqual([
        'pool',
        'a-plain',
        'c-term2',
      ]);
    });

    it('ranks a course linked through a term-1 elective as a sample course', async () => {
      expect(names(await book('t-flag-elective'))).toEqual([
        'c-elective',
        'pool',
        'a-plain',
      ]);
    });

    it('leaves out disciplines without topics, in term 2, or of another profession', async () => {
      const names = (await book('t-sample'))?.sample.map((s) => s.name);

      expect(names).not.toContain('No topics');
      expect(names).not.toContain('Term two only');
      expect(names).not.toContain('Other profession');
    });
  });

  describe('sources never fetched', () => {
    it('drops a grade whose source was never fetched, leaving a null curriculum', async () => {
      const result = await book('t-unfetched');
      const stale = result?.offerings.find(
        (o) => o.course.name === 'stale-grade',
      );

      expect(stale).toBeDefined();
      expect(stale?.curriculum).toBeNull();
    });

    it('drops a sample discipline whose source was never fetched', async () => {
      const result = await book('t-unfetched');
      const names = result?.sample.map((s) => s.name);

      expect(names).toContain('Fresh disc');
      expect(names).not.toContain('Stale disc');
    });

    it('drops a course whose census source was never fetched from the offerings', async () => {
      const result = await book('t-unfetched');

      expect(names(result)).toEqual(['sample', 'stale-grade']);
    });
  });

  it('returns the profession with its slug and name', async () => {
    expect((await book('t-main'))?.profession).toEqual({
      slug: 't-main',
      name: 'Test Main',
    });
  });
});
