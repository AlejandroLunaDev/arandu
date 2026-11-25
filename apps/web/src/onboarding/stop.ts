import type { Exercise } from "@arandu/contracts";

/** The exercises still to do, by index: a right answer takes the first off, a wrong one sends it to the end, so a
 * missed exercise comes back until it is right. */
export function afterAnswer(queue: number[], right: boolean): number[] {
  const [first, ...rest] = queue;
  return right || first === undefined ? rest : [...rest, first];
}

/** Whether every gap of a complete_a_frase holds its answer, in order. */
export function sentenceRight(exercise: Extract<Exercise, { kind: "complete_a_frase" }>, filled: (string | null)[]): boolean {
  return exercise.answers.every((answer, i) => filled[i] === answer);
}

/** Shuffled copy, so a list's order never gives the answer away. */
export function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
