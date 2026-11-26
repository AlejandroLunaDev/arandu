import type {
  AskReply,
  AskRequest,
  CareerPaths,
  ExplainReply,
  ExplainRequest,
  Lesson,
  LessonResult,
  LessonResultRequest,
  ChapterContent,
  ChapterResult,
  ChapterResultRequest,
  Wallet,
} from '@arandu/contracts';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { Public } from '../auth/public.decorator.js';
import { UserId } from '../auth/user-id.decorator.js';
import { CardTalkService } from './card-talk.service.js';
import { PathsRepository } from './paths.repository.js';
import { ChaptersService } from './chapters.service.js';
import { careerNotFound, chapterNotFound } from './paths.errors.js';
import { id, param, slug, topic } from '../../core/http/params.js';
import { LESSONS } from './lessons.logic.js';

const chapterResult = z
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
    private readonly chapters: ChaptersService,
    private readonly talk: CardTalkService,
  ) {}

  /** O10-O11: the career's courses and their first-semester subjects, each a book of chapters. */
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

  /** O14-O18 and every later chapter: its cards and exercises. Only made chapters inside the subject's run; else 404. */
  @Public()
  @SkipThrottle({ burst: true, daily: true })
  @Get('chapters/:disciplineId/:topic')
  chapter(
    @Param('disciplineId', param(id, chapterNotFound)) disciplineId: number,
    @Param('topic', param(topic, chapterNotFound)) topicIndex: number,
  ): Promise<ChapterContent> {
    return this.chapters.chapter(disciplineId, topicIndex);
  }

  /** O19: the chapter is done. */
  @Post('chapters/:disciplineId/:topic/result')
  @HttpCode(200)
  finish(
    @UserId() userId: string,
    @Param('disciplineId', param(id, chapterNotFound)) disciplineId: number,
    @Param('topic', param(topic, chapterNotFound)) topicIndex: number,
    @Body({ schema: chapterResult }) body: ChapterResultRequest,
  ): Promise<ChapterResult> {
    return this.chapters.finish(
      userId,
      disciplineId,
      topicIndex,
      body.mistakes,
      // No mistakes means nothing to review: a relâmpago result then is not a real one.
      body.mistakes > 0 ? (body.relampagoMistakes ?? null) : null,
    );
  }

  /** P1-P2 (#123, #145): enters one of the chapter's three lessons, for this person, paying its peixinhos. */
  @Post('chapters/:disciplineId/:topic/lessons/:lesson/start')
  @HttpCode(200)
  start(
    @UserId() userId: string,
    @Param('disciplineId', param(id, chapterNotFound)) disciplineId: number,
    @Param('topic', param(topic, chapterNotFound)) topicIndex: number,
    @Param('lesson', param(lessonIndex, chapterNotFound)) lessonNumber: number,
  ): Promise<Lesson> {
    return this.chapters.start(userId, disciplineId, topicIndex, lessonNumber);
  }

  /** The lesson's last life is gone: going on costs the currency. */
  @Post('chapters/:disciplineId/:topic/lessons/:lesson/continue')
  @HttpCode(200)
  continue(
    @UserId() userId: string,
    @Param('disciplineId', param(id, chapterNotFound)) disciplineId: number,
    @Param('topic', param(topic, chapterNotFound)) topicIndex: number,
    @Param('lesson', param(lessonIndex, chapterNotFound)) lessonNumber: number,
  ): Promise<Wallet> {
    return this.chapters.continue(
      userId,
      disciplineId,
      topicIndex,
      lessonNumber,
    );
  }

  /** The lesson's last life is gone: one stored extra life gives 1 life back. */
  @Post('chapters/:disciplineId/:topic/lessons/:lesson/extra-life')
  @HttpCode(200)
  extraLife(
    @UserId() userId: string,
    @Param('disciplineId', param(id, chapterNotFound)) disciplineId: number,
    @Param('topic', param(topic, chapterNotFound)) topicIndex: number,
    @Param('lesson', param(lessonIndex, chapterNotFound)) lessonNumber: number,
  ): Promise<Wallet> {
    return this.chapters.extraLife(
      userId,
      disciplineId,
      topicIndex,
      lessonNumber,
    );
  }

  /** A lesson is done; lesson 3 finishes the chapter (O19). */
  @Post('chapters/:disciplineId/:topic/lessons/:lesson/result')
  @HttpCode(200)
  finishLesson(
    @UserId() userId: string,
    @Param('disciplineId', param(id, chapterNotFound)) disciplineId: number,
    @Param('topic', param(topic, chapterNotFound)) topicIndex: number,
    @Param('lesson', param(lessonIndex, chapterNotFound)) lessonNumber: number,
    @Body({ schema: lessonResult }) body: LessonResultRequest,
  ): Promise<LessonResult> {
    return this.chapters.finishLesson(
      userId,
      disciplineId,
      topicIndex,
      lessonNumber,
      body.missed,
    );
  }

  /** R12: which expected ideas the person's own explanation got. */
  @Post('chapters/:disciplineId/:topic/explain')
  @HttpCode(200)
  explain(
    @Param('disciplineId', param(id, chapterNotFound)) disciplineId: number,
    @Param('topic', param(topic, chapterNotFound)) topicIndex: number,
    @Body({ schema: explainRequest }) body: ExplainRequest,
  ): Promise<ExplainReply> {
    return this.talk.explain(disciplineId, topicIndex, body.answer);
  }

  /** T1: a question about the chapter's cards. Never during exercises: the UI only offers it on the card. */
  @Post('chapters/:disciplineId/:topic/ask')
  @HttpCode(200)
  ask(
    @UserId() userId: string,
    @Param('disciplineId', param(id, chapterNotFound)) disciplineId: number,
    @Param('topic', param(topic, chapterNotFound)) topicIndex: number,
    @Body({ schema: askRequest }) body: AskRequest,
  ): Promise<AskReply> {
    return this.talk.ask(userId, disciplineId, topicIndex, body.question);
  }
}
