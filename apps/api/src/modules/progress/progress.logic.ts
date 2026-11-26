import type { Achievement } from '@arandu/contracts';

/** Days, patinhas, weeks and the peixinhos' day are counted in Brazil's time. */
export const TIME_ZONE = 'America/Sao_Paulo';

// #145. LESSON_PRICE is Alejandro's; the rest are demo values balanced around it.
/** Peixinhos are the energy: a new wallet starts with this, and every São Paulo day it is topped up to it (4 lessons). */
export const DAILY_PEIXINHOS = 60;
/** Peixinhos to enter a lesson, each time. */
export const LESSON_PRICE = 15;
/** Currency to go on with a lesson after its last life. */
export const CONTINUE_PRICE = 5;
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

/** "YYYY-MM-DD" plus `days`. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A finished chapter, with its São Paulo day. */
export interface Finish {
  disciplineId: number;
  topic: number;
  mistakes: number;
  /** Mistakes in the chapter's revisão relâmpago; null when it had none. */
  relampagoMistakes: number | null;
  completedAt: Date;
  day: string;
}

/**
 * The achievements earned so far, each with when it was earned, from the chapters finished (oldest first) and the number
 * of topics of each subject, and the times of the person's first questions to Arandu about the cards (oldest first).
 */
export function achievementsOf(
  finishes: Finish[],
  topicsOf: Map<number, number>,
  questionTimes: Date[] = [],
  /** Every chapter or lesson finished, oldest first: the days studied. */
  studied: { completedAt: Date; day: string }[] = finishes,
): Achievement[] {
  const earned: Achievement[] = [];
  const at = (date: Date) => date.toISOString();
  const [first] = finishes;
  if (first)
    earned.push({ code: 'primeiro_capitulo', earnedAt: at(first.completedAt) });

  const clean = finishes.find((f) => f.mistakes === 0);
  if (clean)
    earned.push({
      code: 'nenhum_novelo_perdido',
      earnedAt: at(clean.completedAt),
    });

  // Seven days in a row: earned on the first finish of the seventh day.
  let run = 0;
  let previous: string | null = null;
  for (const finish of studied) {
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

  // Every chapter of a subject: earned when its last chapter is finished.
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
