import { toWallet } from './progress.repository.js';

const NOW = new Date('2026-03-10T15:00:00.000Z');
const row = {
  novelos: 3,
  novelos_at: NOW,
  peixinhos: 0,
  marcadores: 0,
  novelos_bought: 0,
  novelos_bought_on: null,
};

describe('toWallet', () => {
  it('prices the next novelo by the purchases of today', () => {
    const wallet = toWallet(
      { ...row, novelos_bought: 2, novelos_bought_on: '2026-03-10' },
      NOW,
    );
    expect(wallet.refillPrice).toBe(35);
  });

  it('prices from 15 when the purchases are from another day', () => {
    const wallet = toWallet(
      { ...row, novelos_bought: 4, novelos_bought_on: '2026-03-09' },
      NOW,
    );
    expect(wallet.refillPrice).toBe(15);
  });

  it('has no next novelo when full', () => {
    const wallet = toWallet(row, NOW);
    expect(wallet).toMatchObject({ novelos: 3, maxNovelos: 3 });
    expect(wallet.nextNoveloAt).toBeNull();
  });

  it('brings every novelo back at the next São Paulo midnight', () => {
    expect(toWallet({ ...row, novelos: 1 }, NOW).nextNoveloAt).toBe(
      '2026-03-11T03:00:00.000Z',
    );
  });

  it('clamps an old 5-novelo row to 3', () => {
    const wallet = toWallet({ ...row, novelos: 5 }, NOW);
    expect(wallet.novelos).toBe(3);
    expect(wallet.nextNoveloAt).toBeNull();
  });
});
