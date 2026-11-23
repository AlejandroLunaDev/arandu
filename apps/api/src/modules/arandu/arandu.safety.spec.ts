import { VOICE } from './arandu.voice.js';
import { isAbusive, normalize, SAFE_REPLY } from './arandu.safety.js';

describe('normalize', () => {
  it.each([
    ['Violência', 'violencia'],
    ['v14d0', 'viado'],
    ['viaaado', 'viado'],
    ['f.d.p', 'f d p'],
  ])('%s becomes %s', (text, want) => {
    expect(normalize(text)).toBe(want);
  });
});

describe('isAbusive', () => {
  it.each(['seu viado', 'V1@D0', 'vai se foder', 'arrombado', 'BOIOLA!'])(
    'is true for %s',
    (text) => expect(isAbusive(text)).toBe(true),
  );

  // The dots split the letters into separate words, so the whole-word match misses it: a known limit.
  it('is false for f.d.p, which normalizes to separate letters', () => {
    expect(isAbusive('f.d.p')).toBe(false);
  });

  it.each([
    'sexualidade',
    'violência doméstica no Direito',
    'abuso infantil e o Serviço Social',
    'computador',
    'escroto',
    'movimento retardado',
    'porra, não aguento mais',
    'quero morrer',
  ])('is false for %s', (text) => expect(isAbusive(text)).toBe(false));
});

describe('SAFE_REPLY', () => {
  it('ends with exactly one question mark', () => {
    expect(SAFE_REPLY.endsWith('?')).toBe(true);
    expect(SAFE_REPLY.match(/\?/g)).toHaveLength(1);
  });
});

describe('VOICE', () => {
  it.each(['188', 'cvv.org.br', '190'])('mentions %s', (s) => {
    expect(VOICE).toContain(s);
  });
});
