import type {
  AranduChatReply,
  AranduChatRequest,
  AranduMemory,
  ChatMessage,
  Source,
} from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CareersRepository,
  type ProfessionFirstTerm,
} from '../careers/careers.repository.js';
import { MemoryService } from '../memory/memory.service.js';
import { careerChatInstructions } from './career-chat.prompt.js';

/** The person's last 6 exchanges with Arandu: history is the main token cost. */
export const RECENT_MESSAGES = 12;

export interface ChatInput {
  professionSlug: string;
  /** The conversation so far; the last message is the person's. */
  messages: ChatMessage[];
  memory?: Pick<AranduMemory, 'profile' | 'summary'>;
}

/** Arandu inside the career the person chose, grounded on its real first-term subjects (§4.2, §6). */
@Injectable()
export class CareerChatService {
  constructor(
    private readonly ai: AiService,
    private readonly careers: CareersRepository,
    private readonly memory: MemoryService,
  ) {}

  /** Answers the person's message, in a new session without sessionId, remembering what Arandu knows of them. */
  async answer(
    userId: string,
    { professionSlug, sessionId, message }: AranduChatRequest,
  ): Promise<AranduChatReply> {
    // The career is checked before a session is opened, so a wrong slug stores nothing.
    const profession = await this.career(professionSlug);
    const history = sessionId
      ? await this.memory.history(
          userId,
          sessionId,
          'career',
          RECENT_MESSAGES - 1,
          professionSlug,
        )
      : [];
    const id =
      sessionId ??
      (await this.memory.openSession(userId, 'career', professionSlug));

    const said: ChatMessage = { role: 'user', content: message };
    const { reply, sources } = await this.reply(profession, {
      professionSlug,
      messages: [...history, said],
      memory: await this.memory.read(userId),
    });
    await this.memory.record(id, [said, { role: 'assistant', content: reply }]);
    return { sessionId: id, reply, sources };
  }

  /** Arandu's reply to the conversation so far. */
  async chat(input: ChatInput): Promise<{ reply: string; sources: Source[] }> {
    return this.reply(await this.career(input.professionSlug), input);
  }

  private async career(slug: string): Promise<ProfessionFirstTerm> {
    const profession = await this.careers.firstTerm(slug);
    if (!profession) throw new NotFoundException(`No profession "${slug}"`);
    // No curriculum means nothing real to ground on: Arandu does not talk about it rather than invent it.
    if (profession.courses.length === 0)
      throw new NotFoundException(`No curriculum yet for "${slug}"`);
    return profession;
  }

  private async reply(
    profession: ProfessionFirstTerm,
    { messages, memory }: ChatInput,
  ): Promise<{ reply: string; sources: Source[] }> {
    // The last turns only, starting on the person's message; past sessions reach Arandu through the memory's summary.
    const recent = messages.slice(-RECENT_MESSAGES);
    if (recent[0].role === 'assistant') recent.shift();

    const { text } = await this.ai.generateText({
      label: 'arandu-chat',
      instructions: careerChatInstructions(profession, memory),
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
