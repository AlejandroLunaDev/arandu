import type {
  Exercise,
  StopCard,
  StopContent,
  StopResult,
} from '@arandu/contracts';
import { AiOutputError, AiService } from '@nestjs/ai';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ProgressService } from '../progress/progress.service.js';
import { PathsRepository } from './paths.repository.js';
import { quoteIsOnPage } from './source-check.js';
import {
  cardsInstructions,
  exercisesInstructions,
  subjectCardsInstructions,
} from './stop.prompt.js';
import { stopNotFound, stopUnavailable } from './paths.errors.js';

/** Topics whose cards one web search writes: the search is paid once for them, not once per stop. */
export const TOPICS_PER_SEARCH = 6;

const text = z.string().min(1);
const index = z.number().int();
const card = z.object({
  title: text,
  text,
  source: z.object({ label: text, url: z.url(), quote: text }),
});

const two = z.object({ first: text, second: text });

// A stop is written in steps: the cards with a web search, then its exercises from the verified cards. Each schema is
// kept small (and without tuples): the provider's structured output refuses large grammars and `prefixItems`.
const cardsDraft = z.object({ cards: z.array(card).min(1).max(3) });
// Cards for several topics of a subject from one search; `topic` is the topic's number as listed (1-based).
const subjectCardsDraft = z.object({
  cards: z
    .array(card.extend({ topic: index }))
    .min(1)
    .max(2 * TOPICS_PER_SEARCH),
});

// The first stop of a subject (O15-O18) has the four basic kinds; every other stop has all of them (R01-R12).
const basicExercises = z.object({
  escolhaUma: z.object({
    prompt: text,
    options: z.array(text).min(3).max(4),
    answer: index,
    why: text,
  }),
  unaOsPares: z.object({
    prompt: text,
    pairs: z
      .array(z.object({ term: text, match: text }))
      .min(3)
      .max(5),
    why: text,
  }),
  verdadeiroOuFalso: z.object({
    statements: z
      .array(z.object({ text, answer: z.boolean(), why: text }))
      .length(3),
    why: text,
  }),
  completeAFrase: z.object({
    text,
    tiles: z.array(text).min(2).max(8),
    answers: z.array(text).min(1).max(2),
    why: text,
  }),
});

const extraExercises = z.object({
  monteAFrase: z.object({
    prompt: text,
    answer: z.array(text).min(3).max(16),
    distractors: z.array(text).max(3),
    why: text,
  }),
  escolhaAFraseCerta: z.object({
    prompt: text,
    options: z.array(text).min(3).max(4),
    answer: index,
    why: text,
  }),
  naGrade: z.object({
    prompt: text,
    rows: two,
    columns: two,
    items: z
      .array(z.object({ text, row: index, column: index }))
      .min(4)
      .max(8),
    why: text,
  }),
  separeNasCestas: z.object({
    prompt: text,
    baskets: two,
    items: z
      .array(z.object({ text, basket: index }))
      .min(4)
      .max(8),
    why: text,
  }),
  toqueNoTrecho: z.object({
    prompt: text,
    segments: z.array(text).min(3).max(8),
    answer: index,
    why: text,
  }),
  ordene: z.object({
    prompt: text,
    steps: z.array(text).min(3).max(6),
    why: text,
  }),
  expliqueParaOArandu: z.object({
    prompt: text,
    ideas: z.array(text).min(2).max(4),
    why: text,
  }),
});

export type StopDraft = z.infer<typeof basicExercises> &
  Partial<z.infer<typeof extraExercises>>;

const pair = (t: { first: string; second: string }): [string, string] => [
  t.first,
  t.second,
];

const inRange = (i: number, list: unknown[]) => i >= 0 && i < list.length;
const bit = (i: number): i is 0 | 1 => i === 0 || i === 1;
// Two choices with the same text leave the person guessing which one is right.
const distinct = (list: string[]) =>
  new Set(list.map((s) => s.trim().toLowerCase())).size === list.length;
const count = (list: string[], s: string) => list.filter((x) => x === s).length;

/** The drafted exercises, in R01-R12 order, without any the model got inconsistent (an answer out of range, a gap
 * without its word or with too few tiles for it, a cell outside the grid, two choices with the same text). */
export function exercisesOf(draft: StopDraft): Exercise[] {
  const out: Exercise[] = [];
  const {
    escolhaUma: eu,
    unaOsPares: up,
    verdadeiroOuFalso: vf,
    completeAFrase: cf,
  } = draft;
  if (inRange(eu.answer, eu.options) && distinct(eu.options))
    out.push({ kind: 'escolha_uma', mode: 'reconhecer', ...eu });
  if (
    distinct(up.pairs.map((p) => p.term)) &&
    distinct(up.pairs.map((p) => p.match))
  )
    out.push({
      kind: 'una_os_pares',
      mode: 'reconhecer',
      prompt: up.prompt,
      pairs: up.pairs.map((p) => [p.term, p.match]),
      why: up.why,
    });
  if (distinct(vf.statements.map((st) => st.text)))
    out.push({ kind: 'verdadeiro_ou_falso', mode: 'reconhecer', ...vf });
  if (
    cf.text.split('___').length - 1 === cf.answers.length &&
    cf.answers.every((a) => count(cf.tiles, a) >= count(cf.answers, a))
  )
    out.push({ kind: 'complete_a_frase', mode: 'reconhecer', ...cf });

  const {
    monteAFrase: mf,
    escolhaAFraseCerta: ef,
    naGrade: ng,
    separeNasCestas: sc,
  } = draft;
  const { toqueNoTrecho: tt, ordene: od, expliqueParaOArandu: ex } = draft;
  // The answer may repeat a word; a distractor may not be one of its words, or a right tile would count as wrong.
  if (
    mf &&
    distinct([
      ...new Set(mf.answer.map((w) => w.trim().toLowerCase())),
      ...mf.distractors,
    ])
  )
    out.push({ kind: 'monte_a_frase', mode: 'produzir', ...mf });
  if (ef && inRange(ef.answer, ef.options) && distinct(ef.options))
    out.push({ kind: 'escolha_a_frase_certa', mode: 'reconhecer', ...ef });
  if (
    ng &&
    ng.items.every((i) => bit(i.row) && bit(i.column)) &&
    distinct(pair(ng.rows)) &&
    distinct(pair(ng.columns)) &&
    distinct(ng.items.map((i) => i.text))
  )
    out.push({
      kind: 'na_grade',
      mode: 'reconhecer',
      prompt: ng.prompt,
      rows: pair(ng.rows),
      columns: pair(ng.columns),
      items: ng.items.map((i) => ({
        text: i.text,
        cell: [i.row as 0 | 1, i.column as 0 | 1],
      })),
      why: ng.why,
    });
  if (
    sc &&
    sc.items.every((i) => bit(i.basket)) &&
    distinct(pair(sc.baskets)) &&
    distinct(sc.items.map((i) => i.text))
  )
    out.push({
      kind: 'separe_nas_cestas',
      mode: 'reconhecer',
      prompt: sc.prompt,
      baskets: pair(sc.baskets),
      items: sc.items.map((i) => ({ text: i.text, basket: i.basket as 0 | 1 })),
      why: sc.why,
    });
  if (tt && inRange(tt.answer, tt.segments) && distinct(tt.segments))
    out.push({ kind: 'toque_no_trecho', mode: 'reconhecer', ...tt });
  if (od && distinct(od.steps))
    out.push({ kind: 'ordene', mode: 'produzir', ...od });
  if (ex) out.push({ kind: 'explique_para_o_arandu', mode: 'produzir', ...ex });
  return out;
}

/** Exercises a stop needs to be kept: all four on a subject's first stop, most of them on the others. */
export const minExercises = (topic: number) => (topic === 0 ? 4 : 8);

/** The model's object, or null when its answer missed the schema (a list too long, a field left out): retried. */
async function orRetry<T>(draft: Promise<{ object: T }>): Promise<T | null> {
  try {
    return (await draft).object;
  } catch (error) {
    if (error instanceof AiOutputError) return null;
    throw error;
  }
}

/** Tries to write a stop with verified sources this many times before giving up. */
const ATTEMPTS = 2;

/** A stop of a subject: made once, from a web search, with every card's quote checked on its page; then reused. */
@Injectable()
export class StopsService {
  private readonly logger = new Logger(StopsService.name);
  // Two people opening a new stop at once share one generation.
  private readonly pending = new Map<string, Promise<StopContent>>();

  constructor(
    private readonly ai: AiService,
    private readonly paths: PathsRepository,
    private readonly progress: ProgressService,
  ) {}

  /**
   * A stop people can open: stored and inside its subject's leading run of made stops (the run paths and books list),
   * so it is never generated live and a book's run never grows under someone mid-way.
   */
  async stop(disciplineId: number, topic: number): Promise<StopContent> {
    const discipline = await this.paths.discipline(disciplineId);
    const topicText = discipline?.topics[topic];
    const content =
      topicText !== undefined &&
      topic < (await this.paths.madeCount(disciplineId))
        ? await this.paths.stopContent(disciplineId, topic, topicText)
        : null;
    if (!content) throw stopNotFound();
    return content;
  }

  /**
   * A stop's content, made now from a web search when it is not stored yet: for the loading scripts, not for people.
   * `remake` writes its exercises again over the stored stop, from its stored cards; the old stop stays if that fails.
   */
  async make(
    disciplineId: number,
    topic: number,
    remake = false,
  ): Promise<StopContent> {
    const discipline = await this.paths.discipline(disciplineId);
    const topicText = discipline?.topics[topic];
    if (!discipline || topicText === undefined) throw stopNotFound();

    const stored = await this.paths.stopContent(disciplineId, topic, topicText);
    if (stored && !remake) return stored;

    const key = `${disciplineId}:${topic}`;
    let generation = this.pending.get(key);
    if (!generation) {
      generation = this.generate(
        discipline.id,
        discipline.name,
        topic,
        discipline.topics,
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
  ): Promise<StopResult> {
    // Only a stop people can open can be finished, so books and their rewards count the same run.
    await this.stop(disciplineId, topic);
    const before = new Set(
      (await this.progress.achievements(userId)).map((a) => a.code),
    );
    const result = await this.paths.finishStop(
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

  /** The stop's cards from a web search, keeping only those whose quote is on its page. */
  private async cards(
    name: string,
    topic: number,
    topicText: string,
    total: number,
  ): Promise<StopCard[]> {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const object = await orRetry(
        this.ai.generateObject({
          model: 'web',
          label: 'arandu-stop-cards',
          schema: cardsDraft,
          instructions: cardsInstructions(),
          prompt: `Subject: ${name}\nTopic ${topic + 1} of ${total}: ${topicText}`,
          maxOutputTokens: 2500,
        }),
      );
      if (!object) continue;
      const checks = await Promise.all(
        object.cards.map((c) => quoteIsOnPage(c.source.url, c.source.quote)),
      );
      const cards = object.cards.filter((_, i) => checks[i]);
      this.logger.log(
        `Stop cards attempt ${attempt}: ${cards.length}/${object.cards.length} verified`,
      );
      if (cards.length) return cards;
    }
    throw stopUnavailable();
  }

  /**
   * The stop's cards: stored ones, else one search for its block of topics (saving every topic's verified cards), else
   * a search for this topic alone.
   */
  private async stopCards(
    id: number,
    name: string,
    topic: number,
    topics: string[],
  ): Promise<StopCard[]> {
    const stored = await this.paths.stopCards(id, topics);
    const mine = stored.get(topic);
    if (mine) return mine;

    const start = topic - (topic % TOPICS_PER_SEARCH);
    const whole = topics
      .slice(start, start + TOPICS_PER_SEARCH)
      .map((text, i) => ({ index: start + i, text }));
    const block = whole.filter((t) => !stored.has(t.index));
    // A block already searched (some topic of it stored) is not searched again: its uncovered topics search alone.
    const object =
      block.length === whole.length
        ? await this.blockCards(id, name, block)
        : null;
    if (object) {
      const checks = await Promise.all(
        object.cards.map((c) => quoteIsOnPage(c.source.url, c.source.quote)),
      );
      const found = block
        .map((t, i) => ({
          topic: t.index,
          topicText: t.text,
          cards: object.cards
            .filter((c, j) => checks[j] && c.topic === i + 1)
            .slice(0, 3)
            .map(({ title, text, source }) => ({ title, text, source })),
        }))
        .filter((e) => e.cards.length);
      this.logger.log(
        `Subject ${id} cards for topics ${start + 1}-${start + block.length}: ${checks.filter(Boolean).length}/${object.cards.length} verified, ${found.length}/${block.length} topics`,
      );
      await this.paths.saveStopCards(id, found);
      const cards = found.find((e) => e.topic === topic)?.cards;
      if (cards) return cards;
    }
    return this.cards(name, topic, topics[topic], topics.length);
  }

  /**
   * One web search for a block of topics. Null when its answer missed the schema or the provider failed: the stop then
   * falls back to a search for its own topic.
   */
  private async blockCards(
    id: number,
    name: string,
    block: { index: number; text: string }[],
  ) {
    try {
      return await orRetry(
        this.ai.generateObject({
          model: 'web',
          label: 'arandu-subject-cards',
          schema: subjectCardsDraft,
          instructions: subjectCardsInstructions(),
          prompt: `Subject: ${name}\nTopics:\n${block.map((t, i) => `${i + 1}. ${t.text}`).join('\n')}`,
          maxOutputTokens: 900 * block.length,
        }),
      );
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
  ): Promise<StopContent> {
    const topicText = topics[topic];
    const total = topics.length;
    const cards = await this.stopCards(id, name, topic, topics);
    const facts = JSON.stringify(
      cards.map((c) => ({ title: c.title, text: c.text })),
    );
    const prompt = `Subject: ${name}\nTopic ${topic + 1} of ${total}: ${topicText}\n\nCards:\n${facts}`;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const [basic, extra] = await Promise.all([
        orRetry(
          this.ai.generateObject({
            label: 'arandu-stop-exercises',
            schema: basicExercises,
            instructions: exercisesInstructions('basic'),
            prompt,
            maxOutputTokens: 3000,
          }),
        ),
        topic === 0
          ? null
          : orRetry(
              this.ai.generateObject({
                label: 'arandu-stop-exercises',
                schema: extraExercises,
                instructions: exercisesInstructions('extra'),
                prompt,
                maxOutputTokens: 4000,
              }),
            ),
      ]);
      if (!basic || (topic > 0 && !extra)) {
        this.logger.warn(
          `Stop ${id}:${topic} exercises attempt ${attempt}: an answer missed its schema`,
        );
        continue;
      }
      const exercises = exercisesOf({ ...basic, ...extra });
      this.logger.log(
        `Stop ${id}:${topic} exercises attempt ${attempt}: ${exercises.length} consistent`,
      );
      if (exercises.length < minExercises(topic)) continue;
      const content: StopContent = {
        discipline: { id, name },
        topic: { index: topic, text: topicText, total },
        cards,
        exercises,
      };
      await this.paths.saveStopContent(content);
      return content;
    }
    throw stopUnavailable();
  }
}
