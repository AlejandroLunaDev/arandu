import type { ProgressRepository } from '../progress/progress.repository.js';
import { GameRepository } from './game.repository.js';
import type { Sql } from '../../core/database/database.module.js';

describe('GameRepository shop', () => {
  const lockWallet = vi.fn();
  const tx = Object.assign(vi.fn(), { json: (v: unknown) => v });
  const repo = new GameRepository(
    { begin: (fn: (t: unknown) => unknown) => fn(tx) } as unknown as Sql,
    { lockWallet } as unknown as ProgressRepository,
  );
  const wallet = (over: object) => ({
    peixinhos: 100,
    currency: 0,
    marcadores: 0,
    vidas: 0,
    ...over,
  });
  /** Answers each query by its text: `replies` maps a fragment of the SQL to its rows; anything else gets the wallet. */
  const reply = (replies: Record<string, unknown[]>) =>
    tx.mockImplementation((strings: TemplateStringsArray | string) => {
      const text = Array.isArray(strings) ? strings.join('?') : '';
      const hit = Object.keys(replies).find((k) => text.includes(k));
      return Promise.resolve(hit ? replies[hit] : [wallet({})]);
    });
  /** The values of the wallet update: peixinhos, currency, vidas, marcadores changes. */
  const change = () => {
    const call = tx.mock.calls.find(([s]) =>
      Array.isArray(s) ? s.join('').includes('update public.wallets') : false,
    );
    return call?.slice(1, 5);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    reply({});
  });

  it('refuses with 409 marcadores_full with every page marker held', async () => {
    lockWallet.mockResolvedValue(wallet({ marcadores: 2 }));
    await expect(repo.buy('u', 'marcador')).rejects.toMatchObject({
      status: 409,
      response: { code: 'marcadores_full' },
    });
    expect(tx).not.toHaveBeenCalled();
  });

  it('refuses with 409 not_enough_peixinhos below its price', async () => {
    lockWallet.mockResolvedValue(wallet({ peixinhos: 49 }));
    await expect(repo.buy('u', 'marcador')).rejects.toMatchObject({
      status: 409,
      response: { code: 'not_enough_peixinhos' },
    });
    expect(tx).not.toHaveBeenCalled();
  });

  it('charges a page marker 50 peixinhos and returns the wallet', async () => {
    lockWallet.mockResolvedValue(wallet({}));
    const bought = await repo.buy('u', 'marcador');
    expect(change()).toEqual([-50, 0, 0, 1]);
    expect(bought).toMatchObject({ wallet: { peixinhos: 100 }, caixaId: null });
  });

  it('refuses with 409 not_enough_currency below its price, and takes nothing', async () => {
    lockWallet.mockResolvedValue(wallet({ currency: 9 }));
    await expect(repo.buy('u', 'caixa_premium')).rejects.toMatchObject({
      status: 409,
      response: { code: 'not_enough_currency' },
    });
    expect(tx).not.toHaveBeenCalled();
  });

  it.each([
    ['peixinhos', [15, -2, 0, 0]],
    ['vida', [0, -2, 1, 0]],
  ] as const)('gives %s at once for 2 currency', async (item, expected) => {
    lockWallet.mockResolvedValue(wallet({ currency: 2 }));
    await repo.buy('u', item);
    expect(change()).toEqual(expected);
  });

  it('a caixa only charges and adds a shop caixa, to be rolled when opened', async () => {
    lockWallet.mockResolvedValue(wallet({ currency: 6 }));
    reply({ 'insert into public.caixas': [{ id: 9 }] });

    const bought = await repo.buy('u', 'caixa_media');

    const insert = tx.mock.calls.find(([s]) =>
      (s as string[]).join('').includes('insert into public.caixas'),
    );
    expect(insert).toContain('shop:caixa_media:');
    expect(change()).toEqual([0, -6, 0, 0]);
    expect(bought.caixaId).toBe(9);
  });

  it("refuses the week's promotion a second time with 409 promotion_bought", async () => {
    lockWallet.mockResolvedValue(wallet({ currency: 8 }));
    reply({
      "date_trunc('week'": [{ monday: '2026-11-23' }],
      'insert into public.shop_promotions': [],
    });
    await expect(repo.buy('u', 'promotion')).rejects.toMatchObject({
      status: 409,
      response: { code: 'promotion_bought' },
    });
    expect(change()).toBeUndefined();
  });

  it("charges the week's promotion 4 currency", async () => {
    lockWallet.mockResolvedValue(wallet({ currency: 4 }));
    reply({
      "date_trunc('week'": [{ monday: '2026-11-23' }],
      'insert into public.shop_promotions': [1],
    });
    await repo.buy('u', 'promotion');
    expect(change()?.[1]).toBe(-4);
  });

  it("opens a bought caixa within its tier's ranges, adding its extra lives and never the currency", async () => {
    lockWallet.mockResolvedValue(wallet({}));
    const at = new Date();
    reply({
      'select opened_at': [{ opened: false, reason: 'shop:caixa_premium:x' }],
      // Stored before #153: no vidas.
      'update public.caixas': [
        {
          id: 9,
          reason: 'shop:caixa_premium:x',
          created_at: at,
          opened_at: at,
          contents: { peixinhos: 50 },
        },
      ],
    });

    const opened = await repo.open('u', 9);

    const update = tx.mock.calls.find(([s]) =>
      Array.isArray(s) ? s.join('').includes('update public.wallets') : false,
    );
    const [peixinhos, currency, vidas] = update!.slice(1, 4) as number[];
    expect(peixinhos).toBeGreaterThanOrEqual(40);
    expect(peixinhos).toBeLessThanOrEqual(60);
    expect(currency).toBe(0);
    expect([1, 2]).toContain(vidas);
    expect(opened.contents?.vidas).toBe(0);
  });
});
