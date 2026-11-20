import type { Achievement, BookProgress, Home } from '@arandu/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { achievementsOf, addDays } from './progress.logic.js';
import { ProgressRepository } from './progress.repository.js';

/** The home (S1, K1), each book's path (P1, K3) and the achievements (K4), all derived from the stops finished. */
@Injectable()
export class ProgressService {
  constructor(private readonly progress: ProgressRepository) {}

  async achievements(userId: string): Promise<Achievement[]> {
    const finishes = await this.progress.finishes(userId);
    const topics = await this.progress.topicCounts([
      ...new Set(finishes.map((f) => f.disciplineId)),
    ]);
    return achievementsOf(finishes, topics);
  }

  async home(userId: string): Promise<Home> {
    const [wallet, finishes, sabedoria, { today, monday }, journey] =
      await Promise.all([
        this.progress.wallet(userId),
        this.progress.finishes(userId),
        this.progress.sabedoria(userId),
        this.progress.calendar(),
        this.progress.journey(userId),
      ]);
    const topics = await this.progress.topicCounts([
      ...new Set(finishes.map((f) => f.disciplineId)),
    ]);
    const studiedDays = new Set(finishes.map((f) => f.day));
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      return { date, studied: date <= today && studiedDays.has(date) };
    });

    let current: Home['current'] = null;
    if (journey.discipline) {
      const { id, name, topics: list } = journey.discipline;
      const done = new Set(
        finishes.filter((f) => f.disciplineId === id).map((f) => f.topic),
      );
      const next = list.findIndex((_, i) => !done.has(i));
      current = {
        disciplineId: id,
        name,
        nextTopic: next === -1 ? null : next,
        total: list.length,
      };
    }

    return {
      wallet,
      sabedoria,
      week: {
        days,
        studied: days.filter((d) => d.studied).length,
        goal: journey.weeklyGoal,
      },
      lastStudiedOn: finishes.at(-1)?.day ?? null,
      current,
      achievements: achievementsOf(finishes, topics),
    };
  }

  /** The stops of a subject: done, the first one not done (current), and the rest locked. */
  async book(userId: string, disciplineId: number): Promise<BookProgress> {
    const discipline = await this.progress.discipline(disciplineId);
    if (!discipline) throw new NotFoundException(`No subject ${disciplineId}`);
    const done = new Set(
      (await this.progress.finishes(userId))
        .filter((f) => f.disciplineId === disciplineId)
        .map((f) => f.topic),
    );
    let currentFound = false;
    return {
      discipline: { id: discipline.id, name: discipline.name },
      stops: discipline.topics.map((text, index) => {
        if (done.has(index)) return { index, text, state: 'done' };
        if (currentFound) return { index, text, state: 'locked' };
        currentFound = true;
        return { index, text, state: 'current' };
      }),
    };
  }
}
