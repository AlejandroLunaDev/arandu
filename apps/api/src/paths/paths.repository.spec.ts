import type { Sql } from '../platform/database/database.module.js';
import { PathsRepository } from './paths.repository.js';

// Unit: `sql` is a mock (tagged template, also callable as the list helper), so nothing touches a database.
const row = (course: number, discipline: number, topics: string[]) => ({
  course_id: course,
  institution: 'Uni',
  course: 'Course',
  city: 'SP',
  shift: 'noite',
  discipline_id: discipline,
  code: null,
  subject: `Subject ${discipline}`,
  topics,
  source_label: 'src',
  source_url: 'https://example.test',
  retrieved_at: new Date('2026-01-02T03:04:05Z'),
});
const stop = (d: number, t: number, text: string) => ({ d, t, text });

function repo(
  rows: ReturnType<typeof row>[],
  stops: ReturnType<typeof stop>[],
) {
  const results = [[{ name: 'Prof' }], rows, stops];
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

describe('PathsRepository.careerPaths (ready stops only)', () => {
  const topics = ['t0', 't1', 't2', 't3'];

  it('keeps only the leading run of stored stops', async () => {
    const r = repo(
      [row(1, 10, topics)],
      [stop(10, 0, 't0'), stop(10, 1, 't1'), stop(10, 3, 't3')],
    );
    expect(await subjects(r)).toEqual([[['t0', 't1']]]);
  });

  it('omits a subject whose first stop is missing', async () => {
    const r = repo(
      [row(1, 10, topics), row(1, 11, ['a'])],
      [stop(10, 1, 't1'), stop(11, 0, 'a')],
    );
    expect(await subjects(r)).toEqual([[['a']]]);
  });

  it('drops a path whose subjects are all omitted', async () => {
    const r = repo([row(1, 10, topics), row(2, 11, ['a'])], [stop(11, 0, 'a')]);
    const result = await r.careerPaths('prof');
    expect(result?.paths.map((p) => p.courseId)).toEqual([2]);
  });

  it('does not count a stored stop whose text differs', async () => {
    const r = repo([row(1, 10, ['new text'])], [stop(10, 0, 'old text')]);
    expect(await subjects(r)).toEqual([]);
  });

  it('keeps every topic when all are stored', async () => {
    const r = repo(
      [row(1, 10, topics)],
      topics.map((text, t) => stop(10, t, text)),
    );
    expect(await subjects(r)).toEqual([[topics]]);
  });
});
