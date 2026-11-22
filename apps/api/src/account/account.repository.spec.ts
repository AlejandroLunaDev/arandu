import type { Sql } from '../platform/database/database.module.js';
import { AccountRepository } from './account.repository.js';

/** A sql tag that records the statements; `sql(table)` answers its argument. */
const recording = () => {
  const statements: string[] = [];
  const tag = (first: unknown, ...values: unknown[]) => {
    if (Array.isArray(first) && 'raw' in first) {
      const parts = first as string[];
      const query = parts.reduce(
        (q, part, i) =>
          q + part + (i < values.length ? `{${String(values[i])}}` : ''),
        '',
      );
      statements.push(query.replace(/\s+/g, ' ').trim());
      return Promise.resolve([{ ok: true }]);
    }
    return first;
  };
  return { sql: tag as unknown as Sql, statements };
};

describe('AccountRepository', () => {
  it('export reads every person table and the messages of their sessions', async () => {
    const { sql, statements } = recording();

    const data = await new AccountRepository(sql).export('u');

    expect(Object.keys(data)).toEqual(
      expect.arrayContaining([
        'journeys',
        'arandu_memories',
        'arandu_facts',
        'arandu_sessions',
        'stop_results',
        'stop_questions',
        'book_reflections',
        'arandu_messages',
        'users',
        'sessions',
      ]),
    );
    expect(statements.every((q) => q.includes('{u}'))).toBe(true);
    expect(
      statements.some((q) => q.includes('join public.arandu_sessions')),
    ).toBe(true);
    expect(statements.at(-1)).toContain('from public.sessions');
  });

  it('delete removes the Google auth user, then the user, in one transaction', async () => {
    const { sql, statements } = recording();
    const begin = vi.fn((run: (tx: Sql) => Promise<void>) => run(sql));
    Object.assign(sql, { begin });

    await new AccountRepository(sql).delete('u');

    expect(begin).toHaveBeenCalledTimes(1);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('delete from auth.users');
    expect(statements[0]).toContain('{u}');
    expect(statements[1]).toBe('delete from public.users where id = {u}');
  });
});
