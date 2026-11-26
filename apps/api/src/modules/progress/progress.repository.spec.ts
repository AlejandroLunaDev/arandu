import { ProgressRepository, toWallet } from './progress.repository.js';
import {
  CONTINUE_PRICE,
  DAILY_PEIXINHOS,
  LESSON_PRICE,
} from './progress.logic.js';
import type { Sql } from '../../core/database/database.module.js';

const NOW = new Date('2026-03-10T15:00:00.000Z');
const row = {
  peixinhos: 30,
  currency: 2,
  marcadores: 1,
  vidas: 0,
  giftDue: false,
};

describe('toWallet', () => {
  it('gives the balances, the prices and the next gift at São Paulo midnight', () => {
    expect(toWallet(row, NOW)).toEqual({
      peixinhos: 30,
      dailyPeixinhos: DAILY_PEIXINHOS,
      dailyGift: 0,
      nextRefillAt: '2026-03-11T03:00:00.000Z',
      lessonPrice: LESSON_PRICE,
      currency: 2,
      continuePrice: CONTINUE_PRICE,
      marcadores: 1,
      vidas: 0,
    });
  });

  it("offers what is missing to reach the day's peixinhos while the gift is due", () => {
    expect(toWallet({ ...row, giftDue: true }, NOW).dailyGift).toBe(
      DAILY_PEIXINHOS - 30,
    );
    expect(
      toWallet({ ...row, peixinhos: DAILY_PEIXINHOS + 5, giftDue: true }, NOW)
        .dailyGift,
    ).toBe(0);
  });
});

describe('ProgressRepository wallet', () => {
  /** Answers every query with `answer` (none when undefined); `tx('column')`, an identifier, is its name. */
  let answer: typeof row | undefined = row;
  const tx = vi.fn((strings: TemplateStringsArray | string) =>
    typeof strings === 'string'
      ? strings
      : Promise.resolve(answer ? [answer] : []),
  );
  const sql = Object.assign(tx, {
    begin: (fn: (t: unknown) => unknown) => fn(tx),
  });
  const repo = new ProgressRepository(sql as unknown as Sql);
  const queries = () =>
    tx.mock.calls.map(([strings]) =>
      typeof strings === 'string' ? '' : strings.join('?'),
    );
  const gives = (q: string) => q.includes('peixinhos = peixinhos +');

  beforeEach(() => {
    tx.mockClear();
    answer = row;
  });

  it("creates a new wallet with a day's peixinhos, not the column default, then locks it", async () => {
    await repo.lockWallet(tx as never, 'u');
    const all = queries();
    expect(all[0]).toContain('insert into public.wallets (user_id, peixinhos)');
    expect(tx.mock.calls[0]).toContain(DAILY_PEIXINHOS);
    expect(all.findIndex((q) => q.includes('for update'))).toBeGreaterThan(0);
  });

  it("gives the day's gift once due, after the lock: what is missing to reach the day's peixinhos", async () => {
    answer = { ...row, giftDue: true };
    await expect(repo.dailyGift('u')).resolves.toMatchObject({
      peixinhos: DAILY_PEIXINHOS - 30,
    });
    const all = queries();
    const give = all.findIndex(gives);
    expect(give).toBeGreaterThan(
      all.findIndex((q) => q.includes('for update')),
    );
    expect(all[give]).toContain('peixinhos_on =');
    expect(tx.mock.calls[give]).toContain(DAILY_PEIXINHOS - 30);
  });

  it('gives nothing once the day’s gift was given', async () => {
    await expect(repo.dailyGift('u')).resolves.toMatchObject({ peixinhos: 0 });
    expect(queries().some(gives)).toBe(false);
  });

  it('gives a gift still due before spending, so it never blocks a lesson', async () => {
    answer = { ...row, giftDue: true };
    await repo.pay('u', 'peixinhos', 15);
    const all = queries();
    const give = all.findIndex(gives);
    expect(give).toBeGreaterThan(0);
    expect(give).toBeLessThan(all.findIndex((q) => q.includes(' - ')));
  });

  it('reads the wallet without giving the gift', async () => {
    answer = { ...row, giftDue: true };
    await expect(repo.wallet('u')).resolves.toMatchObject({
      peixinhos: 30,
      dailyGift: DAILY_PEIXINHOS - 30,
    });
    expect(
      queries().some((q) => q.includes('update') || q.includes('insert')),
    ).toBe(false);
  });

  it("shows a person with no wallet yet a day's peixinhos and no gift", async () => {
    answer = undefined;
    await expect(repo.wallet('u')).resolves.toMatchObject({
      peixinhos: DAILY_PEIXINHOS,
      dailyGift: 0,
    });
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
