import { ProgressRepository, toWallet } from './progress.repository.js';
import {
  CONTINUE_PRICE,
  DAILY_PEIXINHOS,
  LESSON_PRICE,
} from './progress.logic.js';
import type { Sql } from '../../core/database/database.module.js';

const NOW = new Date('2026-03-10T15:00:00.000Z');
const row = { peixinhos: 30, currency: 2, marcadores: 1 };

describe('toWallet', () => {
  it('gives the balances, the prices and the next top-up at São Paulo midnight', () => {
    expect(toWallet(row, NOW)).toEqual({
      peixinhos: 30,
      dailyPeixinhos: DAILY_PEIXINHOS,
      nextRefillAt: '2026-03-11T03:00:00.000Z',
      lessonPrice: LESSON_PRICE,
      currency: 2,
      continuePrice: CONTINUE_PRICE,
      marcadores: 1,
    });
  });
});

describe('ProgressRepository wallet', () => {
  /** A transaction that answers every query with the wallet row; `tx('column')`, an identifier, is its name. */
  const tx = vi.fn((strings: TemplateStringsArray | string) =>
    typeof strings === 'string' ? strings : Promise.resolve([row]),
  );
  const sql = { begin: (fn: (t: unknown) => unknown) => fn(tx) };
  const repo = new ProgressRepository(sql as unknown as Sql);
  const queries = () =>
    tx.mock.calls.map(([strings]) =>
      typeof strings === 'string' ? '' : strings.join('?'),
    );

  beforeEach(() => tx.mockClear());

  it('tops the peixinhos up for the day before it reads the wallet', async () => {
    await repo.lockWallet(tx as never, 'u');
    const all = queries();
    const topUp = all.findIndex((q) => q.includes('greatest(peixinhos'));
    expect(topUp).toBeGreaterThan(0);
    expect(all.findIndex((q) => q.includes('for update'))).toBeGreaterThan(
      topUp,
    );
    expect(all[topUp]).toContain('peixinhos_on is distinct from');
    expect(tx.mock.calls[topUp]).toContain(DAILY_PEIXINHOS);
  });

  it.each([
    ['peixinhos', 'not_enough_peixinhos'],
    ['currency', 'not_enough_currency'],
  ] as const)(
    'refuses with 409 when the %s are too few, and takes nothing',
    async (what, code) => {
      await expect(repo.pay('u', what, 31)).rejects.toMatchObject({
        status: 409,
        response: { code },
      });
      expect(queries().some((q) => q.includes(' - '))).toBe(false);
    },
  );

  it('takes the amount when there is enough', async () => {
    await expect(repo.pay('u', 'peixinhos', 30)).resolves.toMatchObject({
      peixinhos: 30,
    });
    const charge = queries().findIndex((q) => q.includes(' - '));
    expect(tx.mock.calls[charge]).toContain(30);
  });
});
