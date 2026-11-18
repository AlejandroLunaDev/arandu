import type { AranduChatReply, AranduChatRequest } from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, type Sql } from '../database.module.js';
import { aranduInstructions } from './arandu.prompt.js';
import { findFirstTermSubjects } from './first-term-subjects.js';

/** The student's last 6 exchanges with Arandu. */
export const RECENT_MESSAGES = 12;

@Injectable()
export class AranduService {
  constructor(
    private readonly ai: AiService,
    @Inject(SQL) private readonly sql: Sql,
  ) {}

  async chat({
    professionSlug,
    messages,
  }: AranduChatRequest): Promise<AranduChatReply> {
    const profession = await findFirstTermSubjects(this.sql, professionSlug);
    if (!profession)
      throw new NotFoundException(`No profession "${professionSlug}"`);
    // No curriculum means nothing real to ground on: Arandu does not talk about it rather than invent it.
    if (profession.courses.length === 0)
      throw new NotFoundException(`No curriculum yet for "${professionSlug}"`);

    // History is the main token cost: send the last turns only, starting on a student's message.
    // shortcut: older turns are dropped, not summarized; summarize them once conversations get long.
    const recent = messages.slice(-RECENT_MESSAGES);
    if (recent[0].role === 'assistant') recent.shift();

    const { text } = await this.ai.generateText({
      label: 'arandu-chat',
      instructions: aranduInstructions(profession),
      messages: recent,
    });
    const sources = [
      ...new Map(
        profession.courses.map((c) => [c.source.url, c.source]),
      ).values(),
    ];
    return { reply: text, sources };
  }
}
