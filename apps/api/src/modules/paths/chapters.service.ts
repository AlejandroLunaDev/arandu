import type {
  ChapterCard,
  ChapterContent,
  ChapterResult,
  Lesson,
  LessonExercise,
  LessonResult,
  Wallet,
} from '@arandu/contracts';
import { AiOutputError, AiService } from '@nestjs/ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../../core/config/env.js';
import { CONTINUE_PRICE, LESSON_PRICE } from '../progress/progress.logic.js';
import { ProgressRepository } from '../progress/progress.repository.js';
import { ProgressService } from '../progress/progress.service.js';
import {
  basicsInstructions,
  lessonCardsInstructions,
  lessonsInstructions,
  practiceInstructions,
  searchInstructions,
} from './chapter.prompt.js';
import {
  type Composed,
  composeChapter,
  composeLesson,
  type PieceRef,
} from './composer.js';
import { type Page, searchPages } from './firecrawl.js';
import {
  LESSON_LIVES,
  lessonCards,
  lessonOpen,
  LESSONS,
} from './lessons.logic.js';
import {
  chapterNotFound,
  chapterUnavailable,
  lessonLocked,
} from './paths.errors.js';
import { PathsRepository } from './paths.repository.js';
import {
  enoughPieces,
  basicsDraft,
  practiceDraft,
  piecesOf,
  type StoredChapter,
  type StoredLesson,
  type StoredPiece,
} from './pieces.js';
import { quoteIn } from './source-check.js';

/**
 * Pages a search downloads (a Firecrawl credit each). The chapter's topic is searched once (#157) in academic pages and
 * both Wikipedias: Portuguese's for what is Brazil's own (its law, the SUS), English's, the fullest, for the rest. A
 * lesson those pages left short searches the English Wikipedia for its own part.
 */
const CHAPTER_PAGES = { academic: 5, pt: 5, en: 5 };
const LESSON_PAGES = 5;
/** A lesson's verified cards: LESSON_CARDS wanted, MIN_LESSON_CARDS at least, or the chapter is not made. */
const LESSON_CARDS = 3;
const MIN_LESSON_CARDS = 2;
/** Words a search query keeps: a search engine reads a long query badly. */
const QUERY_WORDS = 30;
/** The longest quote a card keeps: one sentence, a short citation. */
const QUOTE_CHARS = 300;

const text = z.string().min(1);
const index = z.number().int();
// `page` is the page's number as listed (1-based); the card's source is that page.
const card = z.object({ title: text, text, page: index, quote: text });

// No counts in these schemas: a list one card too long would drop every card. A lesson keeps LESSON_CARDS verified.
const cardsDraft = z.object({ cards: z.array(card) });
const searchDraft = z.object({ search: text });
const lessonsDraft = z.object({
  lessons: z.array(
    z.object({ title: text, search: text, cards: z.array(card) }),
  ),
});

/** A page with where it comes from: the model is told to prefer academic pages over Wikipedia's. */
type Source = Page & { wikipedia: boolean };

/** The model's object, or null when its answer missed the schema (a list too long, a field left out): retried. */
async function orRetry<T>(draft: Promise<{ object: T }>): Promise<T | null> {
  try {
    return (await draft).object;
  } catch (error) {
    if (!(error instanceof AiOutputError)) throw error;
    // Why a draft missed its schema (the message's end, after the draft) tells a weak prompt from a weak page.
    Logger.warn(String(error).slice(-500), 'ChaptersService');
    return null;
  }
}

/** Tries to write a chapter's lessons, and then each lesson's pieces, this many times before giving up. */
const ATTEMPTS = 2;

/** The subject's name and the first words of every topic (its "1." numbering left out), so each topic is in the query. */
const queryOf = (name: string, topics: string[]) => {
  const per = Math.max(3, Math.floor(QUERY_WORDS / topics.length));
  const words = topics.map((t) =>
    t
      .replace(/^\s*\d+[.)]\s*/, '')
      .split(/\s+/)
      .slice(0, per)
      .join(' '),
  );
  return [name, ...words].join(' ');
};

const pagesPrompt = (pages: Source[]) =>
  pages
    .map(
      (p, i) =>
        `[Page ${i + 1}${p.wikipedia ? ', Wikipedia' : ''}] ${p.title} (${p.url})\n${p.markdown}`,
    )
    .join('\n\n---\n\n');

/** The cards of both lists, each quote once: `b`'s cards that `a` already has are left out. */
const together = (a: ChapterCard[], b: ChapterCard[]) =>
  [...a, ...b].filter(
    (c, i, all) =>
      all.findIndex(
        (o) =>
          o.source.url === c.source.url && o.source.quote === c.source.quote,
      ) === i,
  );

/** The cards whose quote is on the page they name, each citing that page. */
function verified(
  cards: z.infer<typeof card>[],
  pages: Source[],
): ChapterCard[] {
  return cards.flatMap((c) => {
    const page = pages[c.page - 1];
    if (
      !page ||
      c.quote.length > QUOTE_CHARS ||
      !quoteIn(page.markdown, c.quote)
    )
      return [];
    return [
      {
        title: c.title,
        text: c.text,
        source: { label: page.title, url: page.url, quote: c.quote },
      },
    ];
  });
}

const shown = ({
  discipline,
  topic,
  lessons,
  cards,
  exercises,
}: StoredChapter): ChapterContent => ({
  discipline,
  topic,
  lessonTitles: lessons?.map((l) => l.title) ?? [],
  cards,
  exercises,
});

/** A lesson as served: its own title and cards (or its share of an older chapter's) and the exercises composed for it. */
const lessonOf = (
  chapter: StoredChapter,
  composed: Composed[],
  index: number,
): Lesson => ({
  index,
  total: LESSONS,
  title: chapter.lessons?.[index - 1]?.title ?? null,
  cards:
    chapter.lessons?.[index - 1]?.cards ?? lessonCards(chapter.cards, index),
  exercises: composed.map((c): LessonExercise => ({
    ...c.exercise,
    topic: c.ref.topic,
    index: c.ref.index,
  })),
  lives: LESSON_LIVES,
});

/**
 * A chapter of a subject: made once from pages Firecrawl found, as three lessons that each teach a different part of
 * its topic (#157), with every card's quote checked on its page and each lesson's pieces written from its own cards;
 * then reused. Its lessons' exercises are composed from those pieces, per person.
 */
@Injectable()
export class ChaptersService {
  private readonly logger = new Logger(ChaptersService.name);
  // Two runs making the same chapter at once share one generation.
  private readonly pending = new Map<string, Promise<StoredChapter>>();

  constructor(
    private readonly ai: AiService,
    private readonly paths: PathsRepository,
    private readonly progress: ProgressService,
    private readonly config: ConfigService<Env, true>,
    private readonly wallet: ProgressRepository,
  ) {}

  /**
   * A chapter people can open, as stored: inside its subject's leading run of made chapters (the run paths and books
   * list), so it is never generated live and a book's run never grows under someone mid-way.
   */
  private async opened(
    disciplineId: number,
    topic: number,
  ): Promise<{ chapter: StoredChapter; topics: string[] }> {
    const discipline = await this.paths.discipline(disciplineId);
    const topicText = discipline?.topics[topic];
    const chapter =
      discipline &&
      topicText !== undefined &&
      topic < (await this.paths.madeCount(disciplineId))
        ? await this.paths.chapterContent(disciplineId, topic, topicText)
        : null;
    if (!discipline || !chapter) throw chapterNotFound();
    return { chapter, topics: discipline.topics };
  }

  /** The chapter as everyone sees it, without its pieces, its exercises composed with the whole subject's pieces. */
  async chapter(disciplineId: number, topic: number): Promise<ChapterContent> {
    const { chapter, topics } = await this.opened(disciplineId, topic);
    if (!chapter.pieces) return shown(chapter);
    // Stored exercises were composed before the later chapters existed: topic 0 had no other chapter's wrong options.
    const others = (
      await this.paths.subjectPieces(disciplineId, topics)
    ).filter((c) => c.topic !== topic);
    const exercises = composeChapter(
      { topic, pieces: chapter.pieces },
      `${disciplineId}:${topic}`,
      others,
    );
    return shown({ ...chapter, exercises });
  }

  /**
   * A chapter, made now when it is not stored yet: for the generation script, not for people. `remake` makes a stored
   * chapter again: its lessons' pieces from their stored cards, or all of it when it was made before lessons (#157). The
   * old chapter stays if that fails.
   */
  async make(
    disciplineId: number,
    topic: number,
    remake = false,
  ): Promise<StoredChapter> {
    const discipline = await this.paths.discipline(disciplineId);
    const topicText = discipline?.topics[topic];
    if (!discipline || topicText === undefined) throw chapterNotFound();

    const stored = await this.paths.chapterContent(
      disciplineId,
      topic,
      topicText,
    );
    if (stored && !remake) return stored;

    const key = `${disciplineId}:${topic}`;
    let generation = this.pending.get(key);
    if (!generation) {
      generation = this.generate(
        discipline.id,
        discipline.name,
        topic,
        discipline.topics,
        stored?.lessons,
      ).finally(() => this.pending.delete(key));
      this.pending.set(key, generation);
    }
    return generation;
  }

  async finish(
    userId: string,
    disciplineId: number,
    topic: number,
    mistakes: number,
    relampagoMistakes: number | null = null,
  ): Promise<ChapterResult> {
    // Only a chapter people can open can be finished, so books and their rewards count the same run.
    await this.opened(disciplineId, topic);
    const before = new Set(
      (await this.progress.achievements(userId)).map((a) => a.code),
    );
    const result = await this.paths.finishChapter(
      userId,
      disciplineId,
      topic,
      mistakes,
      relampagoMistakes,
    );
    const achievements = result.sabedoria
      ? (await this.progress.achievements(userId))
          .map((a) => a.code)
          .filter((code) => !before.has(code))
      : [];
    return { ...result, achievements };
  }

  /**
   * Enters one lesson of a chapter for this person (#123, #145), composed from its pieces: lessons 1-3 recognise, apply
   * and solve. 409 `lesson_locked` before it opens. The first entry costs LESSON_PRICE peixinhos, 409
   * `not_enough_peixinhos` with too few; practice is free (#150). Each lesson brings its own cards, or its share of an older chapter's.
   */
  async start(
    userId: string,
    disciplineId: number,
    topic: number,
    index: number,
  ): Promise<Lesson> {
    const { chapter, topics } = await this.opened(disciplineId, topic);
    const practice = await this.mustBeOpen(userId, disciplineId, topic, index);
    const composed = await this.composed(userId, chapter, topics, index);
    if (!practice) await this.wallet.pay(userId, 'peixinhos', LESSON_PRICE);
    return lessonOf(chapter, composed, index);
  }

  /**
   * O14-O18: one lesson of a chapter as a sample, for anyone and for free (#163), composed the way `start` composes it.
   * It records nothing: the onboarding plays it before there is a person to record it for.
   */
  async sample(
    disciplineId: number,
    topic: number,
    index: number,
  ): Promise<Lesson> {
    const { chapter, topics } = await this.opened(disciplineId, topic);
    return lessonOf(
      chapter,
      await this.composed('sample', chapter, topics, index),
      index,
    );
  }

  /** Goes on with a lesson after its last life, for CONTINUE_PRICE of the currency: 409 `not_enough_currency`. */
  async continue(
    userId: string,
    disciplineId: number,
    topic: number,
    index: number,
  ): Promise<Wallet> {
    await this.opened(disciplineId, topic);
    await this.mustBeOpen(userId, disciplineId, topic, index);
    return this.wallet.pay(userId, 'currency', CONTINUE_PRICE);
  }

  /** Gets 1 life back after a lesson's last life, for one stored extra life: 409 `not_enough_vidas`. */
  async extraLife(
    userId: string,
    disciplineId: number,
    topic: number,
    index: number,
  ): Promise<Wallet> {
    await this.opened(disciplineId, topic);
    await this.mustBeOpen(userId, disciplineId, topic, index);
    return this.wallet.pay(userId, 'vidas', 1);
  }

  /**
   * Whether the lesson is practice: done already, or in a finished chapter. 409 `lesson_locked` while it is neither
   * practice nor open.
   */
  private async mustBeOpen(
    userId: string,
    disciplineId: number,
    topic: number,
    index: number,
  ): Promise<boolean> {
    const done = new Set(
      (await this.paths.lessons(userId, disciplineId, topic)).map(
        (d) => d.lesson,
      ),
    );
    if (
      done.has(index) ||
      (await this.paths.chapterFinished(userId, disciplineId, topic))
    )
      return true;
    if (!lessonOpen(index, done)) throw lessonLocked();
    return false;
  }

  /** Records a lesson; only the misses that were in it count, each with the kind it was missed in. Lesson 3 finishes the chapter. */
  async finishLesson(
    userId: string,
    disciplineId: number,
    topic: number,
    index: number,
    missed: { topic: number; index: number }[],
  ): Promise<LessonResult> {
    const { chapter, topics } = await this.opened(disciplineId, topic);
    const inLesson = new Map(
      (await this.composed(userId, chapter, topics, index)).map((c) => [
        `${c.ref.topic}:${c.ref.index}`,
        c.ref,
      ]),
    );
    const kept = new Map<string, PieceRef>();
    for (const r of missed) {
      const ref = inLesson.get(`${r.topic}:${r.index}`);
      if (ref) kept.set(`${r.topic}:${r.index}`, ref);
    }
    const before = new Set(
      (await this.progress.achievements(userId)).map((a) => a.code),
    );
    const result = await this.paths.finishLesson(
      userId,
      disciplineId,
      topic,
      index,
      [...kept.values()],
    );
    // Always compared: a practice lesson gives no sabedoria but its study day can still complete semana_de_patinhas.
    const achievements = (await this.progress.achievements(userId))
      .map((a) => a.code)
      .filter((code) => !before.has(code));
    return { ...result, achievements };
  }

  /** A lesson's exercises for this person: the same on every call, so its result is checked against what was served. */
  private async composed(
    who: string,
    chapter: StoredChapter,
    topics: string[],
    index: number,
  ): Promise<Composed[]> {
    const disciplineId = chapter.discipline.id;
    const topic = chapter.topic.index;
    const subject = await this.paths.subjectPieces(disciplineId, topics);
    return composeLesson(
      { topic, pieces: chapter.pieces ?? [] },
      subject.filter((c) => c.topic !== topic),
      index,
      `${who}:${disciplineId}:${topic}`,
    );
  }

  private key(): string {
    const key = this.config.get('FIRECRAWL_API_KEY', { infer: true });
    if (!key)
      throw new Error(
        'FIRECRAWL_API_KEY is not set: chapters are made only by the generation script',
      );
    return key;
  }

  /** The chapter's pages: academic ones, then the Portuguese and English Wikipedias' (the query put in English). */
  private async pages(name: string, topicText: string): Promise<Source[]> {
    const key = this.key();
    const query = queryOf(name, [topicText]);
    const english =
      (
        await orRetry(
          this.ai.generateObject({
            label: 'arandu-chapter-search',
            schema: searchDraft,
            instructions: searchInstructions(),
            prompt: query,
            maxOutputTokens: 200,
          }),
        )
      )?.search ?? query;
    const [academic, pt, en] = await Promise.all([
      searchPages(key, query, CHAPTER_PAGES.academic, false),
      searchPages(key, query, CHAPTER_PAGES.pt, 'pt'),
      searchPages(key, english, CHAPTER_PAGES.en, 'en'),
    ]);
    const seen = new Set<string>();
    return [
      ...academic.map((p) => ({ ...p, wikipedia: false })),
      ...[...pt, ...en].map((p) => ({ ...p, wikipedia: true })),
    ].filter((p) => !seen.has(p.url) && seen.add(p.url));
  }

  /**
   * The chapter's three lessons from one search for its topic (#157), each a different part of it with up to
   * LESSON_CARDS verified cards, no card in two lessons. A lesson left short asks for more of its own.
   */
  private async lessons(
    name: string,
    head: string,
    topicText: string,
  ): Promise<StoredLesson[]> {
    const pages = await this.pages(name, topicText);
    if (!pages.length) throw chapterUnavailable();
    let draft: z.infer<typeof lessonsDraft> | null = null;
    for (let attempt = 1; attempt <= ATTEMPTS && !draft; attempt++) {
      const object = await orRetry(
        this.ai.generateObject({
          label: 'arandu-chapter-lessons',
          schema: lessonsDraft,
          instructions: lessonsInstructions(),
          prompt: `${head}\n\nPages:\n${pagesPrompt(pages)}`,
          maxOutputTokens: 6000,
        }),
      );
      if (object && object.lessons.length >= LESSONS) draft = object;
    }
    if (!draft) throw chapterUnavailable();

    const lessons: StoredLesson[] = [];
    for (const l of draft.lessons.slice(0, LESSONS)) {
      const taken = lessons.flatMap((o) => o.cards);
      const cards = together(taken, verified(l.cards, pages))
        .slice(taken.length)
        .slice(0, LESSON_CARDS);
      lessons.push({ title: l.title, cards });
    }
    for (const [i, lesson] of lessons.entries())
      if (lesson.cards.length < LESSON_CARDS)
        lesson.cards = await this.moreCards(
          head,
          lessons,
          lesson,
          pages,
          draft.lessons[i]!.search,
        );
    this.logger.log(
      `${head.split('\n')[1]}: lessons ${lessons.map((l) => `"${l.title}" ${l.cards.length}`).join(', ')}`,
    );
    return lessons;
  }

  /**
   * More cards for a lesson left short: from the chapter's pages again (no search paid), then from the English
   * Wikipedia for its own part (`search`, the model's English query). Fewer than MIN_LESSON_CARDS after both: the
   * chapter is unavailable.
   */
  private async moreCards(
    head: string,
    lessons: StoredLesson[],
    lesson: StoredLesson,
    pages: Source[],
    search: string,
  ): Promise<ChapterCard[]> {
    const n = lessons.indexOf(lesson) + 1;
    const others = lessons.filter((l) => l !== lesson);
    const taken = others.flatMap((o) => o.cards);
    let kept = lesson.cards;
    const sources = [
      async () => pages,
      async () =>
        (await searchPages(this.key(), search, LESSON_PAGES, 'en')).map(
          (p) => ({ ...p, wikipedia: true }),
        ),
    ];
    for (const source of sources) {
      const from = await source();
      if (!from.length) continue;
      const object = await orRetry(
        this.ai.generateObject({
          label: 'arandu-lesson-cards',
          schema: cardsDraft,
          instructions: lessonCardsInstructions(),
          prompt: `${head}\nLesson ${n} of ${LESSONS}: ${lesson.title}\nOther lessons: ${others.map((o) => o.title).join('; ')}\nCards it has: ${kept.map((c) => c.title).join('; ') || 'none'}\n\nPages:\n${pagesPrompt(from)}`,
          maxOutputTokens: 2500,
        }),
      );
      if (object)
        kept = together(
          taken,
          together(kept, verified(object.cards, from)),
        ).slice(taken.length);
      if (kept.length >= LESSON_CARDS) return kept.slice(0, LESSON_CARDS);
    }
    if (kept.length >= MIN_LESSON_CARDS) return kept;
    throw chapterUnavailable();
  }

  /** One lesson's pieces, written from its own cards and tagged with it; unavailable when they are never enough. */
  private async lessonPieces(
    chapter: string,
    head: string,
    careers: string[],
    lessons: StoredLesson[],
    n: number,
  ): Promise<StoredPiece[]> {
    const lesson = lessons[n - 1]!;
    const facts = JSON.stringify(
      lesson.cards.map((c) => ({ title: c.title, text: c.text })),
    );
    const others = lessons.filter((l) => l !== lesson).map((l) => l.title);
    const prompt = [
      head,
      `Lesson ${n} of ${LESSONS}: ${lesson.title}`,
      `Other lessons: ${others.join('; ')}`,
      ...(careers.length
        ? [`Careers that study this subject: ${careers.join(', ')}`]
        : []),
      '',
      `Cards:\n${facts}`,
    ].join('\n');
    // Practice is optional: an answer that missed its schema leaves the lesson without problems or code.
    const practice = (await orRetry(
      this.ai.generateObject({
        label: 'arandu-chapter-practice',
        schema: practiceDraft,
        instructions: practiceInstructions(),
        prompt,
        maxOutputTokens: 3000,
      }),
    )) ?? { problems: [], code: [] };
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const basics = await orRetry(
        this.ai.generateObject({
          label: 'arandu-chapter-pieces',
          schema: basicsDraft,
          instructions: basicsInstructions(),
          prompt,
          maxOutputTokens: 4000,
        }),
      );
      if (!basics) {
        this.logger.warn(
          `Chapter ${chapter} lesson ${n} pieces attempt ${attempt}: the answer missed its schema`,
        );
        continue;
      }
      const pieces = piecesOf({ ...basics, ...practice });
      this.logger.log(
        `Chapter ${chapter} lesson ${n} pieces attempt ${attempt}: ${pieces.map((p) => p.type).join(', ')}`,
      );
      if (enoughPieces(pieces)) return pieces.map((p) => ({ ...p, lesson: n }));
    }
    throw chapterUnavailable();
  }

  private async generate(
    id: number,
    name: string,
    topic: number,
    topics: string[],
    stored: StoredLesson[] | undefined,
  ): Promise<StoredChapter> {
    const topicText = topics[topic];
    if (topicText === undefined) throw chapterNotFound();
    const total = topics.length;
    const head = `Subject: ${name}\nTopic ${topic + 1} of ${total}: ${topicText}`;
    const lessons =
      stored?.length === LESSONS
        ? stored
        : await this.lessons(name, head, topicText);
    const careers = await this.paths.careersOf(id);
    const pieces: StoredPiece[] = [];
    for (let n = 1; n <= LESSONS; n++)
      pieces.push(
        ...(await this.lessonPieces(
          `${id}:${topic}`,
          head,
          careers,
          lessons,
          n,
        )),
      );
    const content: StoredChapter = {
      discipline: { id, name },
      topic: { index: topic, text: topicText, total },
      cards: lessons.flatMap((l) => l.cards),
      lessons,
      exercises: composeChapter({ topic, pieces }, `${id}:${topic}`),
      pieces,
    };
    await this.paths.saveChapterContent(content);
    return content;
  }
}
