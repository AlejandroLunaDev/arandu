import { CalcError, evaluate, type Value } from './calc.js';

/** A problem the model writes once: a statement with {name} gaps, the variables' ranges and the formulas. */
export interface ProblemPiece {
  type: 'problema';
  statement: string;
  numbers: { name: string; min: number; max: number; step: number }[];
  booleans: string[];
  answer: string;
  decimals: number;
  unit: string;
  mistakes: { formula: string; why: string }[];
  example: { name: string; value: number }[];
  exampleAnswer: number;
  why: string;
}

/** One play of a problem: its values filled in, the options and, for each wrong one, the mistake it comes from. */
export interface ProblemInstance {
  prompt: string;
  options: string[];
  answer: number;
  mistakes: (string | null)[];
}

const DRAWS = 20;

const decimalsOf = (n: number) => (String(n).split('.')[1] ?? '').length;

const format = (value: number, decimals: number, unit: string) =>
  `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${unit ? ` ${unit}` : ''}`;

function fill(piece: ProblemPiece, values: Record<string, Value>): string {
  return piece.statement.replace(/\{(\w+)\}/g, (gap, name: string) => {
    const value = values[name];
    if (typeof value === 'boolean') return value ? 'V' : 'F';
    if (typeof value !== 'number') return gap;
    const range = piece.numbers.find((v) => v.name === name);
    return format(value, decimalsOf(range?.step ?? 1), '');
  });
}

/** The problem with these values, or null when they give no clean question (a value not finite, two equal options). */
export function instanceWith(
  piece: ProblemPiece,
  values: Record<string, Value>,
  random: () => number,
): ProblemInstance | null {
  let right: Value;
  let wrong: { value: Value; why: string }[];
  try {
    right = evaluate(piece.answer, values);
    wrong = piece.mistakes.map((m) => ({
      value: evaluate(m.formula, values),
      why: m.why,
    }));
  } catch (error) {
    if (error instanceof CalcError) return null;
    throw error;
  }
  const prompt = fill(piece, values);
  if (typeof right === 'boolean') {
    const options = ['Verdadeiro', 'Falso'];
    const answer = right ? 0 : 1;
    const mistakes: (string | null)[] = [null, null];
    mistakes[1 - answer] = piece.mistakes[0]?.why ?? null;
    return { prompt, options, answer, mistakes };
  }
  if (!Number.isFinite(right)) return null;
  const all = [
    {
      text: format(right, piece.decimals, piece.unit),
      why: null as string | null,
    },
    ...wrong.map((w) =>
      typeof w.value === 'number' && Number.isFinite(w.value)
        ? { text: format(w.value, piece.decimals, piece.unit), why: w.why }
        : null,
    ),
  ];
  if (all.some((o) => o === null)) return null;
  const options = all as { text: string; why: string | null }[];
  if (new Set(options.map((o) => o.text)).size !== options.length) return null;
  // Fisher-Yates with the play's own random numbers.
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return {
    prompt,
    options: order.map((i) => options[i]!.text),
    answer: order.indexOf(0),
    mistakes: order.map((i) => options[i]!.why),
  };
}

/** Values drawn in each variable's range, on its step. */
function draw(
  piece: ProblemPiece,
  random: () => number,
): Record<string, Value> {
  const values: Record<string, Value> = {};
  for (const v of piece.numbers) {
    const steps = Math.floor((v.max - v.min) / v.step);
    const value = v.min + v.step * Math.floor(random() * (steps + 1));
    values[v.name] = Number(value.toFixed(10));
  }
  for (const name of piece.booleans) values[name] = random() < 0.5;
  return values;
}

/** The worked example's values, booleans written as 1 or 0. */
export function exampleValues(piece: ProblemPiece): Record<string, Value> {
  const values: Record<string, Value> = {};
  for (const { name, value } of piece.example)
    values[name] = piece.booleans.includes(name) ? value !== 0 : value;
  return values;
}

/** A play of the problem with new values; after a few draws that give no clean question, the worked example's. */
export function instanceOf(
  piece: ProblemPiece,
  random: () => number,
): ProblemInstance | null {
  for (let i = 0; i < DRAWS; i++) {
    const instance = instanceWith(piece, draw(piece, random), random);
    if (instance) return instance;
  }
  return instanceWith(piece, exampleValues(piece), random);
}

/** How many of DRAWS random plays give a clean question: the validator keeps a problem only when most do. */
export function cleanDraws(piece: ProblemPiece, random: () => number): number {
  let clean = 0;
  for (let i = 0; i < DRAWS; i++)
    if (instanceWith(piece, draw(piece, random), random)) clean++;
  return clean;
}

export { DRAWS };
