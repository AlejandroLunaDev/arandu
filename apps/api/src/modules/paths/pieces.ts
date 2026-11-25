import type { ChapterContent } from '@arandu/contracts';
import { z } from 'zod';
import { CalcError, evaluate, reserved, variablesOf } from './calc.js';
import { seeded } from './lessons.logic.js';
import {
  cleanDraws,
  DRAWS,
  exampleValues,
  type ProblemPiece,
} from './problem.js';

/**
 * The pieces of a chapter: what the model writes once from the chapter's verified cards. The composer builds every
 * exercise from them, for each person and lesson, without calling the model again.
 */
export type Piece =
  | { type: 'conceito'; term: string; definition: string }
  /** `wrong` is `right` with one short part changed so it becomes false. */
  | { type: 'afirmacao'; right: string; wrong: string; why: string }
  | {
      type: 'classificacao';
      prompt: string;
      baskets: [string, string];
      items: { text: string; basket: 0 | 1 }[];
      why: string;
    }
  | { type: 'sequencia'; prompt: string; steps: string[]; why: string }
  /** A key sentence, word by word, and words that are not in it. */
  | { type: 'frase'; words: string[]; distractors: string[]; why: string }
  | { type: 'pergunta'; prompt: string; ideas: string[]; why: string }
  /** A situation where one of the chapter's concepts applies: `term` is that concept's term. */
  | { type: 'caso'; situation: string; term: string; why: string }
  | ProblemPiece
  /** Correct code; `blank` is the token a complete-the-code exercise hides, on `blank.line`. */
  | {
      type: 'codigo';
      prompt: string;
      language: string;
      lines: string[];
      blank: { line: number; token: string };
      distractors: string[];
      why: string;
    };

/** A chapter as stored: what everyone sees, and the pieces lessons are built from (never sent to a client). */
export type StoredChapter = ChapterContent & { pieces?: Piece[] };

const text = z.string().min(1);
const two = z.object({ first: text, second: text });

// Kept without tuples or optional fields: the provider's structured output refuses `prefixItems` and large grammars.
// A part a topic has no use for is an empty list.
export const piecesDraft = z.object({
  concepts: z
    .array(z.object({ term: text, definition: text }))
    .min(3)
    .max(5),
  statements: z
    .array(z.object({ right: text, wrong: text, why: text }))
    .min(3)
    .max(4),
  classification: z
    .array(
      z.object({
        prompt: text,
        baskets: two,
        items: z
          .array(z.object({ text, basket: z.number().int() }))
          .min(4)
          .max(8),
        why: text,
      }),
    )
    .max(1),
  sequence: z
    .array(
      z.object({ prompt: text, steps: z.array(text).min(3).max(6), why: text }),
    )
    .max(1),
  sentence: z
    .array(
      z.object({
        words: z.array(text).min(3).max(12),
        distractors: z.array(text).max(3),
        why: text,
      }),
    )
    .max(1),
  question: z.object({
    prompt: text,
    ideas: z.array(text).min(2).max(4),
    why: text,
  }),
  cases: z.array(z.object({ situation: text, term: text, why: text })).max(2),
  problems: z
    .array(
      z.object({
        statement: text,
        numbers: z
          .array(
            z.object({
              name: text,
              min: z.number(),
              max: z.number(),
              step: z.number(),
            }),
          )
          .max(4),
        booleans: z.array(text).max(3),
        answer: text,
        decimals: z.number().int(),
        unit: z.string(),
        mistakes: z
          .array(z.object({ formula: text, why: text }))
          .min(1)
          .max(3),
        example: z.array(z.object({ name: text, value: z.number() })).max(7),
        exampleAnswer: z.number(),
        why: text,
      }),
    )
    .max(2),
  code: z
    .array(
      z.object({
        prompt: text,
        language: text,
        lines: z.array(text).min(3).max(10),
        blankLine: z.number().int(),
        blankToken: text,
        distractors: z.array(text).min(2).max(3),
        why: text,
      }),
    )
    .max(2),
});

export type PiecesDraft = z.infer<typeof piecesDraft>;

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
// Two choices with the same text leave the person guessing which one is right.
const distinct = (list: string[]) =>
  new Set(list.map((s) => s.trim().toLowerCase())).size === list.length;
const bit = (i: number): i is 0 | 1 => i === 0 || i === 1;

/** Kept when its formulas use only its own variables, its worked example adds up and most random plays are clean. */
function problemOk(p: ProblemPiece): boolean {
  const names = [...p.numbers.map((v) => v.name), ...p.booleans];
  if (
    !distinct(names) ||
    names.some((n) => !/^[A-Za-z_]\w*$/.test(n) || reserved(n))
  )
    return false;
  if (p.decimals < 0 || p.decimals > 4) return false;
  if (p.numbers.some((v) => !(v.step > 0 && v.max >= v.min))) return false;
  const gaps = [...p.statement.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
  if (!names.every((n) => gaps.includes(n))) return false;
  if (!gaps.every((g) => names.includes(g))) return false;
  if (!names.every((n) => p.example.some((e) => e.name === n))) return false;
  try {
    for (const formula of [p.answer, ...p.mistakes.map((m) => m.formula)])
      if (!variablesOf(formula).every((v) => names.includes(v))) return false;
    const worked = evaluate(p.answer, exampleValues(p));
    const value = typeof worked === 'boolean' ? Number(worked) : worked;
    const f = 10 ** p.decimals;
    if (Math.round(value * f) !== Math.round(p.exampleAnswer * f)) return false;
  } catch (error) {
    if (error instanceof CalcError) return false;
    throw error;
  }
  return cleanDraws(p, seeded(p.statement)) >= DRAWS / 2;
}

/** The chapter's pieces, without any the model got inconsistent. */
export function piecesOf(draft: PiecesDraft): Piece[] {
  const out: Piece[] = [];
  const concepts = draft.concepts.filter(
    (c, i, all) => all.findIndex((o) => same(o.term, c.term)) === i,
  );
  for (const c of concepts)
    out.push({ type: 'conceito', term: c.term, definition: c.definition });
  for (const s of draft.statements)
    if (!same(s.right, s.wrong)) out.push({ type: 'afirmacao', ...s });
  for (const c of draft.classification) {
    const items = c.items.filter((i) => bit(i.basket));
    const baskets: [string, string] = [c.baskets.first, c.baskets.second];
    if (
      items.length === c.items.length &&
      distinct(baskets) &&
      distinct(items.map((i) => i.text)) &&
      items.some((i) => i.basket === 0) &&
      items.some((i) => i.basket === 1)
    )
      out.push({
        type: 'classificacao',
        prompt: c.prompt,
        baskets,
        items: items.map((i) => ({ text: i.text, basket: i.basket as 0 | 1 })),
        why: c.why,
      });
  }
  for (const s of draft.sequence)
    if (distinct(s.steps)) out.push({ type: 'sequencia', ...s });
  // The answer may repeat a word; a distractor may not be one of its words, or a right tile would count as wrong.
  for (const s of draft.sentence)
    if (
      distinct([
        ...new Set(s.words.map((w) => w.trim().toLowerCase())),
        ...s.distractors,
      ])
    )
      out.push({ type: 'frase', ...s });
  const q = draft.question;
  if (distinct(q.ideas)) out.push({ type: 'pergunta', ...q });
  for (const c of draft.cases) {
    const concept = concepts.find((o) => same(o.term, c.term));
    if (concept)
      out.push({
        type: 'caso',
        situation: c.situation,
        term: concept.term,
        why: c.why,
      });
  }
  for (const p of draft.problems) {
    const piece: ProblemPiece = { type: 'problema', ...p };
    if (problemOk(piece)) out.push(piece);
  }
  for (const c of draft.code) {
    const line = c.lines[c.blankLine];
    // The gap is written ___, so the code itself may not hold one.
    if (
      line?.includes(c.blankToken) &&
      !c.lines.some((l) => l.includes('___')) &&
      distinct(c.lines) &&
      distinct([c.blankToken, ...c.distractors])
    )
      out.push({
        type: 'codigo',
        prompt: c.prompt,
        language: c.language,
        lines: c.lines,
        blank: { line: c.blankLine, token: c.blankToken },
        distractors: c.distractors,
        why: c.why,
      });
  }
  return out;
}

/** Enough pieces for three lessons: 3 concepts, 3 statements, the open question and two more pieces of any kind. */
export function enoughPieces(pieces: Piece[]): boolean {
  const count = (type: Piece['type']) =>
    pieces.filter((p) => p.type === type).length;
  const others = pieces.filter(
    (p) => !['conceito', 'afirmacao', 'pergunta'].includes(p.type),
  ).length;
  return (
    count('conceito') >= 3 &&
    count('afirmacao') >= 3 &&
    count('pergunta') === 1 &&
    others >= 2
  );
}
