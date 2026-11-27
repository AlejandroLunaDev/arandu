import type { ChapterCard, ChapterContent } from '@arandu/contracts';
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
  /**
   * A situation where one of the chapter's concepts applies: `term` is that concept's term. `decision`, since #164, asks
   * what to do in it: `right` is what the concept supports. Without it the case asks which concept explains it.
   */
  | {
      type: 'caso';
      situation: string;
      term: string;
      why: string;
      decision?: { question: string; right: string; wrong: string[] };
    }
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

/** A piece as stored: `lesson` (1-3) is the lesson whose cards it was written from; none in a chapter before #157. */
export type StoredPiece = Piece & { lesson?: number };

/** One lesson of a chapter made since #157: a part of the topic, with its own verified cards. */
export interface StoredLesson {
  title: string;
  cards: ChapterCard[];
}

/**
 * A chapter as stored: what everyone sees (its lesson titles from `lessons`), and the pieces lessons are built from
 * (never sent to a client).
 */
export type StoredChapter = Omit<ChapterContent, 'lessonTitles'> & {
  pieces?: StoredPiece[];
  lessons?: StoredLesson[];
};

const text = z.string().min(1);
const two = z.object({ first: text, second: text });

// Kept without tuples or optional fields: the provider's structured output refuses `prefixItems`. All the parts in one
// schema compile to a grammar every provider refuses as too large (2026-11-25), so they come in two calls.
// A part a topic has no use for is an empty list. No counts here: the prompt asks for them, and piecesOf keeps the parts
// in range, so one list too long or too short drops alone instead of the whole draft.
export const basicsDraft = z.object({
  concepts: z.array(z.object({ term: text, definition: text })),
  statements: z.array(z.object({ right: text, wrong: text, why: text })),
  classification: z.array(
    z.object({
      prompt: text,
      baskets: two,
      items: z.array(z.object({ text, basket: z.number().int() })),
      why: text,
    }),
  ),
  sequence: z.array(
    z.object({ prompt: text, steps: z.array(text), why: text }),
  ),
  sentence: z.array(
    z.object({ words: z.array(text), distractors: z.array(text), why: text }),
  ),
  question: z.object({ prompt: text, ideas: z.array(text), why: text }),
  cases: z.array(
    z.object({
      situation: text,
      term: text,
      question: text,
      right: text,
      wrong: z.array(text),
      why: text,
    }),
  ),
});

/** Practice for topics that calculate, reason with rules or program: empty lists for any other topic. */
export const practiceDraft = z.object({
  problems: z.array(
    z.object({
      statement: text,
      numbers: z.array(
        z.object({
          name: text,
          min: z.number(),
          max: z.number(),
          step: z.number(),
        }),
      ),
      booleans: z.array(text),
      answer: text,
      decimals: z.number().int(),
      unit: z.string(),
      mistakes: z.array(z.object({ formula: text, why: text })),
      example: z.array(z.object({ name: text, value: z.number() })),
      exampleAnswer: z.number(),
      why: text,
    }),
  ),
  code: z.array(
    z.object({
      prompt: text,
      language: text,
      lines: z.array(text),
      blankLine: z.number().int(),
      blankToken: text,
      distractors: z.array(text),
      why: text,
    }),
  ),
});

export type PiecesDraft = z.infer<typeof basicsDraft> &
  z.infer<typeof practiceDraft>;

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
// Two choices with the same text leave the person guessing which one is right.
const distinct = (list: string[]) =>
  new Set(list.map((s) => s.trim().toLowerCase())).size === list.length;
const bit = (i: number): i is 0 | 1 => i === 0 || i === 1;
const within = (list: unknown[], min: number, max: number) =>
  list.length >= min && list.length <= max;

/** Kept when its formulas use only its own variables, its worked example adds up and most random plays are clean. */
function problemOk(p: ProblemPiece): boolean {
  const names = [...p.numbers.map((v) => v.name), ...p.booleans];
  if (
    !distinct(names) ||
    names.some((n) => !/^[A-Za-z_]\w*$/.test(n) || reserved(n))
  )
    return false;
  if (
    p.numbers.length > 4 ||
    p.booleans.length > 3 ||
    !within(p.mistakes, 1, 3) ||
    p.example.length > 7
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
    // A fixed answer is a classification dressed as a problem: its options would be numbers that mean nothing.
    if (!variablesOf(p.answer).length) return false;
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
  const concepts = draft.concepts
    .filter((c, i, all) => all.findIndex((o) => same(o.term, c.term)) === i)
    .slice(0, 8);
  for (const c of concepts)
    out.push({ type: 'conceito', term: c.term, definition: c.definition });
  for (const s of draft.statements.slice(0, 4))
    if (!same(s.right, s.wrong)) out.push({ type: 'afirmacao', ...s });
  for (const c of draft.classification.slice(0, 1)) {
    const items = c.items.filter((i) => bit(i.basket));
    const baskets: [string, string] = [c.baskets.first, c.baskets.second];
    if (
      items.length === c.items.length &&
      within(items, 4, 8) &&
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
  for (const s of draft.sequence.slice(0, 1))
    if (within(s.steps, 3, 6) && distinct(s.steps))
      out.push({ type: 'sequencia', ...s });
  // The answer may repeat a word; a distractor may not be one of its words, or a right tile would count as wrong.
  for (const s of draft.sentence.slice(0, 1))
    if (
      within(s.words, 3, 12) &&
      s.distractors.length <= 3 &&
      distinct([
        ...new Set(s.words.map((w) => w.trim().toLowerCase())),
        ...s.distractors,
      ])
    )
      out.push({ type: 'frase', ...s });
  const q = draft.question;
  if (within(q.ideas, 2, 4) && distinct(q.ideas))
    out.push({ type: 'pergunta', ...q });
  for (const c of draft.cases.slice(0, 2)) {
    const concept = concepts.find((o) => same(o.term, c.term));
    // A decision whose choices repeat is dropped; the case then asks for its concept.
    const choices = [c.right, ...c.wrong];
    if (concept)
      out.push({
        type: 'caso',
        situation: c.situation,
        term: concept.term,
        why: c.why,
        ...(within(c.wrong, 2, 3) && distinct(choices)
          ? {
              decision: {
                question: c.question,
                right: c.right,
                wrong: c.wrong,
              },
            }
          : {}),
      });
  }
  for (const p of draft.problems.slice(0, 2)) {
    const piece: ProblemPiece = { type: 'problema', ...p };
    if (problemOk(piece)) out.push(piece);
  }
  for (const c of draft.code.slice(0, 2)) {
    const line = c.lines[c.blankLine];
    // The gap is written ___, so the code itself may not hold one.
    if (
      line?.includes(c.blankToken) &&
      within(c.lines, 3, 10) &&
      within(c.distractors, 2, 3) &&
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

/** Enough pieces for a lesson, or for three in an older chapter: 4 concepts, 3 statements, the open question and one more piece of any kind. */
export function enoughPieces(pieces: Piece[]): boolean {
  const count = (type: Piece['type']) =>
    pieces.filter((p) => p.type === type).length;
  const others = pieces.filter(
    (p) => !['conceito', 'afirmacao', 'pergunta'].includes(p.type),
  ).length;
  return (
    count('conceito') >= 4 &&
    count('afirmacao') >= 3 &&
    count('pergunta') === 1 &&
    // One piece that applies the topic (a case, a classification...) is enough: the composer fills a thin lesson.
    others >= 1
  );
}
