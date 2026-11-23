import { VOICE } from './arandu.voice.js';
import {
  blocksMessage,
  isAbusive,
  normalize,
  SAFE_LEAD,
  SAFE_REPLY,
} from './arandu.safety.js';

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
    'Em Estatística estudei a fdp da normal',
  ])('is false for %s', (text) => expect(isAbusive(text)).toBe(false));
});

describe('blocksMessage', () => {
  it.each(['seu viado', 'V1@D0'])('is true for %s', (text) =>
    expect(blocksMessage(text)).toBe(true),
  );

  // A blocked word beside a sign of distress is still abusive, but the person is heard, not blocked.
  it.each([
    'Na escola me chamam de viado… quero sumir',
    'Meu padrasto me chama de vagabunda e me bate',
    'meu pai é um filho da puta, ele me bate',
  ])('is false for %s, though it holds a blocked word', (text) => {
    expect(isAbusive(text)).toBe(true);
    expect(blocksMessage(text)).toBe(false);
  });

  it.each([
    'sou um viado nojento, não quero mais viver',
    'sou um otário, quero tirar minha vida',
    'queria estar morto, sou um babaca',
    'tô me cortando, sou uma vadia',
    'vou acabar com tudo, sou um corno',
    'quero me enforcar, arrombado',
    'quero desaparecer, viado',
    'me humilham de viado',
  ])('is false for the crisis message %s', (text) =>
    expect(blocksMessage(text)).toBe(false),
  );

  it.each([
    'vai tomar no cu',
    'seu otário de merda',
    'arandu seu corno',
    'boiola',
    'vc é um babaca',
    'seu gato viado',
    'arrombado',
    'filho da puta',
  ])('is true for %s', (text) => expect(blocksMessage(text)).toBe(true));

  // A crisis or a person talking about themselves, even short, reaches the model: no list holds every way to say it.
  it.each([
    'quero me jogar do prédio, sou um lixo viado',
    'vou pular da janela, sou uma vadia',
    'vou tomar todos os remédios, babaca',
    'quero que tudo acabe, sou um otario',
    'não quero existir, viado',
    'queria nunca ter nascido, sou um corno',
    'tô me automutilando, sou uma vadia',
    'me odeio viado',
    'me sinto um lixo, otário',
    'ninguém se importa comigo, babaca',
    'meu padrasto me espanca e me chama de vagabunda',
    'me zoam de viado na escola todo dia',
    'me tratam como viado',
  ])('is false for the message about the person themselves: %s', (text) =>
    expect(blocksMessage(text)).toBe(false),
  );

  it('sends a long insult with no distress or self word to the model', () => {
    const text = 'vai tomar no cu seu gato preto idiota';
    expect(isAbusive(text)).toBe(true);
    expect(blocksMessage(text)).toBe(false);
  });

  // "foda se" is no longer blocked, so this one never reaches the distress check.
  it('is false for Foda-se, não aguento mais, quero morrer', () => {
    expect(blocksMessage('Foda-se, não aguento mais, quero morrer')).toBe(
      false,
    );
  });
});

describe('SAFE_REPLY', () => {
  it('starts with SAFE_LEAD', () => {
    expect(SAFE_REPLY.startsWith(SAFE_LEAD)).toBe(true);
  });

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
