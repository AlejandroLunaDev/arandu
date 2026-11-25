import type {
  ChapterCard,
  ChapterContent,
  ChapterResult,
  Lesson,
  LessonExercise,
  LessonResult,
} from '@arandu/contracts';
import { AiOutputError, AiService } from '@nestjs/ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../../core/config/env.js';
import { ProgressService } from '../progress/progress.service.js';
import {
  cardsInstructions,
  basicsInstructions,
  practiceInstructions,
  subjectCardsInstructions,
} from './chapter.prompt.js';
import {
  type Composed,
  composeChapter,
  composeLesson,
  composeReview,
  type PieceRef,
} from './composer.js';
import { type Page, searchPages } from './firecrawl.js';
import { LESSONS } from './lessons.logic.js';
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
} from './pieces.js';
import { quoteIn, refusedPage } from './source-check.js';

/** Topics whose cards one search writes: the search is paid once for them, not once per chapter. */
export const TOPICS_PER_SEARCH = 6;
/** Pages a search downloads (a Firecrawl credit each): academic ones, then Wikipedia's, for a block or a lone topic. */
const BLOCK_PAGES = { academic: 5, wikipedia: 2 };
const TOPIC_PAGES = { academic: 5, wikipedia: 2 };
/** A chapter rests on MIN_CARDS verified cards at least, MAX_CARDS at most: one card's text gives too few concepts. */
const MIN_CARDS = 3;
const MAX_CARDS = 5;
/** Words a search query keeps: a search engine reads a long query badly. */
const QUERY_WORDS = 30;
/** The longest quote a card keeps: one sentence, a short citation. */
const QUOTE_CHARS = 300;

const text = z.string().min(1);
const index = z.number().int();
// `page` is the page's number as listed (1-based); the card's source is that page.
const card = z.object({ title: text, text, page: index, quote: text });

// No counts in these schemas: a list one card too long would drop every card. A chapter keeps MAX_CARDS verified.
const cardsDraft = z.object({ cards: z.array(card) });
// Cards for several topics of a subject from one search; `topic` is the topic's number as listed (1-based).
const subjectCardsDraft = z.object({
  cards: z.array(card.extend({ topic: index })),
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

/** Tries to write a chapter's cards, and then its pieces, this many times before giving up. */
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

/** The cards of both lists, each quote once: a second search adds to the cards a topic has. */
const together = (a: ChapterCard[], b: ChapterCard[]) =>
  [...a, ...b].filter(
    (c, i, all) =>
      all.findIndex(
        (o) =>
          o.source.url === c.source.url && o.source.quote === c.source.quote,
      ) === i,
  );

/** The cards whose quote is on the page they name, each citing that page. */
function verified<T extends z.infer<typeof card>>(
  cards: T[],
  pages: Source[],
): (ChapterCard & { draft: T })[] {
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
        draft: c,
      },
    ];
  });
}

const shown = ({
  discipline,
  topic,
  cards,
  exercises,
}: StoredChapter): ChapterContent => ({ discipline, topic, cards, exercises });

/**
 * A chapter of a subject: made once from pages Firecrawl found, with every card's quote checked on its page, and its
 * pieces written from the verified cards; then reused. Its lessons are composed from the pieces, per person.
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
   * A chapter, made now when it is not stored yet: for the generation script, not for people. `remake` writes its
   * pieces again over the stored chapter, from its stored cards; the old chapter stays if that fails.
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
        stored?.cards ?? [],
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
   * One lesson of a chapter for this person (#123), composed from its pieces: lessons 1-3 recognise, apply and solve;
   * lesson 4 brings back what they missed in another kind. 409 before the lessons ahead of it are done.
   */
  async lesson(
    userId: string,
    disciplineId: number,
    topic: number,
    index: number,
  ): Promise<Lesson> {
    const { chapter, topics } = await this.opened(disciplineId, topic);
    const done = await this.paths.lessons(userId, disciplineId, topic);
    if (
      index > done.length + 1 &&
      !(await this.paths.chapterFinished(userId, disciplineId, topic))
    )
      throw lessonLocked();
    const composed = await this.composed(userId, chapter, topics, index, done);
    return {
      index,
      total: LESSONS,
      cards: index === 1 ? chapter.cards : null,
      exercises: composed.map((c): LessonExercise => ({
        ...c.exercise,
        topic: c.ref.topic,
        index: c.ref.index,
      })),
    };
  }

  /** Records a lesson; only the misses that were in it count, each with the kind it was missed in. Lesson 4 finishes the chapter. */
  async finishLesson(
    userId: string,
    disciplineId: number,
    topic: number,
    index: number,
    missed: { topic: number; index: number }[],
  ): Promise<LessonResult> {
    const { chapter, topics } = await this.opened(disciplineId, topic);
    const done = await this.paths.lessons(userId, disciplineId, topic);
    const inLesson = new Map(
      (await this.composed(userId, chapter, topics, index, done)).map((c) => [
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
    userId: string,
    chapter: StoredChapter,
    topics: string[],
    index: number,
    done: { lesson: number; missed: PieceRef[] }[],
  ): Promise<Composed[]> {
    const disciplineId = chapter.discipline.id;
    const topic = chapter.topic.index;
    const seed = `${userId}:${disciplineId}:${topic}`;
    const own = { topic, pieces: chapter.pieces ?? [] };
    const subject = await this.paths.subjectPieces(disciplineId, topics);
    if (index < LESSONS)
      return composeLesson(
        own,
        subject.filter((c) => c.topic !== topic),
        index,
        seed,
      );
    return composeReview(
      own,
      subject,
      done.filter((d) => d.lesson < LESSONS).flatMap((d) => d.missed),
      await this.paths.missedElsewhere(userId, disciplineId, topic),
      seed,
    );
  }

  /** Academic pages, then Wikipedia's, for one query; a page both searches found comes once. */
  private async pages(
    query: string,
    count: { academic: number; wikipedia: number },
  ): Promise<Source[]> {
    const key = this.config.get('FIRECRAWL_API_KEY', { infer: true });
    if (!key)
      throw new Error(
        'FIRECRAWL_API_KEY is not set: chapters are made only by the generation script',
      );
    const [academic, wikipedia] = await Promise.all([
      searchPages(key, query, count.academic, false),
      searchPages(key, query, count.wikipedia, true),
    ]);
    const seen = new Set<string>();
    return [
      ...academic.map((p) => ({ ...p, wikipedia: false })),
      ...wikipedia.map((p) => ({ ...p, wikipedia: true })),
    ].filter((p) => !seen.has(p.url) && seen.add(p.url));
  }

  /**
   * The chapter's cards from a search for its topic alone, added to those it `has`, keeping only those whose quote is
   * on its page. Fewer than MIN_CARDS: unavailable.
   */
  private async cards(
    name: string,
    topic: number,
    topicText: string,
    total: number,
    has: ChapterCard[],
  ): Promise<ChapterCard[]> {
    const pages = await this.pages(queryOf(name, [topicText]), TOPIC_PAGES);
    if (!pages.length) throw chapterUnavailable();
    let kept = has;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const object = await orRetry(
        this.ai.generateObject({
          label: 'arandu-chapter-cards',
          schema: cardsDraft,
          instructions: cardsInstructions(),
          prompt: `Subject: ${name}\nTopic ${topic + 1} of ${total}: ${topicText}\n\nPages:\n${pagesPrompt(pages)}`,
          maxOutputTokens: 2500,
        }),
      );
      if (!object) continue;
      const cards = verified(object.cards, pages).map(
        ({ title, text, source }) => ({ title, text, source }),
      );
      kept = together(kept, cards);
      this.logger.log(
        `Chapter cards attempt ${attempt}: ${cards.length}/${object.cards.length} verified, ${kept.length} in all`,
      );
      if (kept.length >= MIN_CARDS) return kept.slice(0, MAX_CARDS);
    }
    throw chapterUnavailable();
  }

  /**
   * The chapter's cards: stored ones (and those of the chapter being remade, `current`) when they are MIN_CARDS, else one
   * search for its block of topics (saving every topic's verified cards), and then a search for this topic alone that
   * adds to what it has, saved for the next remake.
   */
  private async chapterCards(
    id: number,
    name: string,
    topic: number,
    topics: string[],
    current: ChapterCard[],
  ): Promise<ChapterCard[]> {
    const stored = await this.paths.chapterCards(id, topics);
    // A card stored before its site was refused is dropped; a topic left without cards is made again.
    for (const [t, cards] of stored) {
      const kept = cards.filter((c) => !refusedPage(c.source.url));
      if (kept.length) stored.set(t, kept);
      else stored.delete(t);
    }
    let mine = together(
      stored.get(topic) ?? [],
      current.filter((c) => !refusedPage(c.source.url)),
    );
    if (mine.length >= MIN_CARDS) return mine.slice(0, MAX_CARDS);

    const start = topic - (topic % TOPICS_PER_SEARCH);
    const whole = topics
      .slice(start, start + TOPICS_PER_SEARCH)
      .map((text, i) => ({ index: start + i, text }));
    const block = whole.filter((t) => !stored.has(t.index));
    // A block already searched (some topic of it stored) is not searched again: its uncovered topics search alone.
    if (block.length === whole.length) {
      const found = await this.blockCards(id, name, block);
      if (found) {
        await this.paths.saveChapterCards(id, found);
        mine = together(
          mine,
          found.find((e) => e.topic === topic)?.cards ?? [],
        );
        if (mine.length >= MIN_CARDS) return mine.slice(0, MAX_CARDS);
      }
    }
    const topicText = topics[topic];
    if (topicText === undefined) throw chapterNotFound();
    const cards = await this.cards(name, topic, topicText, topics.length, mine);
    await this.paths.saveChapterCards(id, [{ topic, topicText, cards }]);
    return cards;
  }

  /**
   * One search for a block of topics, and each topic's verified cards. Null when the search or the provider failed or
   * the answer missed the schema: the chapter then falls back to a search for its own topic.
   */
  private async blockCards(
    id: number,
    name: string,
    block: { index: number; text: string }[],
  ) {
    try {
      const pages = await this.pages(
        queryOf(
          name,
          block.map((t) => t.text),
        ),
        BLOCK_PAGES,
      );
      if (!pages.length) return null;
      const object = await orRetry(
        this.ai.generateObject({
          label: 'arandu-subject-cards',
          schema: subjectCardsDraft,
          instructions: subjectCardsInstructions(),
          prompt: `Subject: ${name}\nTopics:\n${block.map((t, i) => `${i + 1}. ${t.text}`).join('\n')}\n\nPages:\n${pagesPrompt(pages)}`,
          maxOutputTokens: 1500 * block.length,
        }),
      );
      if (!object) return null;
      const cards = verified(object.cards, pages);
      const found = block
        .map((t, i) => ({
          topic: t.index,
          topicText: t.text,
          cards: cards
            .filter((c) => c.draft.topic === i + 1)
            .slice(0, MAX_CARDS)
            .map(({ title, text, source }) => ({ title, text, source })),
        }))
        .filter((e) => e.cards.length);
      this.logger.log(
        `Subject ${id} cards for topics ${block[0]!.index + 1}-${block.at(-1)!.index + 1}: ${cards.length}/${object.cards.length} verified from ${pages.length} pages, ${found.length}/${block.length} topics`,
      );
      return found;
    } catch (error) {
      this.logger.warn(`Subject ${id} block search failed: ${String(error)}`);
      return null;
    }
  }

  private async generate(
    id: number,
    name: string,
    topic: number,
    topics: string[],
    current: ChapterCard[],
  ): Promise<StoredChapter> {
    const topicText = topics[topic];
    if (topicText === undefined) throw chapterNotFound();
    const total = topics.length;
    const cards = await this.chapterCards(id, name, topic, topics, current);
    const facts = JSON.stringify(
      cards.map((c) => ({ title: c.title, text: c.text })),
    );
    const prompt = `Subject: ${name}\nTopic ${topic + 1} of ${total}: ${topicText}\n\nCards:\n${facts}`;
    // Practice is optional: an answer that missed its schema leaves the chapter without problems or code.
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
          `Chapter ${id}:${topic} pieces attempt ${attempt}: the answer missed its schema`,
        );
        continue;
      }
      const pieces = piecesOf({ ...basics, ...practice });
      this.logger.log(
        `Chapter ${id}:${topic} pieces attempt ${attempt}: ${pieces.map((p) => p.type).join(', ')}`,
      );
      if (!enoughPieces(pieces)) continue;
      const content: StoredChapter = {
        discipline: { id, name },
        topic: { index: topic, text: topicText, total },
        cards,
        exercises: composeChapter({ topic, pieces }, `${id}:${topic}`),
        pieces,
      };
      await this.paths.saveChapterContent(content);
      return content;
    }
    throw chapterUnavailable();
  }
}
