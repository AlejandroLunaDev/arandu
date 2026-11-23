// What Arandu never says or answers to: a small, conservative pt-BR list of unambiguous slurs and insults.
// Expletives that also carry distress ("porra", "merda", "caralho") are left out on purpose: a crisis message often
// has one, and it must reach the model, which answers it with the crisis rule in VOICE.
// Words that are also career vocabulary (sexualidade, violência, abuso, escroto, retardado, crioulo, piranha) stay out.
const BLOCKED = [
  'viado',
  'boiola',
  'traveco',
  'vadia',
  'vagabunda',
  'putinha',
  'arrombado',
  'arrombada',
  'otario',
  'otaria',
  'babaca',
  'corno',
  'cuzao',
  'buceta',
  'piroca',
  'boquete',
  'punheta',
  'fdp',
  'filho da puta',
  'filha da puta',
  'vai se foder',
  'vai tomar no cu',
  'foda se',
].map(normalize);

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

/** The words of a text as the list compares them: lower case, no accents, leetspeak read, repeated letters once. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]+/g, ' ')
    .replace(/([a-z])\1+/g, '$1')
    .trim();
}

/** True when the text holds a blocked word or phrase, as whole words. */
export function isAbusive(text: string): boolean {
  const words = ` ${normalize(text)} `;
  return BLOCKED.some((w) => words.includes(` ${w} `));
}

/** Arandu's answer instead of the model's when a message, or his own reply, holds a blocked word. */
export const SAFE_REPLY =
  'Essa parte eu deixo passar. Vamos voltar ao que a gente estava conversando: o que mais te chamou atenção até aqui?';
