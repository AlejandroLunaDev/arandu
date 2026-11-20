import type { Achievement } from '@arandu/contracts';

// Demo values (docs: Arandu-Reka-producto-gamificacion §3).
export const MAX_NOVELOS = 5;
export const REFILL_MS = 30 * 60_000;

/** Novelos after the time passed since `at`; `at` moves by the novelos given back, or to `now` once full. */
export function refill(
  novelos: number,
  at: Date,
  now: Date,
): { novelos: number; at: Date } {
  const steps = Math.max(
    0,
    Math.floor((now.getTime() - at.getTime()) / REFILL_MS),
  );
  const filled = Math.min(MAX_NOVELOS, novelos + steps);
  if (filled >= MAX_NOVELOS) return { novelos: MAX_NOVELOS, at: now };
  return { novelos: filled, at: new Date(at.getTime() + steps * REFILL_MS) };
}

/** "YYYY-MM-DD" plus `days`. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A finished stop, with its São Paulo day. */
export interface Finish {
  disciplineId: number;
  topic: number;
  mistakes: number;
  completedAt: Date;
  day: string;
}

/**
 * The achievements earned so far, each with when it was earned, from the stops finished (oldest first) and the number
 * of topics of each subject. Relâmpago and Curiosidade de gato come with the exercises that earn them (#64).
 */
export function achievementsOf(
  finishes: Finish[],
  topicsOf: Map<number, number>,
): Achievement[] {
  const earned: Achievement[] = [];
  const at = (date: Date) => date.toISOString();
  if (finishes.length)
    earned.push({
      code: 'primeira_parada',
      earnedAt: at(finishes[0].completedAt),
    });

  const clean = finishes.find((f) => f.mistakes === 0);
  if (clean)
    earned.push({
      code: 'nenhum_novelo_perdido',
      earnedAt: at(clean.completedAt),
    });

  // Seven days in a row: earned on the first finish of the seventh day.
  let run = 0;
  let previous: string | null = null;
  for (const finish of finishes) {
    if (finish.day === previous) continue;
    run = previous && addDays(previous, 1) === finish.day ? run + 1 : 1;
    previous = finish.day;
    if (run === 7) {
      earned.push({
        code: 'semana_de_patinhas',
        earnedAt: at(finish.completedAt),
      });
      break;
    }
  }

  // Every stop of a subject: earned when its last stop is finished.
  const done = new Map<number, Set<number>>();
  for (const finish of finishes) {
    const topics = done.get(finish.disciplineId) ?? new Set<number>();
    topics.add(finish.topic);
    done.set(finish.disciplineId, topics);
    if (topics.size === topicsOf.get(finish.disciplineId)) {
      earned.push({ code: 'primeiro_livro', earnedAt: at(finish.completedAt) });
      break;
    }
  }

  return earned.sort((a, b) => a.earnedAt.localeCompare(b.earnedAt));
}
