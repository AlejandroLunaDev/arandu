import { describe, expect, it } from 'vitest';
import {
  basicsDraft,
  enoughPieces,
  piecesOf,
  type PiecesDraft,
} from './pieces.js';

type Problem = PiecesDraft['problems'][number];

const mean: Problem = {
  statement: 'As notas foram {a}, {b} e {c}. Qual é a média?',
  numbers: [
    { name: 'a', min: 2, max: 10, step: 1 },
    { name: 'b', min: 2, max: 10, step: 1 },
    { name: 'c', min: 2, max: 10, step: 1 },
  ],
  booleans: [],
  answer: '(a + b + c) / 3',
  decimals: 1,
  unit: '',
  mistakes: [{ formula: 'a + b + c', why: 'Somou sem dividir.' }],
  example: [
    { name: 'a', value: 4 },
    { name: 'b', value: 7 },
    { name: 'c', value: 10 },
  ],
  exampleAnswer: 7,
  why: 'A média soma os valores e divide pela quantidade.',
};

const draft = (over: Partial<PiecesDraft> = {}): PiecesDraft => ({
  concepts: [
    {
      term: 'Paleoantropologia',
      definition: 'Estudo dos ancestrais humanos pelos fósseis.',
    },
    {
      term: 'Seleção sexual',
      definition: 'Escolha de parceiros que molda traços.',
    },
    { term: 'Antropoceno', definition: 'Época marcada pela ação humana.' },
    { term: 'Bipedalismo', definition: 'Andar sobre duas pernas.' },
  ],
  statements: [
    {
      right: 'Humanos e chimpanzés têm um ancestral comum.',
      wrong: 'Humanos descendem dos chimpanzés.',
      why: 'Têm um ancestral comum.',
    },
    {
      right: 'Fósseis ajudam a datar espécies.',
      wrong: 'Fósseis não ajudam a datar espécies.',
      why: 'Ajudam.',
    },
    {
      right: 'O Antropoceno é recente.',
      wrong: 'O Antropoceno é antigo.',
      why: 'É recente.',
    },
  ],
  classification: [
    {
      prompt: 'Separe em biológico e cultural.',
      baskets: { first: 'Biológico', second: 'Cultural' },
      items: [
        { text: 'Bipedalismo', basket: 0 },
        { text: 'Arte rupestre', basket: 1 },
        { text: 'Cérebro maior', basket: 0 },
        { text: 'Linguagem escrita', basket: 1 },
      ],
      why: 'Uns vêm do corpo, outros da cultura.',
    },
  ],
  sequence: [],
  sentence: [
    {
      words: ['Fósseis', 'contam', 'a', 'evolução'],
      distractors: ['mentem'],
      why: 'É a ideia central.',
    },
  ],
  question: {
    prompt: 'Por que somos primatas?',
    ideas: ['ancestral comum', 'traços compartilhados'],
    why: 'Por parentesco.',
  },
  cases: [
    {
      situation: 'Um pavão de cauda enorme atrai mais fêmeas.',
      term: 'seleção sexual',
      why: 'É escolha de parceiros.',
    },
  ],
  problems: [],
  code: [],
  ...over,
});

const types = (d: PiecesDraft) => piecesOf(d).map((p) => p.type);

describe('piecesOf', () => {
  it('drops a part out of range alone: the schema takes it, piecesOf keeps the rest of the draft', () => {
    const [sorting] = draft().classification;
    const loose = basicsDraft.parse({
      ...draft(),
      // Two classifications (one is kept), a sentence of two words and a question with one idea.
      classification: [sorting, sorting],
      sentence: [{ words: ['Fósseis', 'contam'], distractors: [], why: 'w' }],
      question: { prompt: 'Por quê?', ideas: ['uma'], why: 'w' },
    });

    expect(types({ ...draft(), ...loose })).toEqual([
      'conceito',
      'conceito',
      'conceito',
      'conceito',
      'afirmacao',
      'afirmacao',
      'afirmacao',
      'classificacao',
      'caso',
    ]);
    expect(
      types(
        draft({
          classification: [{ ...sorting!, items: sorting!.items.slice(0, 3) }],
        }),
      ),
    ).not.toContain('classificacao');
  });

  it('keeps every consistent piece, and enoughPieces accepts the set', () => {
    const pieces = piecesOf(draft({ problems: [mean] }));
    expect(pieces.map((p) => p.type)).toEqual([
      'conceito',
      'conceito',
      'conceito',
      'conceito',
      'afirmacao',
      'afirmacao',
      'afirmacao',
      'classificacao',
      'frase',
      'pergunta',
      'caso',
      'problema',
    ]);
    expect(enoughPieces(pieces)).toBe(true);
  });

  it("gives a case its concept's own term", () => {
    const caso = piecesOf(draft()).find((p) => p.type === 'caso');
    expect(caso).toMatchObject({ term: 'Seleção sexual' });
  });

  it.each<[string, Partial<PiecesDraft>, string]>([
    [
      'a statement whose wrong version is the right one',
      { statements: [{ right: 'A b.', wrong: 'a B.', why: 'x' }] },
      'afirmacao',
    ],
    [
      'a basket other than 0 or 1',
      {
        classification: [
          {
            ...draft().classification[0]!,
            items: [
              ...draft().classification[0]!.items,
              { text: 'Fogo', basket: 2 },
            ],
          },
        ],
      },
      'classificacao',
    ],
    [
      'a classification with one basket empty',
      {
        classification: [
          {
            ...draft().classification[0]!,
            items: draft().classification[0]!.items.map((i) => ({
              ...i,
              basket: 0,
            })),
          },
        ],
      },
      'classificacao',
    ],
    [
      'a distractor that is a word of the sentence',
      { sentence: [{ words: ['a', 'b', 'c'], distractors: ['B'], why: 'x' }] },
      'frase',
    ],
    [
      'a case about no concept of the chapter',
      { cases: [{ situation: 's', term: 'Genética', why: 'x' }] },
      'caso',
    ],
  ])('drops %s', (_, over, type) => {
    expect(types(draft(over))).not.toContain(type);
  });

  describe('problems', () => {
    it('keeps a boolean problem whose example adds up', () => {
      const logic: Problem = {
        ...mean,
        statement: 'Se p é {p} e q é {q}, quanto vale p -> q?',
        numbers: [],
        booleans: ['p', 'q'],
        answer: 'p -> q',
        decimals: 0,
        mistakes: [{ formula: 'p and q', why: 'Confundiu com o "e".' }],
        example: [
          { name: 'p', value: 1 },
          { name: 'q', value: 0 },
        ],
        exampleAnswer: 0,
      };
      expect(types(draft({ problems: [logic] }))).toContain('problema');
    });

    it.each<[string, Partial<Problem>]>([
      ['a worked example that does not add up', { exampleAnswer: 8 }],
      [
        'a formula with a name it does not declare',
        { answer: '(a + b + d) / 3' },
      ],
      [
        'a variable named like a constant',
        {
          statement: 'Valores {a}, {b} e {e}.',
          numbers: [
            ...mean.numbers.slice(0, 2),
            { name: 'e', min: 1, max: 9, step: 1 },
          ],
          answer: '(a + b + e) / 3',
          mistakes: [{ formula: 'a + b + e', why: 'x' }],
          example: [...mean.example.slice(0, 2), { name: 'e', value: 10 }],
        },
      ],
      ['a gap with no variable', { statement: 'Notas {a}, {b}, {c} e {d}.' }],
      ['a variable with no gap', { statement: 'Notas {a} e {b}.' }],
      ['a formula that does not parse', { answer: '(a + b + c / 3' }],
      // A question with a fixed answer (1 for "discreta", 0 for "contínua") is a classification, not a calculation.
      ['an answer that uses no variable', { answer: '7', exampleAnswer: 7 }],
      [
        'a mistake that always equals the answer',
        { mistakes: [{ formula: '(c + b + a) / 3', why: 'x' }] },
      ],
      [
        'an empty range step',
        {
          numbers: [
            { name: 'a', min: 2, max: 10, step: 0 },
            ...mean.numbers.slice(1),
          ],
        },
      ],
    ])('drops %s', (_, over) => {
      expect(types(draft({ problems: [{ ...mean, ...over }] }))).not.toContain(
        'problema',
      );
    });
  });

  describe('code', () => {
    const snippet = {
      prompt: 'Some os números de 1 a n.',
      language: 'python',
      lines: [
        'total = 0',
        'for i in range(1, n + 1):',
        '    total = total + i',
        'print(total)',
      ],
      blankLine: 1,
      blankToken: 'range',
      distractors: ['len', 'print'],
      why: 'range gera os números do laço.',
    };

    it('keeps a snippet whose blank is on its line', () => {
      expect(types(draft({ code: [snippet] }))).toContain('codigo');
    });

    it.each<[string, Partial<typeof snippet>]>([
      ['a blank not on its line', { blankToken: 'while' }],
      ['a blank line out of range', { blankLine: 9 }],
      [
        'code that already holds ___',
        { lines: ['x = ___', 'for i in range(3):', 'print(i)'] },
      ],
      [
        'two equal lines',
        { lines: ['print(1)', 'for i in range(3):', 'print(1)'] },
      ],
      ['a distractor equal to the blank', { distractors: ['range', 'len'] }],
    ])('drops %s', (_, over) => {
      expect(types(draft({ code: [{ ...snippet, ...over }] }))).not.toContain(
        'codigo',
      );
    });
  });
});

describe('enoughPieces', () => {
  it('refuses a chapter with only concepts, statements and the question', () => {
    expect(
      enoughPieces(
        piecesOf(draft({ classification: [], sentence: [], cases: [] })),
      ),
    ).toBe(false);
  });

  it('takes a topic with four concepts as drafted, and refuses one with three', () => {
    const four = basicsDraft.parse(draft());

    expect(enoughPieces(piecesOf({ ...draft(), ...four }))).toBe(true);
    expect(
      enoughPieces(piecesOf(draft({ concepts: draft().concepts.slice(0, 3) }))),
    ).toBe(false);
  });

  it('takes a thin topic whose only applying piece is one case', () => {
    const thin = draft({
      classification: [],
      sequence: [],
      sentence: [],
      problems: [],
      code: [],
    });

    expect(
      enoughPieces(piecesOf({ ...thin, cases: thin.cases.slice(0, 1) })),
    ).toBe(true);
  });
});
