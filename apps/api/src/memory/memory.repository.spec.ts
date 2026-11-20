import type { AranduProfile } from '@arandu/contracts';
import { UnauthorizedException } from '@nestjs/common';
import type { Sql } from '../platform/database/database.module.js';
import { MemoryRepository, PersonGoneError } from './memory.repository.js';

const pgError = (code: string, constraint_name: string) =>
  Object.assign(new Error('pg'), { code, constraint_name });

/** A sql tag whose every query (and transaction) rejects with `error`. */
const failingRepository = (error: unknown) => {
  const tag = Object.assign(() => Promise.reject(error), {
    json: (v: unknown) => v,
    begin: () => Promise.reject(error),
  });
  return new MemoryRepository(tag as unknown as Sql);
};

const writes: [string, (r: MemoryRepository) => Promise<unknown>][] = [
  ['createSession', (r) => r.createSession('u', 'onboarding')],
  ['saveProfile', (r) => r.saveProfile('u', {} as AranduProfile)],
  ['saveFacts', (r) => r.saveFacts('u', [], [], ['s1'], [1])],
];

describe('MemoryRepository writes for a deleted account', () => {
  it.each(writes)(
    '%s maps the user FK violation to PersonGoneError',
    async (_, write) => {
      for (const constraint of [
        'arandu_memories_user_id_fkey',
        'arandu_sessions_user_id_fkey',
        'arandu_facts_user_id_fkey',
      ]) {
        const rejected = write(failingRepository(pgError('23503', constraint)));
        await expect(rejected).rejects.toBeInstanceOf(PersonGoneError);
        await expect(rejected).rejects.toBeInstanceOf(UnauthorizedException);
        await expect(rejected).rejects.toThrow('This account no longer exists');
      }
    },
  );

  it.each(writes)(
    '%s rethrows a 23503 on another constraint as is',
    async (_, write) => {
      const error = pgError('23503', 'arandu_sessions_profession_slug_fkey');

      await expect(write(failingRepository(error))).rejects.toBe(error);
    },
  );

  it.each(writes)('%s rethrows a non-23503 error as is', async (_, write) => {
    const error = pgError('23505', 'arandu_memories_user_id_fkey');

    await expect(write(failingRepository(error))).rejects.toBe(error);
  });
});

/** A sql tag that answers each query with the next scripted rows. */
const scripted = (...answers: unknown[][]) => {
  const next = [...answers];
  return new MemoryRepository(
    vi.fn(() => Promise.resolve(next.shift() ?? [])) as unknown as Sql,
  );
};

const fact = {
  id: 3,
  text: 'Gosta de xadrez',
  source: 'onboarding',
  created_at: new Date('2026-11-01T00:00:00Z'),
};

describe('MemoryRepository facts', () => {
  it('facts maps the rows to the contract', async () => {
    const facts = await scripted([fact]).facts('u');

    expect(facts).toEqual([
      {
        id: 3,
        text: 'Gosta de xadrez',
        source: 'onboarding',
        createdAt: '2026-11-01T00:00:00.000Z',
      },
    ]);
  });

  it('read joins the facts into the summary and lists them', async () => {
    const memory = await scripted(
      [{ profile: null }],
      [fact, { ...fact, id: 4, text: 'Odeia prova' }],
      [],
    ).read('u');

    expect(memory.summary).toBe('Gosta de xadrez\nOdeia prova');
    expect(memory.facts.map((f) => f.id)).toEqual([3, 4]);
    expect(memory.profile).toBeNull();
  });

  it('read has an empty summary for a new person', async () => {
    const memory = await scripted([], [], []).read('u');

    expect(memory).toMatchObject({ summary: '', facts: [], sessions: [] });
  });

  it('deleteFact is true when a row of the person went away', async () => {
    await expect(
      scripted([{ '?column?': 1 }]).deleteFact('u', 3),
    ).resolves.toBe(true);
  });

  it('deleteFact is false when the fact is not theirs', async () => {
    await expect(scripted([]).deleteFact('u', 3)).resolves.toBe(false);
  });
});

describe('MemoryRepository unsummarized', () => {
  const question = { id: 9, topic_text: 'Limites', question: 'Por que 0/0?' };

  it('is empty when nothing is pending', async () => {
    await expect(scripted([], []).unsummarized('u')).resolves.toEqual({
      sessionIds: [],
      questionIds: [],
      transcript: '',
    });
  });

  it('returns stop questions even with no session', async () => {
    const result = await scripted([], [question]).unsummarized('u');

    expect(result.sessionIds).toEqual([]);
    expect(result.questionIds).toEqual([9]);
    expect(result.transcript).toBe(
      'Questions on stop cards (source stop):\n- (Limites) Por que 0/0?',
    );
  });

  it('puts the sessions first and the questions after them', async () => {
    const result = await scripted(
      [{ id: 's1' }],
      [question],
      [
        {
          id: 's1',
          kind: 'onboarding',
          slug: null,
          role: 'user',
          content: 'Oi',
        },
      ],
    ).unsummarized('u');

    expect(result.sessionIds).toEqual(['s1']);
    expect(result.questionIds).toEqual([9]);
    expect(result.transcript).toBe(
      'Session (source onboarding):\nuser: Oi\n\nQuestions on stop cards (source stop):\n- (Limites) Por que 0/0?',
    );
  });
});

describe('MemoryRepository saveFacts', () => {
  type Row = { id: number; text: string };
  /** Runs saveFacts on a transaction that answers the locking selects and records the other statements. */
  const run = async ({
    now = [],
    readIds = now.map((f) => f.id),
    facts = [],
    sessionIds = [],
    questionIds = [],
    sessionsLeft = sessionIds.length,
    questionsLeft = questionIds.length,
  }: {
    now?: Row[];
    readIds?: number[];
    facts?: { text: string; source: 'stop' }[];
    sessionIds?: string[];
    questionIds?: number[];
    sessionsLeft?: number;
    questionsLeft?: number;
  }) => {
    const statements: string[] = [];
    const helpers: unknown[] = [];
    const tx = (first: unknown) => {
      if (Array.isArray(first) && 'raw' in first) {
        const q = first.join('?').replace(/\s+/g, ' ').trim();
        statements.push(q);
        if (q.startsWith('select id::int')) return Promise.resolve(now);
        if (q.includes('from public.arandu_sessions'))
          return Promise.resolve(
            Array.from({ length: sessionsLeft }, () => ({})),
          );
        if (q.includes('from public.stop_questions'))
          return Promise.resolve(
            Array.from({ length: questionsLeft }, () => ({})),
          );
        return Promise.resolve([]);
      }
      helpers.push(first);
      return first;
    };
    const sql = { begin: (fn: (t: unknown) => Promise<boolean>) => fn(tx) };
    const saved = await new MemoryRepository(sql as unknown as Sql).saveFacts(
      'u',
      readIds,
      facts,
      sessionIds,
      questionIds,
    );
    const writes = statements.filter((q) => !q.startsWith('select'));
    return { saved, statements, writes, helpers };
  };

  const old = [
    { id: 1, text: 'a' },
    { id: 2, text: 'b' },
  ];

  it('keeps the facts the list repeats, drops the others, inserts the new and marks the folded', async () => {
    const { saved, writes, helpers } = await run({
      now: old,
      facts: [
        { text: 'b', source: 'stop' },
        { text: 'c', source: 'stop' },
      ],
      sessionIds: ['s1'],
      questionIds: [4],
    });

    expect(saved).toBe(true);
    expect(writes).toEqual([
      'delete from public.arandu_facts where id in ?',
      'insert into public.arandu_facts ?',
      'update public.arandu_sessions set summarized_at = now() where id in ?',
      'update public.stop_questions set summarized_at = now() where id in ?',
    ]);
    expect(helpers).toContainEqual([1]);
    expect(helpers).toContainEqual([
      { user_id: 'u', text: 'c', source: 'stop' },
    ]);
  });

  it('writes nothing when the list only repeats what is there and there is nothing to mark', async () => {
    const { saved, writes } = await run({
      now: old,
      facts: [
        { text: 'a', source: 'stop' },
        { text: 'b', source: 'stop' },
      ],
    });

    expect(saved).toBe(true);
    expect(writes).toEqual([]);
  });

  it('cuts a new fact to 300 characters', async () => {
    const { helpers } = await run({
      facts: [{ text: 'x'.repeat(400), source: 'stop' }],
    });

    const [rows] = helpers as [{ text: string }[]];
    expect(rows[0].text).toHaveLength(300);
  });

  it.each([
    ['a fact was deleted meanwhile', { readIds: [1, 2, 3] }],
    ['a fact appeared meanwhile', { readIds: [1] }],
    [
      'a session was forgotten meanwhile',
      { sessionIds: ['s1', 's2'], sessionsLeft: 1 },
    ],
    ['a question was folded meanwhile', { questionIds: [4], questionsLeft: 0 }],
  ])('saves nothing and returns false when %s', async (_, over) => {
    const { saved, writes } = await run({
      now: old,
      facts: [{ text: 'z', source: 'stop' }],
      ...over,
    });

    expect(saved).toBe(false);
    expect(writes).toEqual([]);
  });
});
