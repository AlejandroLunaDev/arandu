import type {
  AranduProfile,
  ChatMessage,
  OnboardingAnswer,
  OnboardingReply,
  OnboardingRequest,
} from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { MemoryService } from '../memory/memory.service.js';
import { profileSchema, TOPICS } from '../memory/profile.schema.js';
import { onboardingInstructions } from './onboarding.prompt.js';
import { profileReadingInstructions } from './profile-reading.prompt.js';

// The profile comes first, so the model takes stock of what it knows before it writes the next question.
const onboardingTurn = z.object({
  profile: profileSchema,
  reply: z.string(),
  quickReplies: z.array(z.string()),
});

/** A cap on the onboarding: after this many answers it ends even with a topic left, so it never loops. */
const MAX_ANSWERS = 10;

/** The messages a turn reads: the whole onboarding fits (10 answers, 21 messages), and a session kept going past it does not grow the prompt. */
const HISTORY_MAX = 30;

export type OnboardingTurn = Omit<OnboardingReply, 'sessionId'>;

/** The onboarding (§4.1, S1): Arandu's vocational questions, one at a time, building the person's profile. */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly ai: AiService,
    private readonly memory: MemoryService,
  ) {}

  /** Starts a session, Arandu speaking first, or answers the person's next message in it. */
  async answer(
    userId: string,
    request: OnboardingRequest,
  ): Promise<OnboardingReply> {
    if (!('sessionId' in request)) {
      const sessionId = await this.memory.openSession(userId, 'onboarding');
      const turn = await this.turn([]);
      await this.memory.record(sessionId, [
        { role: 'assistant', content: turn.reply },
      ]);
      return { sessionId, ...turn };
    }

    const { sessionId, message } = request;
    const history = await this.memory.history(
      userId,
      sessionId,
      'onboarding',
      HISTORY_MAX,
    );
    const said: ChatMessage = { role: 'user', content: message };
    const turn = await this.turn([...history, said]);
    await this.memory.record(sessionId, [
      said,
      { role: 'assistant', content: turn.reply },
    ]);
    return { sessionId, ...turn };
  }

  /** O09: Arandu's reading of the person from their tapped and written answers (O02-O08). */
  async read(answers: OnboardingAnswer[]): Promise<AranduProfile> {
    const { object } = await this.ai.generateObject({
      label: 'arandu-profile-reading',
      schema: profileSchema,
      instructions: profileReadingInstructions(),
      prompt: `The answers:\n${JSON.stringify(answers, null, 2)}`,
      maxOutputTokens: 600,
    });
    // Covered is what they answered, whatever the model says.
    return { ...object, covered: answers.map((a) => a.topic) };
  }

  /** Arandu's next turn for the conversation so far; empty to start it. */
  async turn(messages: ChatMessage[]): Promise<OnboardingTurn> {
    const { object } = await this.ai.generateObject({
      label: 'arandu-onboarding',
      schema: onboardingTurn,
      instructions: onboardingInstructions(),
      ...(messages.length ? { messages } : { prompt: 'Start the onboarding.' }),
      maxOutputTokens: 700,
    });
    const covered = [...new Set(object.profile.covered)];
    const answers = messages.filter((m) => m.role === 'user').length;
    const done = covered.length === TOPICS.length || answers >= MAX_ANSWERS;
    return {
      reply: object.reply,
      quickReplies: done ? [] : object.quickReplies.slice(0, 5),
      profile: { ...object.profile, covered },
      progress: { answered: covered.length, total: TOPICS.length },
      done,
    };
  }
}
