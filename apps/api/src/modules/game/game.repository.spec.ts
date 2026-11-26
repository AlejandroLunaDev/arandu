import type { ProgressRepository } from '../progress/progress.repository.js';
import { GameRepository } from './game.repository.js';
import type { Sql } from '../../core/database/database.module.js';

describe('GameRepository.buy marcador', () => {
  const lockWallet = vi.fn();
  const tx = vi.fn();
  const repo = new GameRepository(
    { begin: (fn: (t: unknown) => unknown) => fn(tx) } as unknown as Sql,
    { lockWallet } as unknown as ProgressRepository,
  );
  const wallet = (over: object) => ({
    peixinhos: 100,
    currency: 0,
    marcadores: 0,
    ...over,
  });

  beforeEach(() => vi.clearAllMocks());

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

  it('charges its price and returns the wallet', async () => {
    lockWallet.mockResolvedValue(wallet({}));
    tx.mockResolvedValue([wallet({ peixinhos: 50, marcadores: 1 })]);
    const bought = await repo.buy('u', 'marcador');
    expect(tx.mock.calls.flatMap((call) => call.slice(1))).toContain(50);
    expect(bought).toMatchObject({ peixinhos: 50, marcadores: 1 });
  });
});
