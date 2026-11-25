import postgres from 'postgres';
import { BOOK_OFFERINGS, BooksRepository } from './books.repository.js';

// Integration: runs the real SQL against the real database (the owner's rule: no local stack) with the catalog
// migrations applied. It is skipped without TEST_DATABASE_URL, and it only ever writes rows it creates itself (slugs
// "t-*", INEP codes 9990000+, sources of adapter "books_test"), all removed at the end. Setup is slow over the network.
// Subject names are unique to the fixture: `public.subjects` is global, so the first discipline of a name claims it.
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
    await sql`delete from public.disciplines where source_id in (select id from public.sources where adapter = 'books_test')`;
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
    return row!.id;
  };

  interface InstitutionOptions {
    short?: string;
    kind?: string;
    logo?: boolean;
    /** Defaults to true: the book shows only institutions with a full photo. */
    photo?: boolean;
  }
  const institution = async (
    inep: number,
    name: string,
    base: string,
    o: InstitutionOptions = {},
  ) => {
    const photo = o.photo ?? true;
    const [row] = await sql<{ id: string }[]>`
      insert into public.institutions (inep_code, name, short_name, kind, source_id, logo_url, logo_license,
        logo_source_url, photo_url, photo_credit, photo_license, photo_source_url)
      values (${inep}, ${name}, ${o.short ?? null}, ${o.kind ?? 'public'}, ${base},
        ${o.logo ? `https://img.test/${name}.png` : null}, ${o.logo ? 'CC0' : null},
        ${o.logo ? `https://commons.test/${name}` : null},
        ${photo ? `https://img.test/${name}.jpg` : null}, ${photo ? 'Ana Foto' : null},
        ${photo ? 'CC BY' : null}, ${photo ? `https://commons.test/photo-${name}` : null})
      on conflict (inep_code) do nothing
      returning id::text`;
    if (row) {
      if (inep === FIAP) createdFiap = true;
      return row.id;
    }
    const [existing] = await sql<
      { id: string }[]
    >`select id::text from public.institutions where inep_code = ${inep}`;
    return existing!.id;
  };

  const profession = async (slug: string) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.professions (slug, name, cine_code)
      values (${slug}, ${`Test ${slug.slice(2).replaceAll('-', ' ')}`}, ${`0411A${String(++professions).padStart(2, '0')}`})
      returning id::text`;
    return row!.id;
  };

  interface CourseOptions {
    /** Null makes a distance course: it has no city (the migration's check ties them together). */
    city?: string | null;
    modality?: 'presencial' | 'a_distancia';
    duration?: number;
    campus?: string;
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
      insert into public.courses (inep_code, institution_id, profession_id, name, degree, duration_years,
        city, modality, campus_name, source_id)
      values (${99900000 + ++seq}, ${inst}, ${prof}, ${name}, ${o.degree ?? 'bacharelado'},
        ${o.duration ?? null}, ${o.city === undefined ? 'Sao Paulo' : o.city}, ${o.modality ?? 'presencial'}, ${o.campus ?? null}, ${base})
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
    await sql`
      insert into public.disciplines (institution_id, code, name, topics, source_id)
      values (${inst}, ${`TST${++seq}`}, ${name}, ${topics}, ${src})`;
  };

  interface Row {
    year: number | null;
    term: number | null;
    name: string;
    elective?: boolean;
  }
  const subjects = async (courseId: string, src: string, rows: Row[]) => {
    await sql`insert into public.curriculum_subjects ${sql(
      rows.map((r) => ({
        course_id: courseId,
        year: r.year,
        term: r.term,
        name: r.name,
        is_elective: r.elective ?? null,
        source_id: src,
      })),
    )}`;
  };

  /** A first-semester subject. */
  const firstTerm = (name: string): Row => ({ year: 1, term: 1, name });

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
    const carl = await institution(9990004, 'Carl Univ', base, {
      kind: 'special',
    });
    const echo = await institution(9990005, 'Echo Univ', base);
    const bare = await institution(9990007, 'Aaa Bare Univ', base, {
      photo: false,
    });
    const fiap = await institution(FIAP, 'FIAP', base);

    /**
     * The profession's career grid: its own source with one first-semester subject that has topics (taught from zeta),
     * held by a zeta course named `name`, the lead of the offerings.
     */
    const sampleCourse = async (
      prof: string,
      slug: string,
      name = 'sample',
      o: CourseOptions = {},
    ) => {
      const grid = await source(`Grid ${slug}`);
      await discipline(zeta, `Tz ${slug}`, ['Topic one'], base);
      const id = await course(prof, zeta, base, name, o);
      await subjects(id, grid, [firstTerm(`Tz ${slug}`)]);
      return id;
    };
    /** A course with one first-year mandatory subject without topics: a candidate for the book, not its grid. */
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

    // Ordering and picking: the course holding the career grid, then FIAP, then names. 3 of 5 institutions.
    const main = await profession('t-main');
    await sampleCourse(main, 't-main', 'zeta1', {
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

    // A university without a full photo is not shown; the filter runs before the cap, so the next one fills in.
    const photo = await profession('t-photo');
    await sampleCourse(photo, 't-photo');
    await candidate(photo, bare, 'bare-no-photo');
    await candidate(photo, beta, 'beta-logo');
    await candidate(photo, carl, 'carl');
    await candidate(photo, echo, 'echo');

    const byName = await profession('t-name');
    await sampleCourse(byName, 't-name');
    await candidate(byName, carl, 'carl');
    await candidate(byName, alpha, 'alpha');
    await candidate(
      byName,
      await institution(9990006, 'Delta Univ', base),
      'delta',
    );

    const secondA = await profession('t-second-a');
    await sampleCourse(secondA, 't-second-a');
    await candidate(secondA, alpha, 'alpha-campinas', { city: 'Campinas' });
    await candidate(secondA, alpha, 'alpha-bauru', { city: 'Bauru' });
    await candidate(secondA, carl, 'carl');

    const secondB = await profession('t-second-b');
    await sampleCourse(secondB, 't-second-b');
    await candidate(secondB, alpha, 'alpha-campinas', { city: 'Campinas' });
    await candidate(secondB, alpha, 'alpha-bauru', { city: 'Bauru' });

    const fiapNoGrade = await profession('t-fiap-empty');
    await sampleCourse(fiapNoGrade, 't-fiap-empty');
    await course(fiapNoGrade, fiap, base, 'fiap-sp', { city: 'Sao Paulo' });
    await course(fiapNoGrade, fiap, base, 'fiap-campinas', {
      city: 'Campinas',
    });

    const fiapDistance = await profession('t-fiap-distance');
    await sampleCourse(fiapDistance, 't-fiap-distance');
    await course(fiapDistance, fiap, base, 'fiap-distance', {
      city: null,
      modality: 'a_distancia',
    });

    const fiapGrade = await profession('t-fiap-grade');
    await sampleCourse(fiapGrade, 't-fiap-grade');
    await course(fiapGrade, fiap, base, 'fiap-empty-campinas', {
      city: 'Campinas',
    });
    await candidate(fiapGrade, fiap, 'fiap-grade-sp', { city: 'Sao Paulo' });

    // The curriculum of an offering: the course's own first-year grade, the career grid's when it holds one, else the
    // lowest source id.
    const gradeA = await source('Grade A');
    const gradeB = await source('Grade B');
    const gradeC = await source('Grade C');
    const grade = await profession('t-grade');
    await discipline(zeta, 'Sample Disc', ['x'], base);
    const zg = await course(grade, zeta, base, 'zg');
    await subjects(zg, gradeA, [firstTerm('From A')]);
    await subjects(zg, gradeB, [
      firstTerm('Sample Disc'),
      firstTerm('Beta'),
      firstTerm('Alpha'),
      { year: 1, term: 2, name: 'Alpha' },
      { year: 1, term: 2, name: 'Aaa' },
      { year: 1, term: 3, name: 'Elective', elective: true },
      { year: 2, term: 3, name: 'Second year' },
      { year: null, term: null, name: 'Undated' },
    ]);
    const agCareer = await course(grade, alpha, base, 'ag-career');
    await subjects(agCareer, gradeB, [firstTerm('B only')]);
    await subjects(agCareer, gradeA, [firstTerm('A only')]);
    const agLowest = await course(grade, carl, base, 'ag-lowest');
    await subjects(agLowest, gradeC, [firstTerm('C only')]);
    await subjects(agLowest, gradeA, [
      firstTerm('A only'),
      // year null, term 2 is still the first year: coalesce(year, (term + 1) / 2).
      { year: null, term: 2, name: 'Term two' },
    ]);

    // Which grid a career plays: its first semester with the most subjects with topics, then the most subjects, then
    // the lowest source id; a source never fetched is no grid.
    const pick = async (
      slug: string,
      grids: { fetched?: boolean; subjects: [string, boolean][] }[],
    ) => {
      const prof = await profession(slug);
      const id = await course(prof, zeta, base, 'pick');
      for (const [n, g] of grids.entries()) {
        const src = await source(`${slug} ${n}`, g.fetched ?? true);
        for (const [name, topics] of g.subjects)
          if (topics) await discipline(zeta, name, ['T'], base);
        await subjects(
          id,
          src,
          g.subjects.map(([name]) => firstTerm(name)),
        );
      }
    };
    await pick('t-pick-topics', [
      {
        subjects: [
          ['Pick topics x1', true],
          ['Pick topics x2', false],
          ['Pick topics x3', false],
        ],
      },
      {
        subjects: [
          ['Pick topics y1', true],
          ['Pick topics y2', true],
        ],
      },
    ]);
    await pick('t-pick-count', [
      {
        subjects: [
          ['Pick count x1', true],
          ['Pick count x2', false],
        ],
      },
      {
        subjects: [
          ['Pick count y1', true],
          ['Pick count y2', false],
          ['Pick count y3', false],
        ],
      },
    ]);
    await pick('t-pick-oldest', [
      { subjects: [['Pick oldest x1', true]] },
      { subjects: [['Pick oldest y1', true]] },
    ]);
    await pick('t-pick-unfetched', [
      {
        fetched: false,
        subjects: [
          ['Pick unfetched u1', true],
          ['Pick unfetched u2', true],
        ],
      },
      { subjects: [['Pick unfetched f1', true]] },
    ]);

    // The sample: three first-semester subjects with topics, one in term 2, one without topics.
    const cap = await profession('t-sample-cap');
    const capCourse = await course(cap, zeta, base, 'cap');
    const srcCap = await source('Src Cap');
    await discipline(zeta, 'Cap C', ['C'], base);
    await discipline(
      zeta,
      'Cap A',
      ['Zeta last', 'Alpha first', 'Mid'],
      srcCap,
    );
    await discipline(zeta, 'Cap B', ['B'], base);
    await discipline(zeta, 'Cap term two', ['T'], base);
    await discipline(zeta, 'Cap no topics', null, base);
    await subjects(capCourse, await source('Grid cap'), [
      firstTerm('Cap C'),
      firstTerm('Cap A'),
      firstTerm('Cap B'),
      firstTerm('Cap no topics'),
      { year: 1, term: 2, name: 'Cap term two' },
    ]);

    // The institution of the sample is the discipline's, not the grid's: only alpha (no short name) teaches this one.
    const onlyAlpha = await profession('t-sample-alpha');
    await discipline(alpha, 'Solo alpha', ['S'], base);
    await subjects(
      await course(onlyAlpha, zeta, base, 'alpha-only'),
      await source('Grid alpha'),
      [firstTerm('Solo alpha')],
    );

    // A FIAP page: year-only subjects (no term), each discipline holding its page description as the one topic.
    const fiapPage = await source('Fiap page');
    const fiapIa = await profession('t-fiap-ia');
    const fiapIaCourse = await course(fiapIa, fiap, base, 'fiap-ia');
    for (const name of ['Tz Machine Learning', 'Tz AI Challenges'])
      await discipline(fiap, name, [`Descrição de ${name}`], fiapPage);
    await subjects(
      fiapIaCourse,
      fiapPage,
      ['Tz Machine Learning', 'Tz AI Challenges'].map((name) => ({
        year: 1,
        term: null,
        name,
      })),
    );

    // Careers share subjects: at the grids of three careers, 'Aaa shared' and 'Bbb shared' open three, 'Ccc mid' two,
    // 'Own' one: the career's own subjects come first.
    const spread = await profession('t-spread');
    for (const name of ['Aaa shared', 'Bbb shared', 'Ccc mid', 'Own'])
      await discipline(alpha, name, [name], base);
    await subjects(
      await course(spread, alpha, base, 'spread'),
      await source('Grid spread'),
      ['Aaa shared', 'Bbb shared', 'Ccc mid', 'Own'].map(firstTerm),
    );
    for (const [slug, shared] of [
      ['t-spread-x', ['Aaa shared', 'Bbb shared', 'Ccc mid']],
      ['t-spread-y', ['aaa SHARED', 'Bbb shared']],
    ] as const) {
      const other = await profession(slug);
      await subjects(
        await course(other, alpha, base, slug),
        await source(`Grid ${slug}`),
        shared.map(firstTerm),
      );
    }

    // A subject is spelled one way in the ementário and another in the grids, yet both are one subject (the key drops
    // accents): three careers reach 'Aaa Transmidia', so it is as shared as can be.
    const link = await profession('t-link');
    await discipline(alpha, 'Aaa Transmidia', ['Topic'], base);
    await discipline(alpha, 'Own link', ['O'], base);
    await subjects(
      await course(link, alpha, base, 'link'),
      await source('Grid link'),
      [firstTerm('Aaa Transmídia'), firstTerm('Own link')],
    );
    for (const slug of ['t-link-x', 't-link-y']) {
      const other = await profession(slug);
      await subjects(
        await course(other, alpha, base, slug),
        await source(`Grid ${slug}`),
        [firstTerm('Aaa Transmídia')],
      );
    }

    // Two disciplines of one name (an institution with an ementa per course page): the sample holds it once.
    const twin = await profession('t-twin');
    await discipline(carl, 'Twin', ['T1'], await source('Twin 1'));
    await discipline(carl, 'TWIN', ['T2'], await source('Twin 2'));
    await discipline(carl, 'Zed', ['Z'], base);
    await subjects(
      await course(twin, carl, base, 'twin'),
      await source('Grid twin'),
      [firstTerm('Twin'), firstTerm('TWIN'), firstTerm('Zed')],
    );

    // The pool: the career grid has a first-semester subject with topics.
    const pool = async (
      slug: string,
      row: Row,
      topics: string[] | null = ['T'],
    ) => {
      const id = await profession(slug);
      if (topics) await discipline(zeta, row.name, topics, base);
      await subjects(
        await course(id, zeta, base, `${slug}-course`),
        await source(`Grid ${slug}`),
        [row],
      );
    };
    await pool('t-pool-term-null', {
      year: 1,
      term: null,
      name: 'Pool term null',
    });
    await pool('t-pool-term-two', { year: 1, term: 2, name: 'Pool term two' });
    await pool('t-pool-year-two', {
      year: 2,
      term: null,
      name: 'Pool year two',
    });
    await pool('t-pool-no-topics', firstTerm('Pool no topics'), null);
    await pool('t-pool-no-discipline', firstTerm('Pool no discipline'), null);
    await profession('t-pool-no-courses');
    await subjects(
      await course(await profession('t-no-sample'), zeta, base, 'ns'),
      base,
      [firstTerm('Tz Plain')],
    );

    // A source never fetched has no date to show: what it backs is left out, never a crash.
    const unfetched = await profession('t-unfetched');
    const staleSource = await source('Unfetched', false);
    await discipline(zeta, 'Stale disc', ['S'], staleSource);
    await discipline(zeta, 'Fresh disc', ['F'], base);
    const unfetchedSample = await course(unfetched, zeta, base, 'sample');
    await subjects(unfetchedSample, await source('Grid unfetched'), [
      firstTerm('Stale disc'),
      firstTerm('Fresh disc'),
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
  }, 300_000);

  afterAll(async () => {
    await cleanup();
    await sql.end();
  }, 120_000);

  const book = (slug: string) => repository.book(slug);
  const summaries = async () =>
    (await repository.list()).filter((s) => s.profession.slug.startsWith('t-'));
  const sampleNames = async (slug: string) =>
    (await book(slug))?.sample.map((s) => s.name);

  describe('list', () => {
    it('lists only the pool, alphabetically by profession name', async () => {
      const all = await summaries();

      expect(all.map((s) => s.profession.slug).sort()).toEqual(
        [
          't-fiap-distance',
          't-fiap-empty',
          't-fiap-grade',
          't-fiap-ia',
          't-grade',
          't-link',
          't-link-x',
          't-link-y',
          't-main',
          't-name',
          't-photo',
          't-pick-count',
          't-pick-oldest',
          't-pick-topics',
          't-pick-unfetched',
          't-pool-term-null',
          't-sample-alpha',
          't-sample-cap',
          't-second-a',
          't-second-b',
          't-spread',
          't-spread-x',
          't-spread-y',
          't-twin',
          't-unfetched',
        ].sort(),
      );
      const professionNames = all.map((s) => s.profession.name);
      expect(professionNames).toEqual(
        [...professionNames].sort((a, b) => a.localeCompare(b, 'en')),
      );
    });

    it('counts every census course of the profession, with or without a grade', async () => {
      const main = (await summaries()).find(
        (s) => s.profession.slug === 't-main',
      );

      expect(main).toEqual({
        profession: { slug: 't-main', name: 'Test main' },
        offeringCount: 7,
      });
    });
  });

  describe('pool', () => {
    it.each([
      ['a first-semester subject with topics', 't-main'],
      ['an undated term in year 1', 't-pool-term-null'],
    ])('includes a profession with %s', async (_n, slug) => {
      expect(await book(slug)).not.toBeNull();
    });

    it.each([
      ['a subject only in term 2', 't-pool-term-two'],
      ['an undated term in year 2', 't-pool-year-two'],
      ['a subject without topics', 't-pool-no-topics'],
      ['a first-semester subject without a discipline', 't-pool-no-discipline'],
      ['no courses', 't-pool-no-courses'],
      ['courses but no subject with topics', 't-no-sample'],
      ['no such profession', 't-does-not-exist'],
    ])('answers null for a profession with %s', async (_n, slug) => {
      expect(await book(slug)).toBeNull();
    });
  });

  describe('career grid', () => {
    it.each([
      [
        'the most subjects with topics, over the most subjects',
        't-pick-topics',
        ['Pick topics y1', 'Pick topics y2'],
      ],
      [
        'the most subjects when the topics tie',
        't-pick-count',
        ['Pick count y1'],
      ],
      [
        'the lowest source id when everything ties',
        't-pick-oldest',
        ['Pick oldest x1'],
      ],
      [
        'a fetched source over a better one never fetched',
        't-pick-unfetched',
        ['Pick unfetched f1'],
      ],
    ])('is the grid with %s', async (_n, slug, expected) => {
      expect(await sampleNames(slug)).toEqual(expected);
    });

    it('is played by every course of the career, each with its own first-year grade', async () => {
      const result = await book('t-grade');
      const byCourse = Object.fromEntries(
        (result?.offerings ?? []).map((o) => [
          o.course.name,
          o.curriculum?.years[0]!.subjects,
        ]),
      );

      // Distinct, by term then name, in the grid that holds the sample; electives and later years left out.
      expect(byCourse['zg']).toEqual(['Alpha', 'Beta', 'Sample Disc', 'Aaa']);
      expect(byCourse['ag-career']).toEqual(['B only']);
      // No grade of this course is the career's: the lowest source id.
      expect(byCourse['ag-lowest']).toEqual(['A only', 'Term two']);
      expect(
        result?.offerings.find((o) => o.course.name === 'zg')?.curriculum
          ?.source.label,
      ).toBe('Grade B');
    });
  });

  describe('offerings', () => {
    it('caps at BOOK_OFFERINGS and puts the course holding the career grid first, then FIAP, then institutions by name', async () => {
      const result = await book('t-main');

      expect(BOOK_OFFERINGS).toBe(3);
      expect(names(result)).toEqual(['zeta1', 'fiap1', 'alpha1']);
    });

    it('orders by institution name after the lead, ignoring logos', async () => {
      expect(names(await book('t-name'))).toEqual(['sample', 'alpha', 'carl']);
    });

    it('leaves out an institution without a photo and lets the next one with a photo fill the cap', async () => {
      const result = await book('t-photo');

      // Without the filter this would be sample, bare-no-photo, beta-logo.
      expect(names(result)).toEqual(['sample', 'beta-logo', 'carl']);
      expect(result?.offerings.map((o) => o.institution.photo)).not.toContain(
        null,
      );
    });

    it('never repeats an institution: its second campus is left out, by city', async () => {
      const result = await book('t-second-a');

      expect(names(result)).toEqual(['sample', 'alpha-bauru', 'carl']);
      expect(names(result)).not.toContain('alpha-campinas');
    });

    it('returns fewer offerings when fewer institutions qualify, never filling up with a second campus', async () => {
      const result = await book('t-second-b');

      expect(names(result)).toEqual(['sample', 'alpha-bauru']);
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
      expect(result?.offerings[1]!.curriculum).toBeNull();
      expect(result?.offerings[1]!.institution.name).toContain('FIAP');
    });

    it('shows a distance course with no campus and its modality, and an in-person one as presencial', async () => {
      const result = await book('t-fiap-distance');

      expect(names(result)).toEqual(['sample', 'fiap-distance']);
      expect(result?.offerings[1]!.course).toMatchObject({
        modality: 'a_distancia',
        campus: null,
      });
      expect(result?.offerings[0]!.course.modality).toBe('presencial');
    });

    it('shows the FIAP course that has a grade, never an empty second FIAP page', async () => {
      const result = await book('t-fiap-grade');

      expect(names(result)).toEqual(['sample', 'fiap-grade-sp']);
      expect(result?.offerings[1]!.curriculum?.years).toEqual([
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
          photo: {
            url: 'https://img.test/Zeta Univ.jpg',
            credit: 'Ana Foto',
            license: 'CC BY',
            sourceUrl: 'https://commons.test/photo-Zeta Univ',
          },
        },
        course: {
          name: 'zeta1',
          degree: 'bacharelado',
          shift: null,
          durationYears: 4,
          modality: 'presencial',
          campus: { name: 'Campus Z', city: 'Sao Paulo' },
          source: {
            label: 'Base',
            url: 'https://example.test/Base',
            retrievedAt: '2026-01-02T03:04:05.000Z',
          },
        },
        curriculum: {
          years: [{ year: 1, subjects: ['Tz t-main'] }],
          source: {
            label: 'Grid t-main',
            url: 'https://example.test/Grid-t-main',
            retrievedAt: '2026-01-02T03:04:05.000Z',
          },
        },
      });
    });

    it('gives a logo or photo only with its full attribution, and null otherwise', async () => {
      const [, beta, carl] = (await book('t-photo'))?.offerings ?? [];

      expect(beta!.institution.logo).toEqual({
        url: 'https://img.test/Beta Univ.png',
        license: 'CC0',
        sourceUrl: 'https://commons.test/Beta Univ',
      });
      expect(carl!.institution.logo).toBeNull();
      expect(carl!.institution.photo).toEqual({
        url: 'https://img.test/Carl Univ.jpg',
        credit: 'Ana Foto',
        license: 'CC BY',
        sourceUrl: 'https://commons.test/photo-Carl Univ',
      });
      expect(carl!.institution.kind).toBe('special');
    });

    it('has a null durationYears when the census gives none, and a number when it does', async () => {
      const result = await book('t-main');

      expect(result?.offerings[0]!.course.durationYears).toBe(4);
      expect(result?.offerings[2]!.course.durationYears).toBeNull();
    });
  });

  describe('sample', () => {
    it('returns 2 subjects, the first two by name, of the first semester with topics only', async () => {
      // Cap term two (term 2) and Cap no topics stay out.
      expect(await sampleNames('t-sample-cap')).toEqual(['Cap A', 'Cap B']);
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
      expect((await book('t-sample-alpha'))?.sample[0]!.institution).toBe(
        'Alpha Univ',
      );
    });

    it("puts the career's own subjects before the ones other careers' grids share", async () => {
      // By name alone it would be Aaa shared, Bbb shared.
      expect(await sampleNames('t-spread')).toEqual(['Own', 'Ccc mid']);
    });

    it('counts a linked subject as shared even when its rows are spelled differently', async () => {
      // Matching by name alone it would count 0 careers and come first, by name too.
      expect(await sampleNames('t-link')).toEqual([
        'Own link',
        'Aaa Transmidia',
      ]);
    });

    it('holds a subject name once, whatever its case, when several disciplines carry it', async () => {
      expect(await sampleNames('t-twin')).toEqual(['Twin', 'Zed']);
    });

    it('puts a FIAP profession on the shelf with the page descriptions as the sample topics', async () => {
      expect((await summaries()).map((s) => s.profession.slug)).toContain(
        't-fiap-ia',
      );
      const result = await book('t-fiap-ia');

      expect(
        result?.sample.map((s) => [s.name, s.topics, s.institution]),
      ).toEqual([
        [
          'Tz AI Challenges',
          ['Descrição de Tz AI Challenges'],
          expect.stringContaining('FIAP'),
        ],
        [
          'Tz Machine Learning',
          ['Descrição de Tz Machine Learning'],
          expect.stringContaining('FIAP'),
        ],
      ]);
      expect(result?.offerings.map((o) => o.course.name)).toEqual(['fiap-ia']);
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
      expect(await sampleNames('t-unfetched')).toEqual(['Fresh disc']);
    });

    it('drops a course whose census source was never fetched from the offerings', async () => {
      expect(names(await book('t-unfetched'))).toEqual([
        'sample',
        'stale-grade',
      ]);
    });
  });

  it('returns the profession with its slug and name', async () => {
    expect((await book('t-main'))?.profession).toEqual({
      slug: 't-main',
      name: 'Test main',
    });
  });
});
/// Needs public.story_pages and public.story_facts as the full-text migration leaves them (7 pages, 28 facts). Every
// test that changes them does it inside a transaction that is rolled back, so the tables stay exactly as seeded.
describe.skipIf(!url)('BooksRepository.ownBook (database)', () => {
  const sql = postgres(url ?? '', { max: 1, onnotice: () => {} });
  const repository = new BooksRepository(sql);

  class Rollback extends Error {}
  /** Runs `fn` in a transaction and always rolls it back; resolves with what `fn` returned. */
  const rolledBack = async <T>(
    fn: (tx: postgres.TransactionSql) => Promise<T>,
  ): Promise<T> => {
    let out: T | undefined;
    await sql
      .begin(async (tx) => {
        out = await fn(tx);
        throw new Rollback();
      })
      .catch((e) => {
        if (!(e instanceof Rollback)) throw e;
      });
    return out as T;
  };
  const insertFact = (
    tx: postgres.TransactionSql,
    row: { page: number; position: number; label?: string; url?: string },
  ) => tx`insert into public.story_facts
    (book, page, position, text, source_label, source_url, verified_on)
    values ('solucao', ${row.page}, ${row.position}, 't', ${row.label ?? null}, ${row.url ?? null}, '2026-01-01')`;
  const deletePage = async (
    tx: postgres.TransactionSql,
    book: string,
    page: number,
  ) => {
    await tx`delete from public.story_facts where book = ${book} and page = ${page}`;
    await tx`delete from public.story_pages where book = ${book} and page = ${page}`;
  };

  // A transaction runs the same queries as the pool; the repository only types it as the pool.
  const inTx = (tx: postgres.TransactionSql) =>
    new BooksRepository(tx as unknown as postgres.Sql);

  afterAll(() => sql.end());

  it('has the migration seed: 7 pages and 28 facts', async () => {
    const [{ pages, facts } = { pages: -1, facts: -1 }] = await sql<
      { pages: number; facts: number }[]
    >`
      select (select count(*)::int from public.story_pages) as pages,
             (select count(*)::int from public.story_facts) as facts`;

    expect({ pages, facts }).toEqual({ pages: 7, facts: 28 });
  });

  it('serves the solucao book in three pages', async () => {
    const { book, pages } = await repository.ownBook('solucao');

    expect(book).toBe('solucao');
    expect(pages.map((p) => p.title)).toEqual([
      'O problema',
      'Por que acontece',
      'Como o Arandu resolve',
    ]);
    expect(pages.map((p) => p.facts.length)).toEqual([4, 2, 5]);
    expect(pages[0]!.facts[0]!.figure).toBeNull();
    expect(pages[0]!.facts[0]!.text).toMatch(
      /^Escolher uma carreira universitária é difícil/,
    );
    const source = pages[0]!.facts[0]!.source;
    expect(source?.label).toBe('Semesp, Mapa do Ensino Superior, 16ª ed.');
    expect(source?.url).toMatch(/^https:\/\//);
    expect(source?.verifiedOn).toBe('2026-11-19');
    expect(pages[1]!.facts[0]!.figure).toBe(
      'Escolhe-se sem ter experimentado a carreira.',
    );
    expect(pages[1]!.facts[0]!.source).toBeNull();
  });

  it('serves the produto book in four pages', async () => {
    const { pages } = await repository.ownBook('produto');

    expect(pages.map((p) => p.title)).toEqual([
      'O produto',
      'Como funciona',
      'Princípios que não mudam',
      'Feito com dados reais',
    ]);
    expect(pages.map((p) => p.facts.length)).toEqual([1, 5, 5, 6]);
    expect(pages[3]!.facts[0]!.text).toBe('Hoje a base do Arandu reúne:');
    expect(pages[3]!.facts[0]!.source).toBeNull();
    const grades = pages[3]!.facts.find(
      (f) =>
        f.source?.label ===
        'Grades publicadas pelas próprias instituições, cada uma com seu link',
    );
    expect(grades?.source?.url).toBeNull();
  });

  it('keeps a non-https url out of the page', async () => {
    const fact = await rolledBack(async (tx) => {
      await insertFact(tx, {
        page: 2,
        position: 99,
        label: 'L',
        url: 'http://insecure.test/x',
      });
      return (await inTx(tx).ownBook('solucao')).pages[1]!.facts[2];
    });

    expect(fact!.source).toEqual({
      label: 'L',
      url: null,
      verifiedOn: '2026-01-01',
    });
  });

  it('returns facts [] for a page with no facts', async () => {
    const pages = await rolledBack(async (tx) => {
      await tx`delete from public.story_facts where book = 'solucao' and page = 2`;
      return (await inTx(tx).ownBook('solucao')).pages;
    });

    expect(pages[1]).toEqual({ title: 'Por que acontece', facts: [] });
    expect(pages[0]!.facts).toHaveLength(4);
  });

  it('returns the one page left, titled with its own title, when page 1 is gone', async () => {
    const pages = await rolledBack(async (tx) => {
      await deletePage(tx, 'solucao', 1);
      await deletePage(tx, 'solucao', 3);
      return (await inTx(tx).ownBook('solucao')).pages;
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]!.title).toBe('Por que acontece');
  });

  it('throws when a book has no pages', async () => {
    const result = rolledBack(async (tx) => {
      for (const page of [1, 2, 3]) await deletePage(tx, 'solucao', page);
      return inTx(tx)
        .ownBook('solucao')
        .then(
          () => 'resolved',
          (e: Error) => `${e.constructor.name}: ${e.message}`,
        );
    });

    await expect(result).resolves.toMatch(/^Error: .*has no pages/);
  });

  describe('constraints', () => {
    it('rejects page 0', async () => {
      await expect(
        rolledBack(
          (tx) =>
            tx`insert into public.story_pages (book, page, title) values ('solucao', 0, 'x')`,
        ),
      ).rejects.toThrow(/check constraint/);
    });

    it('accepts page 3', async () => {
      const [row] = await rolledBack(async (tx) => {
        await deletePage(tx, 'solucao', 3);
        return tx<{ page: number }[]>`
          insert into public.story_pages (book, page, title)
          values ('solucao', 3, 'x') returning page`;
      });

      expect(row!.page).toBe(3);
    });

    it('rejects a fact on a missing page', async () => {
      await expect(
        rolledBack(async (tx) => {
          await deletePage(tx, 'solucao', 2);
          await insertFact(tx, { page: 2, position: 1 });
        }),
      ).rejects.toThrow(/foreign key/);
    });

    it('rejects a duplicate (book, page, position)', async () => {
      await expect(
        rolledBack((tx) => insertFact(tx, { page: 1, position: 1 })),
      ).rejects.toThrow(/duplicate key/);
    });

    it('rejects a source_url without a source_label', async () => {
      await expect(
        rolledBack((tx) =>
          insertFact(tx, { page: 1, position: 50, url: 'https://x.test/' }),
        ),
      ).rejects.toThrow(/check constraint/);
    });
  });

  it('carries no phrase the owner dropped', async () => {
    const [{ n } = { n: -1 }] = await sql<{ n: number }[]>`
      select (select count(*)::int from public.story_facts
              where text ilike any (array['%vivido%', '%viver a carreira%', '%dos outros%'])
                 or figure ilike any (array['%vivido%', '%viver a carreira%', '%dos outros%'])
                 or source_label ilike any (array['%vivido%', '%viver a carreira%', '%dos outros%']))
           + (select count(*)::int from public.story_pages
              where title ilike any (array['%vivido%', '%viver a carreira%', '%dos outros%'])) as n`;

    expect(n).toBe(0);
  });

  it('left the story tables as seeded', async () => {
    const [{ pages, facts } = { pages: -1, facts: -1 }] = await sql<
      { pages: number; facts: number }[]
    >`
      select (select count(*)::int from public.story_pages) as pages,
             (select count(*)::int from public.story_facts) as facts`;

    expect({ pages, facts }).toEqual({ pages: 7, facts: 28 });
  });
});
