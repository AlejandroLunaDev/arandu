import { SHOP } from '../game/game.logic.js';
import { toWallet } from './progress.repository.js';

describe('toWallet', () => {
  it('sends the novelos refill price', () => {
    const wallet = toWallet(
      {
        novelos: 5,
        novelos_at: new Date('2026-03-10T12:00:00.000Z'),
        peixinhos: 0,
        marcadores: 0,
      },
      new Date('2026-03-10T12:00:00.000Z'),
    );
    expect(wallet.refillPrice).toBe(SHOP.novelos);
  });
});
