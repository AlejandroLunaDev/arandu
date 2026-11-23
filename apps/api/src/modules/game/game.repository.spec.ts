import type { ProgressRepository } from '../progress/progress.repository.js';
import { GameRepository } from './game.repository.js';
import type { Sql } from '../../core/database/database.module.js';

const NOW = new Date('2026-03-10T15:00:00.000Z');

describe('GameRepository.buy novelos', () => {
  const lockWallet = vi.fn();
  const tx = vi.fn();
  const repo = new GameRepository(
    { begin: (fn: (t: unknown) => unknown) => fn(tx) } as unknown as Sql,
    { lockWallet } as unknown as ProgressRepository,
  );
  const wallet = (over: object) => ({
    novelos: 0,
    novelos_at: NOW,
    peixinhos: 100,
    marcadores: 0,
    novelos_bought: 0,
    novelos_bought_on: '2026-03-10',
    ...over,
  });

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('refuses with 409 novelos_left while a novelo is left', async () => {
    lockWallet.mockResolvedValue(wallet({ novelos: 1 }));
    await expect(repo.buy('u', 'novelos')).rejects.toMatchObject({
      status: 409,
      response: { code: 'novelos_left' },
    });
    expect(tx).not.toHaveBeenCalled();
  });

  it('refuses at 0 on a new day, when the novelos came back by themselves', async () => {
    lockWallet.mockResolvedValue(
      wallet({ novelos_at: new Date('2026-03-09T15:00:00.000Z') }),
    );
    await expect(repo.buy('u', 'novelos')).rejects.toMatchObject({
      response: { code: 'novelos_left' },
    });
  });

  it.each([
    [0, 14],
    [1, 19],
    [2, 34],
    [3, 49],
  ])(
    'refuses with 409 not_enough_peixinhos at %i bought and %i peixinhos',
    async (bought, peixinhos) => {
      lockWallet.mockResolvedValue(
        wallet({ novelos_bought: bought, peixinhos }),
      );
      await expect(repo.buy('u', 'novelos')).rejects.toMatchObject({
        status: 409,
        response: { code: 'not_enough_peixinhos' },
      });
      expect(tx).not.toHaveBeenCalled();
    },
  );

  it('charges the price of the day and returns one novelo', async () => {
    lockWallet.mockResolvedValue(wallet({ novelos_bought: 1 }));
    tx.mockResolvedValue([
      wallet({ novelos: 1, peixinhos: 80, novelos_bought: 2 }),
    ]);
    const bought = await repo.buy('u', 'novelos');
    expect(tx.mock.calls.flatMap((call) => call.slice(1))).toContain(20);
    expect(bought).toMatchObject({
      novelos: 1,
      peixinhos: 80,
      refillPrice: 35,
    });
  });
});
