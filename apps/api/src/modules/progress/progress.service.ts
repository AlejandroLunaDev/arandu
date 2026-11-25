import type {
  Achievement,
  BookClosing,
  BookProgress,
  BookReflection,
  BookReflectionRequest,
  Home,
} from '@arandu/contracts';
import { AiModelError, AiOutputError, AiService } from '@nestjs/ai';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { isAbusive } from '../arandu/arandu.safety.js';
import { closingInstructions } from './closing.prompt.js';
import { achievementsOf, addDays } from './progress.logic.js';
import { ProgressRepository } from './progress.repository.js';
import { subjectNotFound } from './progress.errors.js';
import { LESSONS } from '../paths/lessons.logic.js';

// The suggestion comes first, so the model decides the way before it writes about it.
const closingDraft = z.object({
  suggestion: z.enum(['seguir', 'outra_carreira', 'rever_capitulo']),
  chapter: z.number().int(),
  text: z.string().min(1),
});

/** The home (S1, K1), each book's path (P1, K3) and the achievements (K4), all derived from the chapters finished. */
@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private readonly progress: ProgressRepository,
    private readonly ai: AiService,
  ) {}

  async achievements(userId: string): Promise<Achievement[]> {
    const [finishes, questions, studied] = await Promise.all([
      this.progress.finishes(userId),
      this.progress.questionTimes(userId),
      this.progress.studyTimes(userId),
    ]);
    const topics = await this.progress.topicCounts([
      ...new Set(finishes.map((f) => f.disciplineId)),
    ]);
    return achievementsOf(finishes, topics, questions, studied);
  }

  async home(userId: string): Promise<Home> {
    const [
      wallet,
      finishes,
      sabedoria,
      { today, monday },
      journey,
      questions,
      studied,
    ] = await Promise.all([
      this.progress.wallet(userId),
      this.progress.finishes(userId),
      this.progress.sabedoria(userId),
      this.progress.calendar(),
      this.progress.journey(userId),
      this.progress.questionTimes(userId),
      this.progress.studyTimes(userId),
    ]);
    const topics = await this.progress.topicCounts([
      ...new Set(finishes.map((f) => f.disciplineId)),
    ]);
    const studiedDays = new Set(studied.map((f) => f.day));
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
      lastStudiedOn: studied.at(-1)?.day ?? null,
      current,
      achievements: achievementsOf(finishes, topics, questions, studied),
    };
  }

  /** The chapters of a subject: done, the first one not done (current), and the rest locked. */
  /** S4: Arandu's reading of a book, never a grade. */
  async reflection(
    userId: string,
    disciplineId: number,
  ): Promise<BookReflection> {
    const book = await this.book(userId, disciplineId);
    const { chapters, questions, feeling, closing } =
      await this.progress.reflection(userId, disciplineId);
    const text = (topic: number) => book.chapters[topic]?.text ?? '';
    const worst = chapters.reduce<(typeof chapters)[number] | null>(
      (w, s) => (s.mistakes > (w?.mistakes ?? 0) ? s : w),
      null,
    );
    const reading = {
      discipline: book.discipline,
      finished:
        book.chapters.length > 0 &&
        book.chapters.every((s) => s.state === 'done'),
      // shortcut: an exercise counts as one item and each mistake as one item missed; count statements and pairs
      // one by one if the reflection needs more precision.
      items: {
        right: chapters.reduce(
          (n, s) => n + Math.max(0, s.items - s.mistakes),
          0,
        ),
        total: chapters.reduce((n, s) => n + s.items, 0),
      },
      questions,
      further: chapters
        .filter((s) => s.mistakes === 0)
        .map((s) => text(s.topic)),
      stuck: worst ? text(worst.topic) : null,
      feeling,
    };
    return {
      ...reading,
      closing:
        closing ??
        (reading.finished && feeling
          ? await this.close(userId, book, chapters, feeling, questions, worst)
          : null),
    };
  }

  /**
   * Arandu's closing of a finished book, written once and stored. Null when the model fails or writes something unsafe:
   * the next read tries again.
   */
  private async close(
    userId: string,
    book: BookProgress,
    chapters: { topic: number; mistakes: number }[],
    feeling: BookReflectionRequest,
    questions: number,
    worst: { topic: number } | null,
  ): Promise<BookClosing | null> {
    const mistakes = (topic: number) =>
      chapters.find((c) => c.topic === topic)?.mistakes ?? 0;
    const prompt = `Subject: ${book.discipline.name}
Chapters (number. topic: mistakes):
${book.chapters.map((c) => `${c.index + 1}. ${c.text}: ${mistakes(c.index)}`).join('\n')}
Questions they asked you about the cards: ${questions}
How it felt: ${feeling.chips.join(', ') || '-'}
In their words: ${feeling.text ?? '-'}`;
    let draft: z.infer<typeof closingDraft>;
    try {
      ({ object: draft } = await this.ai.generateObject({
        label: 'arandu-book-closing',
        schema: closingDraft,
        instructions: closingInstructions(),
        prompt,
        maxOutputTokens: 500,
      }));
    } catch (error) {
      if (!(error instanceof AiModelError || error instanceof AiOutputError))
        throw error;
      this.logger.warn(
        `Closing of book ${book.discipline.id} failed: ${String(error)}`,
      );
      return null;
    }
    if (isAbusive(draft.text)) return null;
    // A chapter to go back to that is not in the book becomes the hardest one, or no going back at all.
    const back = book.chapters[draft.chapter - 1]
      ? draft.chapter - 1
      : worst?.topic;
    const closing: BookClosing =
      draft.suggestion !== 'rever_capitulo'
        ? { text: draft.text, suggestion: draft.suggestion, chapter: null }
        : back === undefined
          ? { text: draft.text, suggestion: 'seguir', chapter: null }
          : { text: draft.text, suggestion: 'rever_capitulo', chapter: back };
    await this.progress.saveClosing(userId, book.discipline.id, closing);
    return closing;
  }

  async book(userId: string, disciplineId: number): Promise<BookProgress> {
    const discipline = await this.progress.discipline(disciplineId);
    if (!discipline) throw subjectNotFound();
    const done = new Set(
      (await this.progress.finishes(userId))
        .filter((f) => f.disciplineId === disciplineId)
        .map((f) => f.topic),
    );
    const lessons = await this.progress.lessonsDone(userId, disciplineId);
    let currentFound = false;
    return {
      discipline: { id: discipline.id, name: discipline.name },
      chapters: discipline.topics.map((text, index) => {
        if (done.has(index))
          return { index, text, state: 'done', lessonsDone: LESSONS };
        const lessonsDone = lessons.get(index) ?? 0;
        if (currentFound) return { index, text, state: 'locked', lessonsDone };
        currentFound = true;
        return { index, text, state: 'current', lessonsDone };
      }),
    };
  }
}
