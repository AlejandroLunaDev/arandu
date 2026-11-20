import type {
  AskReply,
  AskRequest,
  CareerPaths,
  ExplainReply,
  ExplainRequest,
  StopContent,
  StopResult,
  StopResultRequest,
} from '@arandu/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { CardTalkService } from './card-talk.service.js';
import { PathsRepository } from './paths.repository.js';
import { StopsService } from './stops.service.js';

const slug = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const id = z.coerce.number().int().positive().max(2_147_483_647);
const topic = z.coerce.number().int().min(0).max(200);
const stopResult = z
  .object({
    mistakes: z.number().int().min(0).max(100),
    relampagoMistakes: z.number().int().min(0).max(100).nullable().optional(),
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
  @Get('careers/:slug/paths')
  async careerPaths(
    @Param('slug', { schema: slug }) professionSlug: string,
  ): Promise<CareerPaths> {
    const paths = await this.paths.careerPaths(professionSlug);
    if (!paths) throw new NotFoundException(`No career "${professionSlug}"`);
    return paths;
  }

  /** O14-O18 and every later stop: its cards and exercises. The first visit takes a while: it is made then. */
  @Get('stops/:disciplineId/:topic')
  stop(
    @Param('disciplineId', { schema: id }) disciplineId: number,
    @Param('topic', { schema: topic }) topicIndex: number,
  ): Promise<StopContent> {
    return this.stops.stop(disciplineId, topicIndex);
  }

  /** O19: the stop is done. */
  @Post('stops/:disciplineId/:topic/result')
  @HttpCode(200)
  finish(
    @UserId() userId: string,
    @Param('disciplineId', { schema: id }) disciplineId: number,
    @Param('topic', { schema: topic }) topicIndex: number,
    @Body({ schema: stopResult }) body: StopResultRequest,
  ): Promise<StopResult> {
    return this.stops.finish(
      userId,
      disciplineId,
      topicIndex,
      body.mistakes,
      body.relampagoMistakes ?? null,
    );
  }

  /** R12: which expected ideas the person's own explanation got. */
  @Post('stops/:disciplineId/:topic/explain')
  @HttpCode(200)
  explain(
    @Param('disciplineId', { schema: id }) disciplineId: number,
    @Param('topic', { schema: topic }) topicIndex: number,
    @Body({ schema: explainRequest }) body: ExplainRequest,
  ): Promise<ExplainReply> {
    return this.talk.explain(disciplineId, topicIndex, body.answer);
  }

  /** T1: a question about the stop's cards. Never during exercises: the UI only offers it on the card. */
  @Post('stops/:disciplineId/:topic/ask')
  @HttpCode(200)
  ask(
    @UserId() userId: string,
    @Param('disciplineId', { schema: id }) disciplineId: number,
    @Param('topic', { schema: topic }) topicIndex: number,
    @Body({ schema: askRequest }) body: AskRequest,
  ): Promise<AskReply> {
    return this.talk.ask(userId, disciplineId, topicIndex, body.question);
  }
}
