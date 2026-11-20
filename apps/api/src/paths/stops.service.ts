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
import { PathsRepository } from './paths.repository.js';
import { quoteIsOnPage } from './source-check.js';
import { stopInstructions } from './stop.prompt.js';

const text = z.string().min(1);
const stopDraft = z.object({
  cards: z
    .array(
      z.object({
        title: text,
        text,
        source: z.object({ label: text, url: z.url(), quote: text }),
      }),
    )
    .min(1)
    .max(3),
  escolhaUma: z.object({
    prompt: text,
    options: z.array(text).min(3).max(4),
    answer: z.number().int(),
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
  }),
  completeAFrase: z.object({
    text,
    tiles: z.array(text).min(2).max(8),
    answers: z.array(text).min(1).max(2),
    why: text,
  }),
});

export type StopDraft = z.infer<typeof stopDraft>;

/** The draft's exercises, without any the model got inconsistent (an answer out of range, a gap without its word). */
export function exercisesOf(draft: StopDraft): Exercise[] {
  const { escolhaUma, unaOsPares, verdadeiroOuFalso, completeAFrase } = draft;
  const exercises: Exercise[] = [];
  if (escolhaUma.answer >= 0 && escolhaUma.answer < escolhaUma.options.length)
    exercises.push({ kind: 'escolha_uma', ...escolhaUma });
  exercises.push({ kind: 'una_os_pares', ...unaOsPares });
  exercises.push({ kind: 'verdadeiro_ou_falso', ...verdadeiroOuFalso });
  const gaps = completeAFrase.text.split('___').length - 1;
  if (
    gaps === completeAFrase.answers.length &&
    completeAFrase.answers.every((a) => completeAFrase.tiles.includes(a))
  )
    exercises.push({ kind: 'complete_a_frase', ...completeAFrase });
  return exercises;
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
  ): Promise<StopResult> {
    const discipline = await this.paths.discipline(disciplineId);
    if (!discipline || topic >= discipline.topics.length)
      throw new NotFoundException(
        `No stop ${topic} in subject ${disciplineId}`,
      );
    return this.paths.finishStop(userId, disciplineId, topic, mistakes);
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
        schema: stopDraft,
        instructions: stopInstructions(),
        prompt: `Subject: ${name}\nTopic ${topic + 1} of ${total}: ${topicText}`,
        maxOutputTokens: 3000,
      });
      const checks = await Promise.all(
        object.cards.map((c) => quoteIsOnPage(c.source.url, c.source.quote)),
      );
      const cards: StopCard[] = object.cards.filter((_, i) => checks[i]);
      const exercises = exercisesOf(object);
      this.logger.log(
        `Stop ${id}:${topic} attempt ${attempt}: ${cards.length}/${object.cards.length} cards verified, ${exercises.length} exercises`,
      );
      if (!cards.length || exercises.length < 3) continue;
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
