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
  ['saveSummary', (r) => r.saveSummary('u', 'resumo', ['s1'])],
];

describe('MemoryRepository writes for a deleted account', () => {
  it.each(writes)(
    '%s maps the user FK violation to PersonGoneError',
    async (_, write) => {
      for (const constraint of [
        'arandu_memories_user_id_fkey',
        'arandu_sessions_user_id_fkey',
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
