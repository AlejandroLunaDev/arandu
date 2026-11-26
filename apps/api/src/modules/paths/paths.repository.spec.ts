import type { Sql } from '../../core/database/database.module.js';
import { PathsRepository } from './paths.repository.js';

// Unit: `sql` is a mock (tagged template, also callable as the list helper), so nothing touches a database.
const row = (course: number, discipline: number, topics: string[]) => ({
  course_id: course,
  institution: 'Uni',
  course: 'Course',
  city: 'SP',
  discipline_id: discipline,
  code: null,
  subject: `Subject ${discipline}`,
  topics,
  source_label: 'src',
  source_url: 'https://example.test',
  retrieved_at: new Date('2026-01-02T03:04:05Z'),
});
const chapter = (d: number, t: number, text: string) => ({ d, t, text });

function repo(
  rows: ReturnType<typeof row>[],
  chapters: ReturnType<typeof chapter>[],
) {
  const results = [[{ name: 'Prof' }], rows, chapters];
  const sql = vi.fn((first: unknown) =>
    Array.isArray(first) && 'raw' in first
      ? Promise.resolve(results.shift())
      : first,
  );
  return new PathsRepository(sql as unknown as Sql);
}

const subjects = async (r: PathsRepository) =>
  (await r.careerPaths('prof'))?.paths.map((p) =>
    p.subjects.map((s) => s.topics),
  );

describe('PathsRepository.careerPaths (ready chapters only)', () => {
  const topics = ['t0', 't1', 't2', 't3'];

  it('keeps only the leading run of stored chapters', async () => {
    const r = repo(
      [row(1, 10, topics)],
      [chapter(10, 0, 't0'), chapter(10, 1, 't1'), chapter(10, 3, 't3')],
    );
    expect(await subjects(r)).toEqual([[['t0', 't1']]]);
  });

  it('omits a subject whose first chapter is missing', async () => {
    const r = repo(
      [row(1, 10, topics), row(1, 11, ['a'])],
      [chapter(10, 1, 't1'), chapter(11, 0, 'a')],
    );
    expect(await subjects(r)).toEqual([[['a']]]);
  });

  it('drops a path whose subjects are all omitted', async () => {
    const r = repo(
      [row(1, 10, topics), row(2, 11, ['a'])],
      [chapter(11, 0, 'a')],
    );
    const result = await r.careerPaths('prof');
    expect(result?.paths.map((p) => p.courseId)).toEqual([2]);
  });

  it('does not count a stored chapter whose text differs', async () => {
    const r = repo([row(1, 10, ['new text'])], [chapter(10, 0, 'old text')]);
    expect(await subjects(r)).toEqual([]);
  });

  it('keeps every topic when all are stored', async () => {
    const r = repo(
      [row(1, 10, topics)],
      topics.map((text, t) => chapter(10, t, text)),
    );
    expect(await subjects(r)).toEqual([[topics]]);
  });
});

// A mock `tx` that answers each query by a fragment of its SQL and records every query with its values.
type Answers = Partial<Record<string, unknown[]>>;
function txRepo(answers: Answers) {
  const calls: { sql: string; values: unknown[] }[] = [];
  const replies: [string, unknown[]][] = [
    ['union all', []],
    ['pg_advisory', []],
    ['as studied', [{ done: 0, finished: false, studied: true }]],
    ['into public.lesson_results', [{}]],
    ['count(distinct', [{ mistakes: 0 }]],
    ['into public.chapter_results', [{}]],
    ['sum(sabedoria)', [{ earned: 0 }]],
    ['as today', [{ today: 1 }]],
    ['wallets', []],
  ];
  const tx = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      calls.push({ sql, values });
      const key = replies.find(([k]) => sql.includes(k))?.[0] ?? '';
      return Promise.resolve(
        answers[key] ?? replies.find(([k]) => k === key)?.[1],
      );
    },
    { json: (value: unknown) => ({ json: value }) },
  );
  const sql = {
    begin: (fn: (t: unknown) => unknown) => fn(tx),
  } as unknown as Sql;
  const into = (table: string) =>
    calls.find((c) => c.sql.includes(`into public.${table}`));
  return { repo: new PathsRepository(sql), calls, into };
}

const state = (done: number, finished: boolean, studied = true) => ({
  'as studied': [{ done, finished, studied }],
});
const miss = (index: number) => ({ topic: 0, index });

describe('PathsRepository.finishLesson', () => {
  it('locks lesson 3 while only lesson 1 is done', async () => {
    const { repo, into } = txRepo(state(1, false));
    await expect(repo.finishLesson('u', 7, 1, 3, [])).rejects.toMatchObject({
      status: 409,
      response: { code: 'lesson_locked' },
    });
    expect(into('lesson_results')).toBeUndefined();
  });

  it('does not lock a finished chapter and gives it no sabedoria', async () => {
    const { repo, into } = txRepo(state(1, true));
    await expect(repo.finishLesson('u', 7, 1, 3, [])).resolves.toMatchObject({
      sabedoria: 0,
      chapterDone: false,
    });
    expect(into('lesson_results')?.values).toContain(0);
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    'first finish of lesson 1 gives 4 (studied %s, patinha %s)',
    async (studied, patinha) => {
      const { repo, into } = txRepo(state(0, false, studied));
      expect(await repo.finishLesson('u', 7, 1, 1, [miss(2)])).toEqual({
        sabedoria: 4,
        peixinhos: 0,
        patinha,
        chapterDone: false,
      });
      expect(into('lesson_results')?.values).toEqual([
        'u',
        7,
        1,
        1,
        { json: [miss(2)] },
        4,
      ]);
    },
  );

  it('gives nothing on a replay', async () => {
    const { repo } = txRepo({
      ...state(1, false),
      'into public.lesson_results': [],
    });
    expect(await repo.finishLesson('u', 7, 1, 1, [])).toEqual({
      sabedoria: 0,
      peixinhos: 0,
      patinha: false,
      chapterDone: false,
    });
  });

  it('finishes the chapter at lesson 4 with its mistakes and relampago', async () => {
    const { repo, into, calls } = txRepo({
      ...state(3, false),
      'count(distinct': [{ mistakes: 2 }],
    });
    expect(await repo.finishLesson('u', 7, 1, 4, [miss(1)])).toEqual({
      sabedoria: 4,
      peixinhos: 10,
      patinha: false,
      chapterDone: true,
    });
    expect(into('chapter_results')?.values).toEqual(['u', 7, 1, 2, 1]);
    expect(calls.some((c) => c.sql.includes('update public.wallets'))).toBe(
      true,
    );
  });

  it('passes a null relampago when the chapter had no mistakes', async () => {
    const { repo, into } = txRepo(state(3, false));
    await repo.finishLesson('u', 7, 1, 4, [miss(1)]);
    expect(into('chapter_results')?.values).toEqual(['u', 7, 1, 0, null]);
  });

  it('gives no peixinhos when the chapter was already stored', async () => {
    const { repo, calls } = txRepo({
      ...state(3, false),
      'into public.chapter_results': [],
    });
    expect(await repo.finishLesson('u', 7, 1, 4, [])).toMatchObject({
      peixinhos: 0,
      chapterDone: true,
    });
    expect(calls.some((c) => c.sql.includes('update public.wallets'))).toBe(
      false,
    );
  });
});

describe('PathsRepository.finishChapter', () => {
  it.each([
    [12, 3],
    [0, 15],
    [20, 0],
  ])(
    'with %i earned in lessons gives and stores %i sabedoria',
    async (earned, sabedoria) => {
      const { repo, into } = txRepo({ 'sum(sabedoria)': [{ earned }] });
      expect(await repo.finishChapter('u', 7, 1, 2, 1)).toEqual({
        sabedoria,
        peixinhos: 10,
        patinha: true,
      });
      expect(into('chapter_results')?.values).toEqual([
        'u',
        7,
        1,
        2,
        1,
        sabedoria,
      ]);
    },
  );

  it('gives nothing on a replay', async () => {
    const { repo } = txRepo({ 'into public.chapter_results': [] });
    expect(await repo.finishChapter('u', 7, 1, 2)).toEqual({
      sabedoria: 0,
      peixinhos: 0,
      patinha: false,
    });
  });
});
