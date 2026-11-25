import type {
  AskReply,
  AskRequest,
  CareerPaths,
  ExplainReply,
  ExplainRequest,
  Lesson,
  LessonResult,
  LessonResultRequest,
  StopContent,
  StopResult,
  StopResultRequest,
} from '@arandu/contracts';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { Public } from '../auth/public.decorator.js';
import { UserId } from '../auth/user-id.decorator.js';
import { CardTalkService } from './card-talk.service.js';
import { PathsRepository } from './paths.repository.js';
import { StopsService } from './stops.service.js';
import { careerNotFound, stopNotFound } from './paths.errors.js';
import { id, param, slug, topic } from '../../core/http/params.js';
import { LESSONS } from './lessons.logic.js';

const stopResult = z
  .object({
    mistakes: z.number().int().min(0).max(100),
    relampagoMistakes: z.number().int().min(0).max(100).nullable().optional(),
  })
  .strict();

const lessonIndex = z.coerce.number().int().min(1).max(LESSONS);
const lessonResult = z
  .object({
    missed: z
      .array(
        z
          .object({
            topic: z.number().int().min(0).max(200),
            index: z.number().int().min(0).max(99),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

const explainRequest = z
  .object({ answer: z.string().trim().min(1).max(1500) })
  .strict();
const askRequest = z
  .object({ question: z.string().trim().min(1).max(500) })
  .strict();

@Controller()
export class PathsController {
  constructor(
    private readonly paths: PathsRepository,
    private readonly stops: StopsService,
    private readonly talk: CardTalkService,
  ) {}

  /** O10-O11: the career's courses and their first-semester subjects, each a book of stops. */
  // Public (internal secret still required): the same for everyone, so the web server caches it without a token.
  // Not rate limited: a database read, no model call, and the server's cache misses all come from its one IP.
  @Public()
  @SkipThrottle({ burst: true, daily: true })
  @Get('careers/:slug/paths')
  async careerPaths(
    @Param('slug', param(slug, careerNotFound)) professionSlug: string,
  ): Promise<CareerPaths> {
    const paths = await this.paths.careerPaths(professionSlug);
    if (!paths) throw careerNotFound();
    return paths;
  }

  /** O14-O18 and every later stop: its cards and exercises. Only made stops inside the subject's run; else 404. */
  @Public()
  @SkipThrottle({ burst: true, daily: true })
  @Get('stops/:disciplineId/:topic')
  stop(
    @Param('disciplineId', param(id, stopNotFound)) disciplineId: number,
    @Param('topic', param(topic, stopNotFound)) topicIndex: number,
  ): Promise<StopContent> {
    return this.stops.stop(disciplineId, topicIndex);
  }

  /** O19: the stop is done. */
  @Post('stops/:disciplineId/:topic/result')
  @HttpCode(200)
  finish(
    @UserId() userId: string,
    @Param('disciplineId', param(id, stopNotFound)) disciplineId: number,
    @Param('topic', param(topic, stopNotFound)) topicIndex: number,
    @Body({ schema: stopResult }) body: StopResultRequest,
  ): Promise<StopResult> {
    return this.stops.finish(
      userId,
      disciplineId,
      topicIndex,
      body.mistakes,
      // No mistakes means nothing to review: a relâmpago result then is not a real one.
      body.mistakes > 0 ? (body.relampagoMistakes ?? null) : null,
    );
  }

  /** P1-P2 (#123): one of the chapter's four lessons, for this person. */
  @Get('stops/:disciplineId/:topic/lessons/:lesson')
  lesson(
    @UserId() userId: string,
    @Param('disciplineId', param(id, stopNotFound)) disciplineId: number,
    @Param('topic', param(topic, stopNotFound)) topicIndex: number,
    @Param('lesson', param(lessonIndex, stopNotFound)) lessonNumber: number,
  ): Promise<Lesson> {
    return this.stops.lesson(userId, disciplineId, topicIndex, lessonNumber);
  }

  /** A lesson is done; lesson 4 finishes the chapter (O19). */
  @Post('stops/:disciplineId/:topic/lessons/:lesson/result')
  @HttpCode(200)
  finishLesson(
    @UserId() userId: string,
    @Param('disciplineId', param(id, stopNotFound)) disciplineId: number,
    @Param('topic', param(topic, stopNotFound)) topicIndex: number,
    @Param('lesson', param(lessonIndex, stopNotFound)) lessonNumber: number,
    @Body({ schema: lessonResult }) body: LessonResultRequest,
  ): Promise<LessonResult> {
    return this.stops.finishLesson(
      userId,
      disciplineId,
      topicIndex,
      lessonNumber,
      body.missed,
    );
  }

  /** R12: which expected ideas the person's own explanation got. */
  @Post('stops/:disciplineId/:topic/explain')
  @HttpCode(200)
  explain(
    @Param('disciplineId', param(id, stopNotFound)) disciplineId: number,
    @Param('topic', param(topic, stopNotFound)) topicIndex: number,
    @Body({ schema: explainRequest }) body: ExplainRequest,
  ): Promise<ExplainReply> {
    return this.talk.explain(disciplineId, topicIndex, body.answer);
  }

  /** T1: a question about the stop's cards. Never during exercises: the UI only offers it on the card. */
  @Post('stops/:disciplineId/:topic/ask')
  @HttpCode(200)
  ask(
    @UserId() userId: string,
    @Param('disciplineId', param(id, stopNotFound)) disciplineId: number,
    @Param('topic', param(topic, stopNotFound)) topicIndex: number,
    @Body({ schema: askRequest }) body: AskRequest,
  ): Promise<AskReply> {
    return this.talk.ask(userId, disciplineId, topicIndex, body.question);
  }
}
