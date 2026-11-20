import type {
  Exercise,
  StopCard,
  StopContent,
  StopResult,
} from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import { ProgressService } from '../progress/progress.service.js';
import { PathsRepository } from './paths.repository.js';
import { quoteIsOnPage } from './source-check.js';
import { stopInstructions } from './stop.prompt.js';

const text = z.string().min(1);
const index = z.number().int();
const card = z.object({
  title: text,
  text,
  source: z.object({ label: text, url: z.url(), quote: text }),
});

// The first stop of a subject (O15-O18) has the four basic kinds; every other stop has all of them (R01-R12).
const basicDraft = z.object({
  cards: z.array(card).min(1).max(3),
  escolhaUma: z.object({
    prompt: text,
    options: z.array(text).min(3).max(4),
    answer: index,
    why: text,
  }),
  unaOsPares: z.object({
    prompt: text,
    pairs: z
      .array(z.tuple([text, text]))
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

const fullDraft = basicDraft.extend({
  monteAFrase: z.object({
    prompt: text,
    answer: z.array(text).min(3).max(12),
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
    rows: z.tuple([text, text]),
    columns: z.tuple([text, text]),
    items: z
      .array(z.object({ text, row: index, column: index }))
      .min(4)
      .max(8),
    why: text,
  }),
  separeNasCestas: z.object({
    prompt: text,
    baskets: z.tuple([text, text]),
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

export type StopDraft = z.infer<typeof basicDraft> &
  Partial<z.infer<typeof fullDraft>>;

const inRange = (i: number, list: unknown[]) => i >= 0 && i < list.length;
const bit = (i: number): i is 0 | 1 => i === 0 || i === 1;

/** The draft's exercises, in R01-R12 order, without any the model got inconsistent (an answer out of range, a gap
 * without its word, a cell outside the grid). */
export function exercisesOf(draft: StopDraft): Exercise[] {
  const out: Exercise[] = [];
  const {
    escolhaUma: eu,
    unaOsPares: up,
    verdadeiroOuFalso: vf,
    completeAFrase: cf,
  } = draft;
  if (inRange(eu.answer, eu.options))
    out.push({ kind: 'escolha_uma', mode: 'reconhecer', ...eu });
  out.push({ kind: 'una_os_pares', mode: 'reconhecer', ...up });
  out.push({ kind: 'verdadeiro_ou_falso', mode: 'reconhecer', ...vf });
  if (
    cf.text.split('___').length - 1 === cf.answers.length &&
    cf.answers.every((a) => cf.tiles.includes(a))
  )
    out.push({ kind: 'complete_a_frase', mode: 'reconhecer', ...cf });

  const {
    monteAFrase: mf,
    escolhaAFraseCerta: ef,
    naGrade: ng,
    separeNasCestas: sc,
  } = draft;
  const { toqueNoTrecho: tt, ordene: od, expliqueParaOArandu: ex } = draft;
  if (mf) out.push({ kind: 'monte_a_frase', mode: 'produzir', ...mf });
  if (ef && inRange(ef.answer, ef.options))
    out.push({ kind: 'escolha_a_frase_certa', mode: 'reconhecer', ...ef });
  if (ng && ng.items.every((i) => bit(i.row) && bit(i.column)))
    out.push({
      kind: 'na_grade',
      mode: 'reconhecer',
      prompt: ng.prompt,
      rows: ng.rows,
      columns: ng.columns,
      items: ng.items.map((i) => ({
        text: i.text,
        cell: [i.row as 0 | 1, i.column as 0 | 1],
      })),
      why: ng.why,
    });
  if (sc && sc.items.every((i) => bit(i.basket)))
    out.push({
      kind: 'separe_nas_cestas',
      mode: 'reconhecer',
      prompt: sc.prompt,
      baskets: sc.baskets,
      items: sc.items.map((i) => ({ text: i.text, basket: i.basket as 0 | 1 })),
      why: sc.why,
    });
  if (tt && inRange(tt.answer, tt.segments))
    out.push({ kind: 'toque_no_trecho', mode: 'reconhecer', ...tt });
  if (od) out.push({ kind: 'ordene', mode: 'produzir', ...od });
  if (ex) out.push({ kind: 'explique_para_o_arandu', mode: 'produzir', ...ex });
  return out;
}

/** Exercises a stop needs to be kept: all four on a subject's first stop, most of them on the others. */
export const minExercises = (topic: number) => (topic === 0 ? 4 : 8);

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

  async stop(disciplineId: number, topic: number): Promise<StopContent> {
    const discipline = await this.paths.discipline(disciplineId);
    const topicText = discipline?.topics[topic];
    if (!discipline || topicText === undefined)
      throw new NotFoundException(
        `No stop ${topic} in subject ${disciplineId}`,
      );

    const stored = await this.paths.stopContent(disciplineId, topic, topicText);
    if (stored) return stored;

    const key = `${disciplineId}:${topic}`;
    let generation = this.pending.get(key);
    if (!generation) {
      generation = this.generate(
        discipline.id,
        discipline.name,
        topic,
        topicText,
        discipline.topics.length,
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
    const discipline = await this.paths.discipline(disciplineId);
    if (!discipline || topic >= discipline.topics.length)
      throw new NotFoundException(
        `No stop ${topic} in subject ${disciplineId}`,
      );
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

  private async generate(
    id: number,
    name: string,
    topic: number,
    topicText: string,
    total: number,
  ): Promise<StopContent> {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const { object } = await this.ai.generateObject({
        model: 'web',
        label: 'arandu-stop',
        schema: topic === 0 ? basicDraft : fullDraft,
        instructions: stopInstructions(topic === 0),
        prompt: `Subject: ${name}\nTopic ${topic + 1} of ${total}: ${topicText}`,
        maxOutputTokens: topic === 0 ? 3000 : 6000,
      });
      const checks = await Promise.all(
        object.cards.map((c) => quoteIsOnPage(c.source.url, c.source.quote)),
      );
      const cards: StopCard[] = object.cards.filter((_, i) => checks[i]);
      const exercises = exercisesOf(object);
      this.logger.log(
        `Stop ${id}:${topic} attempt ${attempt}: ${cards.length}/${object.cards.length} cards verified, ${exercises.length} exercises`,
      );
      if (!cards.length || exercises.length < minExercises(topic)) continue;
      const content: StopContent = {
        discipline: { id, name },
        topic: { index: topic, text: topicText, total },
        cards,
        exercises,
      };
      await this.paths.saveStopContent(content);
      return content;
    }
    throw new ServiceUnavailableException(
      'Arandu could not prepare this stop with checked sources; try again later',
    );
  }
}
