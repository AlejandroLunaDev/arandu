import type {
  AranduChatReply,
  AranduChatRequest,
  AranduMemory,
  ChatMessage,
  Source,
} from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  CareersRepository,
  type ProfessionFirstTerm,
} from '../careers/careers.repository.js';
import {
  blocksMessage,
  isAbusive,
  SAFE_REPLY,
} from '../arandu/arandu.safety.js';
import { MemoryService } from '../memory/memory.service.js';
import {
  ProgressRepository,
  type Studied,
} from '../progress/progress.repository.js';
import { RecommendationsService } from '../recommendations/recommendations.service.js';
import {
  careerChatInstructions,
  choosingInstructions,
} from './career-chat.prompt.js';
import {
  curriculumNotFound,
  professionNotFound,
} from './career-chat.errors.js';

/** The person's last 6 exchanges with Arandu: history is the main token cost. */
export const RECENT_MESSAGES = 12;

export interface ChatInput {
  professionSlug: string;
  /** The conversation so far; the last message is the person's. */
  messages: ChatMessage[];
  memory?: Pick<AranduMemory, 'profile' | 'summary'>;
  /** The subjects the person already studied in the app. */
  studied?: Studied[];
}

/** Arandu inside the career the person chose, grounded on its real first-term subjects (§4.2, §6). */
@Injectable()
export class CareerChatService {
  constructor(
    private readonly ai: AiService,
    private readonly careers: CareersRepository,
    private readonly memory: MemoryService,
    private readonly progress: ProgressRepository,
    private readonly recommendations: RecommendationsService,
  ) {}

  /** Answers the person's message, in a new session without sessionId, remembering what Arandu knows of them. */
  async answer(
    userId: string,
    request: AranduChatRequest,
  ): Promise<AranduChatReply> {
    if ('professionSlugs' in request) return this.choose(userId, request);
    const { professionSlug, sessionId, message } = request;
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
    // After history, which checks the session is theirs; nothing is recorded.
    if (blocksMessage(message))
      return {
        sessionId: id,
        reply: SAFE_REPLY,
        sources: [],
        professionSlug,
        chosenCourseId: null,
      };

    const said: ChatMessage = { role: 'user', content: message };
    const { reply, sources } = await this.reply(profession, {
      professionSlug,
      messages: [...history, said],
      memory: await this.memory.read(userId),
      studied: await this.progress.studied(userId),
    });
    await this.memory.record(id, [said, { role: 'assistant', content: reply }]);
    return {
      sessionId: id,
      reply,
      sources,
      professionSlug,
      chosenCourseId: null,
    };
  }

  /** O10: Arandu among the recommended careers, answering about the one the person names or points to. */
  private async choose(
    userId: string,
    {
      professionSlugs,
      sessionId,
      message,
      choices = [],
    }: Extract<AranduChatRequest, { professionSlugs: string[] }>,
  ): Promise<AranduChatReply> {
    // Every career is checked before a session is opened, so a wrong slug stores nothing.
    const professions = await Promise.all(
      professionSlugs.map(async (slug) => ({
        slug,
        profession: await this.career(slug),
      })),
    );
    const history = sessionId
      ? await this.memory.history(
          userId,
          sessionId,
          'choosing',
          RECENT_MESSAGES - 1,
        )
      : [];
    const id = sessionId ?? (await this.memory.openSession(userId, 'choosing'));
    if (blocksMessage(message))
      return {
        sessionId: id,
        reply: SAFE_REPLY,
        sources: [],
        professionSlug: null,
        chosenCourseId: null,
      };

    const said: ChatMessage = { role: 'user', content: message };
    const memory = await this.memory.read(userId);
    const { object } = await this.ai.generateObject({
      label: 'arandu-choosing',
      // The career and the choice come first, so the model decides what it talks about before it writes.
      schema: z.object({
        professionSlug: z
          .enum(professionSlugs as [string, ...string[]])
          .nullable(),
        chosenCourseId: z.number().int().nullable(),
        moreCareers: z.boolean(),
        reply: z.string().min(1),
      }),
      instructions: choosingInstructions(
        professions,
        memory,
        choices,
        await this.progress.studied(userId),
      ),
      messages: recent([...history, said]),
    });
    const safe = !isAbusive(object.reply);
    const reply = safe ? object.reply : SAFE_REPLY;
    await this.memory.record(id, [said, { role: 'assistant', content: reply }]);
    // Other careers than the ones on screen, from the profile and what the person said here about them.
    if (safe && object.moreCareers && memory.profile) {
      const recommendations = await this.recommendations.recommend(
        memory.profile,
        {
          seen: professionSlugs,
          said: [...history, said]
            .filter((m) => m.role === 'user')
            .map((m) => m.content),
        },
      );
      return {
        sessionId: id,
        reply,
        sources: [],
        professionSlug: null,
        chosenCourseId: null,
        recommendations,
      };
    }
    const about = professions.find((p) => p.slug === object.professionSlug);
    return {
      sessionId: id,
      reply,
      sources: about ? sourcesOf(about.profession) : [],
      professionSlug: about ? about.slug : null,
      // The model's pick is trusted only when it is one of the courses on screen, and its reply confirms it.
      chosenCourseId:
        safe && choices.some((c) => c.courseId === object.chosenCourseId)
          ? object.chosenCourseId
          : null,
    };
  }

  /** Arandu's reply to the conversation so far. */
  async chat(input: ChatInput): Promise<{ reply: string; sources: Source[] }> {
    return this.reply(await this.career(input.professionSlug), input);
  }

  private async career(slug: string): Promise<ProfessionFirstTerm> {
    const profession = await this.careers.firstTerm(slug);
    if (!profession) throw professionNotFound();
    // No curriculum means nothing real to ground on: Arandu does not talk about it rather than invent it.
    if (profession.courses.length === 0) throw curriculumNotFound();
    return profession;
  }

  private async reply(
    profession: ProfessionFirstTerm,
    { messages, memory, studied }: ChatInput,
  ): Promise<{ reply: string; sources: Source[] }> {
    const { text } = await this.ai.generateText({
      label: 'arandu-chat',
      instructions: careerChatInstructions(profession, memory, studied),
      messages: recent(messages),
    });
    return {
      reply: isAbusive(text) ? SAFE_REPLY : text,
      sources: sourcesOf(profession),
    };
  }
}

/** The last turns only, starting on the person's message; past sessions reach Arandu through the memory's summary. */
function recent(messages: ChatMessage[]): ChatMessage[] {
  const last = messages.slice(-RECENT_MESSAGES);
  if (last[0]?.role === 'assistant') last.shift();
  return last;
}

function sourcesOf(profession: ProfessionFirstTerm): Source[] {
  return [
    ...new Map(
      profession.courses.map((c) => [c.source.url, c.source]),
    ).values(),
  ];
}
