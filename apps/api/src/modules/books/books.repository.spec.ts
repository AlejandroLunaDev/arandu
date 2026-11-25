import { createHash } from 'node:crypto';
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

  const profession = async (slug: string, name: string) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.professions (slug, name, cine_code)
      values (${slug}, ${name}, ${`0411A${String(++professions).padStart(2, '0')}`})
      returning id::text`;
    return row!.id;
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
    return row!.id;
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
    return row!.id;
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
    const carl = await institution(9990004, 'Carl Univ', base, {
      kind: 'special',
    });
    const echo = await institution(9990005, 'Echo Univ', base);
    const bare = await institution(9990007, 'Aaa Bare Univ', base, {
      photo: false,
    });
    const fiap = await institution(FIAP, 'FIAP', base);
    // md5('t-photo-sample:9990015') sorts before md5('t-photo-sample:9990001'): without the photo filter it would win.
    const noPhotoUniv = await institution(9990015, 'Nophoto Univ', base, {
      photo: false,
    });

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

    // Ordering and picking: the sample's course, then FIAP, then names. 3 of 5 institutions.
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

    // A university without a full photo is not shown; the filter runs before the cap, so the next one fills in.
    const photo = await profession('t-photo', 'Test Photo');
    await sampleCourse(photo);
    await candidate(photo, bare, 'bare-no-photo');
    await candidate(photo, beta, 'beta-logo');
    await candidate(photo, carl, 'carl');
    await candidate(photo, echo, 'echo');

    // Every institution of the profession lacks a photo: its only sample subject comes from one, so it is off the shelf.
    const noPhoto = await profession('t-no-photo', 'Test No Photo');
    const bareSample = await course(noPhoto, bare, base, 'bare-sample');
    await subjects(bareSample, base, [
      firstTerm(
        'Bare subject',
        await discipline(bare, 'Bare disc', ['B'], base),
      ),
    ]);

    // A sample subject at an institution without a photo and one at an institution with a photo.
    const photoSample = await profession('t-photo-sample', 'Test Photo Sample');
    for (const [inst, label] of [
      [noPhotoUniv, 'Nophoto'],
      [zeta, 'Photo'],
    ] as const) {
      const id = await course(photoSample, inst, base, `${label}-course`);
      await subjects(id, base, [
        firstTerm(
          `${label} subject`,
          await discipline(inst, `${label} disc`, [label], base),
        ),
      ]);
    }

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
    // Not a sampleCourse: the sample comes from one institution, so carl's elective must be the only candidate.
    await candidate(flagElective, zeta, 'pool');
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

    // The sample comes from ONE institution: here only alpha (no short name) has a sample subject.
    const onlyAlpha = await profession('t-sample-alpha', 'Test Sample Alpha');
    const alphaCourse = await course(onlyAlpha, alpha, base, 'alpha-only');
    await subjects(alphaCourse, base, [
      firstTerm(
        'Solo alpha',
        await discipline(alpha, 'Solo alpha', ['S'], base),
      ),
    ]);

    // A FIAP page: year-only subjects (no term), each discipline holding its page description as the one topic.
    const fiapPage = await source('Fiap page');
    const fiapIa = await profession('t-fiap-ia', 'Test Fiap IA');
    const fiapIaCourse = await course(fiapIa, fiap, base, 'fiap-ia');
    await subjects(
      fiapIaCourse,
      fiapPage,
      await Promise.all(
        ['Machine Learning', 'AI Challenges'].map(async (name) => ({
          year: 1,
          term: null,
          name,
          discipline: await discipline(
            fiap,
            name,
            [`Descrição de ${name}`],
            fiapPage,
          ),
        })),
      ),
    );

    // Four institutions, each with sample subjects named so that a mix across them would show in the name order.
    for (const slug of ['t-shared-a', 't-shared-b', 't-shared-c']) {
      const shared = await profession(slug, `Test ${slug}`);
      for (const [inst, label, names] of [
        [zeta, 'zeta', ['A zeta', 'E zeta']],
        [alpha, 'alpha', ['B alpha', 'F alpha']],
        [carl, 'carl', ['C carl']],
        [fiap, 'fiap', ['D fiap', 'G fiap']],
      ] as const) {
        const id = await course(shared, inst, base, `${slug}-${label}`);
        await subjects(
          id,
          base,
          await Promise.all(
            names.map(async (name) =>
              firstTerm(name, await discipline(inst, name, [name], base)),
            ),
          ),
        );
      }
    }

    // A profession with courses but no sample subject at all.
    const noSample = await profession('t-no-sample', 'Test No Sample');
    await subjects(await course(noSample, zeta, base, 'ns'), base, [
      firstTerm('Plain'),
    ]);

    // At alpha, 'Aaa shared' and 'Bbb shared' open three careers, 'Ccc mid' two, 'Own' one: the shared ones sort first.
    const spread = await profession('t-spread', 'Test Spread');
    await subjects(
      await course(spread, alpha, base, 'spread'),
      base,
      await Promise.all(
        ['Aaa shared', 'Bbb shared', 'Ccc mid', 'Own'].map(async (name) =>
          firstTerm(name, await discipline(alpha, name, [name], base)),
        ),
      ),
    );
    for (const [slug, shared] of [
      ['t-spread-x', ['Aaa shared', 'Bbb shared', 'Ccc mid']],
      ['t-spread-y', ['aaa SHARED', 'Bbb shared']],
    ] as const) {
      const other = await profession(slug, `Test ${slug}`);
      await subjects(
        await course(other, alpha, base, slug),
        base,
        shared.map((name) => firstTerm(name)),
      );
    }

    // São Judas spells a subject one way in the ementário and another in the grades, yet both rows link to one
    // discipline: three careers at alpha reach 'Aaa Transmidia' through 'Aaa Transmídia', so it is as shared as can be.
    const linked = await discipline(alpha, 'Aaa Transmidia', ['Topic'], base);
    const link = await profession('t-link', 'Test Link');
    await subjects(await course(link, alpha, base, 'link'), base, [
      firstTerm('Aaa Transmídia', linked),
      firstTerm('Own link', await discipline(alpha, 'Own link', ['O'], base)),
    ]);
    for (const slug of ['t-link-x', 't-link-y']) {
      const other = await profession(slug, `Test ${slug}`);
      await subjects(await course(other, alpha, base, slug), base, [
        firstTerm('Aaa Transmídia', linked),
      ]);
    }

    // Two disciplines of one name (an institution with an ementa per course page): the sample holds it once.
    const twin = await profession('t-twin', 'Test Twin');
    await subjects(await course(twin, carl, base, 'twin'), base, [
      firstTerm(
        'Twin',
        await discipline(carl, 'Twin', ['T1'], await source('Twin 1')),
      ),
      firstTerm(
        'TWIN',
        await discipline(carl, 'TWIN', ['T2'], await source('Twin 2')),
      ),
      firstTerm('Zed', await discipline(carl, 'Zed', ['Z'], base)),
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
  /** The institution the sample must come from, computed here: the smallest md5(slug:INEP code) of the candidates. */
  const pickedInstitution = async (slug: string, ineps: number[]) => {
    const rows = await sql<{ id: string; inep: number }[]>`
      select id::text, inep_code as inep from public.institutions where inep_code in ${sql(ineps)}`;
    const hash = (inep: number) =>
      createHash('md5').update(`${slug}:${inep}`).digest('hex');
    return rows.sort((a, b) => hash(a.inep).localeCompare(hash(b.inep)))[0];
  };
  const summaries = async () =>
    (await repository.list()).filter((s) => s.profession.slug.startsWith('t-'));

  describe('list', () => {
    it('lists only the pool, alphabetically by profession name', async () => {
      const slugs = (await summaries()).map((s) => s.profession.slug);

      expect(slugs).toEqual([
        't-fiap-empty',
        't-fiap-grade',
        't-fiap-ia',
        't-flag-elective',
        't-flag-term2',
        't-grade',
        't-link',
        't-main',
        't-name',
        't-photo',
        't-photo-sample',
        't-pool-term-null',
        't-sample',
        't-sample-alpha',
        't-sample-cap',
        't-sample-other',
        't-second-a',
        't-second-b',
        't-shift-a',
        't-shift-b',
        't-spread',
        't-link-x',
        't-link-y',
        't-shared-a',
        't-shared-b',
        't-shared-c',
        't-twin',
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
    it('caps at BOOK_OFFERINGS and puts the sample course, then FIAP, then institutions by name', async () => {
      const result = await book('t-main');

      expect(BOOK_OFFERINGS).toBe(3);
      expect(names(result)).toEqual(['zeta1', 'fiap1', 'alpha1']);
    });

    it('orders by institution name after the sample course, ignoring logos', async () => {
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

    it('does not pin or show FIAP without a photo, and the next institution takes its place', async () => {
      const [saved] = await sql<
        {
          photo_url: string;
          photo_credit: string;
          photo_license: string;
          photo_source_url: string;
        }[]
      >`select photo_url, photo_credit, photo_license, photo_source_url from public.institutions
        where inep_code = ${FIAP}`;
      await sql`update public.institutions set photo_url = null, photo_credit = null, photo_license = null,
        photo_source_url = null where inep_code = ${FIAP}`;
      try {
        expect(names(await book('t-main'))).toEqual([
          'zeta1',
          'alpha1',
          'beta1',
        ]);
        expect(names(await book('t-fiap-empty'))).toEqual(['sample']);
      } finally {
        await sql`update public.institutions set ${sql(saved!)} where inep_code = ${FIAP}`;
      }
    });

    it('keeps a profession whose only sample subject is from an institution without a photo off the shelf', async () => {
      expect(await book('t-no-photo')).toBeNull();
      expect((await summaries()).map((s) => s.profession.slug)).not.toContain(
        't-no-photo',
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
      expect(result?.offerings[1]!.curriculum).toBeNull();
      expect(result?.offerings[1]!.institution.name).toBe('FIAP');
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

    it('has no admission cut-offs in any offering', async () => {
      const result = await book('t-main');

      expect(result?.offerings.map((o) => o.admission)).toEqual([[], [], []]);
    });

    it('has a null durationYears when the census gives none, and a number when it does', async () => {
      const result = await book('t-main');

      expect(result?.offerings[0]!.course.durationYears).toBe(4);
      expect(result?.offerings[2]!.course.durationYears).toBeNull();
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
        (o) => o.curriculum?.years[0]!.subjects ?? [],
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
    it('takes the sample from one institution only: the one the profession hash picks, subjects by name', async () => {
      const result = await book('t-sample');
      const picked = await pickedInstitution(
        't-sample',
        [9990001, 9990002, 9990004],
      );

      expect(result?.sample.map((s) => s.name)).toEqual(
        (
          {
            9990001: ['Zoologia'],
            9990002: ['Anatomia'],
            9990004: ['Undated term'],
          } as Record<number, string[]>
        )[picked!.inep],
      );
      expect(new Set(result?.sample.map((s) => s.institution)).size).toBe(1);
    });

    it('never takes the sample from an institution without a photo, even when its hash sorts first', async () => {
      const slug = 't-photo-sample';
      // Premise: unfiltered, the institution without a photo (9990015) would win the hash.
      expect((await pickedInstitution(slug, [9990001, 9990015]))!.inep).toBe(
        9990015,
      );
      const result = await book(slug);

      expect(result?.sample.map((s) => [s.name, s.institution])).toEqual([
        ['Photo disc', 'ZU'],
      ]);
      expect(result?.offerings.map((o) => o.course.name)).toEqual([
        'Photo-course',
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
      expect((await book('t-sample-alpha'))?.sample[0]!.institution).toBe(
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
        'a-plain',
        'pool',
      ]);
    });

    it("puts the career's own subjects before the ones other first semesters at the institution share", async () => {
      // By name alone it would be Aaa shared, Bbb shared.
      expect((await book('t-spread'))?.sample.map((s) => s.name)).toEqual([
        'Own',
        'Ccc mid',
      ]);
    });

    it('counts a linked subject as shared even when its rows are spelled differently', async () => {
      // Matching by name alone it would count 0 careers and come first, by name too.
      expect((await book('t-link'))?.sample.map((s) => s.name)).toEqual([
        'Own link',
        'Aaa Transmidia',
      ]);
    });

    it('holds a subject name once, whatever its case, when several disciplines carry it', async () => {
      expect((await book('t-twin'))?.sample.map((s) => s.name)).toEqual([
        'Twin',
        'Zed',
      ]);
    });

    it('leaves out disciplines without topics, in term 2, or of another profession', async () => {
      const names = (await book('t-sample'))?.sample.map((s) => s.name);

      expect(names).not.toContain('No topics');
      expect(names).not.toContain('Term two only');
      expect(names).not.toContain('Other profession');
    });
  });

  describe('one institution for the whole book', () => {
    const shared = [9990001, 9990002, 9990004, 852];
    const label = (i: { name: string; shortName: string | null }) =>
      i.shortName ?? i.name;

    it('puts a FIAP profession on the shelf with the page descriptions as the sample topics', async () => {
      expect((await summaries()).map((s) => s.profession.slug)).toContain(
        't-fiap-ia',
      );
      const result = await book('t-fiap-ia');

      expect(
        result?.sample.map((s) => [s.name, s.topics, s.institution]),
      ).toEqual([
        ['AI Challenges', ['Descrição de AI Challenges'], 'FIAP'],
        ['Machine Learning', ['Descrição de Machine Learning'], 'FIAP'],
      ]);
      expect(result?.offerings.map((o) => o.course.name)).toEqual(['fiap-ia']);
    });

    it.each(['t-shared-a', 't-shared-b', 't-shared-c'])(
      'draws every sample subject of %s from the picked institution, which also leads the offerings',
      async (slug) => {
        const result = await book(slug);
        const picked = await pickedInstitution(slug, shared);
        const [lead] = result?.offerings ?? [];
        const [{ name, short } = { name: '', short: null }] = await sql<
          { name: string; short: string | null }[]
        >`select name, short_name as short from public.institutions where id = ${picked!.id}`;

        expect(result?.sample.length).toBeGreaterThan(0);
        expect(new Set(result?.sample.map((s) => s.institution))).toEqual(
          new Set([short ?? name]),
        );
        expect(label(lead!.institution)).toBe(short ?? name);
        // by name, at most two: a mix across institutions would start 'A zeta', 'B alpha'.
        const own = result?.sample.map((s) => s.name) ?? [];
        expect(own).toEqual([...own].sort());
        expect(own.length).toBeLessThanOrEqual(2);
      },
    );

    it('is stable across calls', async () => {
      const first = await book('t-shared-a');

      for (let i = 0; i < 3; i++)
        expect(await book('t-shared-a')).toEqual(first);
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
// Needs public.story_pages and public.story_facts as the full-text migration leaves them (7 pages, 30 facts). Every
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

  it('has the migration seed: 7 pages and 30 facts', async () => {
    const [{ pages, facts } = { pages: -1, facts: -1 }] = await sql<
      { pages: number; facts: number }[]
    >`
      select (select count(*)::int from public.story_pages) as pages,
             (select count(*)::int from public.story_facts) as facts`;

    expect({ pages, facts }).toEqual({ pages: 7, facts: 30 });
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
    expect(pages.map((p) => p.facts.length)).toEqual([3, 5, 5, 6]);
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

    expect({ pages, facts }).toEqual({ pages: 7, facts: 30 });
  });
});
