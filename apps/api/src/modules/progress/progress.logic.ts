import type { Achievement } from '@arandu/contracts';

/** Days, patinhas, weeks and the novelos' day are counted in Brazil's time. */
export const TIME_ZONE = 'America/Sao_Paulo';

// Demo values (docs: Arandu-Reka-producto-gamificacion §3, and #124).
/** Novelos a day: they all come back at São Paulo midnight. */
export const MAX_NOVELOS = 3;
/** One more novelo at 0, priced by how many were bought that day; from the 4th on, the last price. */
export const NOVELO_PRICES = [15, 20, 35, 50] as const;
/** Questions to Arandu that earn "Curiosidade de gato". */
export const CURIOSITY_QUESTIONS = 10;

/** The São Paulo day of a moment, "YYYY-MM-DD". */
export function dayOf(moment: Date): string {
  return moment.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

/** The next São Paulo midnight after `now`. */
// shortcut: Brazil has had no daylight saving since 2019, so midnight is 03:00 UTC; use a tz library if that returns.
export function nextMidnight(now: Date): Date {
  return new Date(`${addDays(dayOf(now), 1)}T03:00:00Z`);
}

/** The novelos now: the stored count on the day of `at`, all of them again on a later day. */
export function refill(
  novelos: number,
  at: Date,
  now: Date,
): { novelos: number; at: Date } {
  if (dayOf(at) !== dayOf(now)) return { novelos: MAX_NOVELOS, at: now };
  // A wallet from the old 5-novelo rule holds more until its next day.
  return { novelos: Math.min(novelos, MAX_NOVELOS), at };
}

/** The price of the next novelo today, given how many were bought on `boughtOn`. */
export function noveloPrice(
  bought: number,
  boughtOn: string | null,
  now: Date,
): number {
  const today = boughtOn === dayOf(now) ? bought : 0;
  return NOVELO_PRICES[Math.min(today, NOVELO_PRICES.length - 1)] ?? 50;
}

/** "YYYY-MM-DD" plus `days`. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A finished stop, with its São Paulo day. */
export interface Finish {
  disciplineId: number;
  topic: number;
  mistakes: number;
  /** Mistakes in the stop's revisão relâmpago; null when it had none. */
  relampagoMistakes: number | null;
  completedAt: Date;
  day: string;
}

/**
 * The achievements earned so far, each with when it was earned, from the stops finished (oldest first) and the number
 * of topics of each subject, and the times of the person's first questions to Arandu about the cards (oldest first).
 */
export function achievementsOf(
  finishes: Finish[],
  topicsOf: Map<number, number>,
  questionTimes: Date[] = [],
): Achievement[] {
  const earned: Achievement[] = [];
  const at = (date: Date) => date.toISOString();
  const [first] = finishes;
  if (first)
    earned.push({ code: 'primeira_parada', earnedAt: at(first.completedAt) });

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

  const lightning = finishes.find((f) => f.relampagoMistakes === 0);
  if (lightning)
    earned.push({ code: 'relampago', earnedAt: at(lightning.completedAt) });

  // Ten questions to Arandu about the cards: earned with the tenth.
  const tenth = questionTimes[CURIOSITY_QUESTIONS - 1];
  if (tenth) earned.push({ code: 'curiosidade_de_gato', earnedAt: at(tenth) });

  return earned.sort((a, b) => a.earnedAt.localeCompare(b.earnedAt));
}
