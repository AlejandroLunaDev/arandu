import type { Exercise } from '@arandu/contracts';
import { describe, expect, it } from 'vitest';
import {
  type ChapterPieces,
  composeChapter,
  composeLesson,
  tapSegments,
} from './composer.js';
import type { Piece } from './pieces.js';

const pieces: Piece[] = [
  {
    type: 'conceito',
    term: 'Paleoantropologia',
    definition: 'Estudo dos ancestrais humanos pelos fósseis.',
  },
  {
    type: 'conceito',
    term: 'Seleção sexual',
    definition: 'Escolha de parceiros que molda traços.',
  },
  {
    type: 'conceito',
    term: 'Antropoceno',
    definition: 'Época marcada pela ação humana.',
  },
  {
    type: 'afirmacao',
    right: 'Humanos e chimpanzés têm um ancestral comum.',
    wrong: 'Humanos e chimpanzés não têm um ancestral comum.',
    why: 'Têm.',
  },
  {
    type: 'afirmacao',
    right: 'Fósseis ajudam a datar espécies antigas.',
    wrong: 'Fósseis nunca ajudam a datar espécies antigas.',
    why: 'Ajudam.',
  },
  {
    type: 'afirmacao',
    right: 'O Antropoceno é uma época recente.',
    wrong: 'O Antropoceno é uma época muito antiga.',
    why: 'É recente.',
  },
  {
    type: 'caso',
    situation: 'Um pavão de cauda enorme atrai mais fêmeas.',
    term: 'Seleção sexual',
    why: 'É escolha de parceiros.',
  },
  {
    type: 'classificacao',
    prompt: 'Separe em biológico e cultural.',
    baskets: ['Biológico', 'Cultural'],
    items: [
      { text: 'Bipedalismo', basket: 0 },
      { text: 'Arte rupestre', basket: 1 },
      { text: 'Cérebro maior', basket: 0 },
      { text: 'Linguagem escrita', basket: 1 },
    ],
    why: 'Uns vêm do corpo, outros da cultura.',
  },
  {
    type: 'problema',
    statement: 'As notas foram {a} e {b}. Qual é a média?',
    numbers: [
      { name: 'a', min: 2, max: 10, step: 1 },
      { name: 'b', min: 2, max: 10, step: 1 },
    ],
    booleans: [],
    answer: '(a + b) / 2',
    decimals: 1,
    unit: '',
    mistakes: [{ formula: 'a + b', why: 'Somou sem dividir.' }],
    example: [
      { name: 'a', value: 4 },
      { name: 'b', value: 8 },
    ],
    exampleAnswer: 6,
    why: 'A média soma e divide pela quantidade.',
  },
  {
    type: 'codigo',
    prompt: 'Some os números de 1 a n.',
    language: 'python',
    lines: [
      'total = 0',
      'for i in range(1, n + 1):',
      '    total = total + i',
      'print(total)',
    ],
    blank: { line: 1, token: 'range' },
    distractors: ['len', 'print'],
    why: 'range gera os números do laço.',
  },
  {
    type: 'frase',
    words: ['Fósseis', 'contam', 'a', 'evolução'],
    distractors: ['mentem'],
    why: 'Ideia central.',
  },
  {
    type: 'pergunta',
    prompt: 'Por que somos primatas?',
    ideas: ['ancestral comum', 'traços compartilhados'],
    why: 'Parentesco.',
  },
];
const chapter: ChapterPieces = { topic: 2, pieces };
const other: ChapterPieces = {
  topic: 0,
  pieces: [
    {
      type: 'conceito',
      term: 'Primata',
      definition: 'Ordem de mamíferos com mãos que agarram.',
    },
    {
      type: 'afirmacao',
      right: 'Primatas têm polegar opositor.',
      wrong: 'Primatas não têm polegar opositor.',
      why: 'Têm.',
    },
  ],
};

const kinds = (list: { exercise: Exercise }[]) =>
  list.map((c) => c.exercise.kind);

/** Every choice has its answer among distinct options, and every option list is clean. */
function wellFormed(e: Exercise) {
  if (
    e.kind === 'escolha_uma' ||
    e.kind === 'escolha_a_frase_certa' ||
    e.kind === 'resolva'
  ) {
    expect(new Set(e.options).size).toBe(e.options.length);
    expect(e.options.length).toBeGreaterThanOrEqual(2);
    expect(e.options[e.answer]).toBeDefined();
  }
  if (e.kind === 'complete_a_frase') {
    expect(e.text.split('___').length - 1).toBe(e.answers.length);
    for (const a of e.answers) expect(e.tiles).toContain(a);
  }
  if (e.kind === 'toque_no_trecho') expect(e.segments[e.answer]).toBeDefined();
}

describe('composeLesson', () => {
  it('lesson 1 recognises concepts and statements', () => {
    const lesson = composeLesson(chapter, [other], 1, 'ana:7:2');
    expect(kinds(lesson)).toEqual([
      'escolha_uma',
      'escolha_uma',
      'verdadeiro_ou_falso',
    ]);
    const vf = lesson[2]!.exercise;
    // Shown right and wrong: at least one of each.
    if (vf.kind === 'verdadeiro_ou_falso')
      expect(new Set(vf.statements.map((s) => s.answer)).size).toBe(2);
  });

  it('lesson 2 applies: the case, the right sentence, the wrong stretch, the baskets', () => {
    expect(kinds(composeLesson(chapter, [other], 2, 'ana:7:2'))).toEqual([
      'escolha_uma',
      'escolha_a_frase_certa',
      'toque_no_trecho',
      'separe_nas_cestas',
    ]);
  });

  it('lesson 3 solves and produces, and ends with the open question', () => {
    const list = kinds(composeLesson(chapter, [other], 3, 'ana:7:2'));
    expect(list[0]).toBe('resolva');
    expect(list).toContain('monte_a_frase');
    expect(list.some((k) => k === 'ordene' || k === 'complete_a_frase')).toBe(
      true,
    );
    expect(list.at(-1)).toBe('explique_para_o_arandu');
  });

  it('gives the same person the same lesson, and other people other variants', () => {
    const play = (seed: string) =>
      JSON.stringify(composeLesson(chapter, [other], 3, seed));
    expect(play('ana:7:2')).toBe(play('ana:7:2'));
    const variants = new Set(
      Array.from({ length: 10 }, (_, i) => play(`p${i}:7:2`)),
    );
    expect(variants.size).toBeGreaterThan(1);
  });

  it('tests the same pieces whatever other chapters the subject has', () => {
    const refs = (others: ChapterPieces[]) =>
      [1, 2, 3].flatMap((l) =>
        composeLesson(chapter, others, l, 'ana:7:2').map((c) => c.ref),
      );
    expect(refs([other])).toEqual(refs([]));
  });

  it('builds only well-formed exercises, for many people', () => {
    for (let i = 0; i < 30; i++)
      for (const lesson of [1, 2, 3])
        for (const c of composeLesson(chapter, [other], lesson, `p${i}`))
          wellFormed(c.exercise);
  });

  it('gives a problem new values, with its mistake on each wrong option', () => {
    const plays = Array.from(
      { length: 10 },
      (_, i) => composeLesson(chapter, [], 3, `p${i}`)[0]!.exercise,
    );
    expect(
      new Set(plays.map((e) => (e.kind === 'resolva' ? e.prompt : ''))).size,
    ).toBeGreaterThan(1);
    for (const e of plays)
      if (e.kind === 'resolva')
        e.mistakes.forEach((m, i) => expect(m === null).toBe(i === e.answer));
  });

  it('fills a thin lesson with more concepts and statements', () => {
    const thin: ChapterPieces = {
      topic: 0,
      pieces: pieces.filter(
        (p) =>
          p.type === 'conceito' ||
          p.type === 'afirmacao' ||
          p.type === 'pergunta',
      ),
    };
    for (const lesson of [1, 2, 3])
      expect(
        composeLesson(thin, [], lesson, 'x').length,
      ).toBeGreaterThanOrEqual(3);
  });
});

describe('composeChapter', () => {
  it('holds lessons 1-3 on a fixed seed, the open question included', () => {
    const list = composeChapter(chapter, '7:2');
    expect(list).toEqual(composeChapter(chapter, '7:2'));
    expect(list.map((e) => e.kind)).toContain('explique_para_o_arandu');
  });

  it("takes wrong options from the subject's other chapters, so a chapter with two concepts plays them", () => {
    const two: ChapterPieces = {
      topic: 2,
      pieces: [
        ...pieces.filter((p) => p.type === 'conceito').slice(0, 2),
        ...pieces.filter((p) => p.type !== 'conceito'),
      ],
    };
    const conceptChoices = (others: ChapterPieces[]) =>
      composeChapter(two, '7:2', others).filter(
        (e) =>
          e.kind === 'escolha_uma' && e.prompt.startsWith('A qual conceito'),
      ).length;

    expect(conceptChoices([])).toBe(0);
    expect(conceptChoices([other])).toBeGreaterThan(0);
  });
});

describe('tapSegments', () => {
  it('cuts the wrong sentence around the changed stretch', () => {
    expect(
      tapSegments(
        'A célula tem núcleo definido',
        'A célula não tem núcleo definido',
      ),
    ).toEqual({
      segments: ['A célula', 'não', 'tem núcleo', 'definido'],
      answer: 1,
    });
  });

  it('refuses a change longer than six words', () => {
    expect(tapSegments('a b c', 'a x1 x2 x3 x4 x5 x6 x7 c')).toBeNull();
  });

  it('refuses a sentence too short to cut in three', () => {
    expect(tapSegments('Sim', 'Não')).toBeNull();
  });
});
