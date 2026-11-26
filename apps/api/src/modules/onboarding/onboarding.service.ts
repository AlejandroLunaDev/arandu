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
import {
  blocksMessage,
  isAbusive,
  SAFE_LEAD,
  SAFE_REPLY,
} from '../arandu/arandu.safety.js';
import { MemoryService } from '../memory/memory.service.js';
import {
  boundProfile,
  profileSchema,
  TOPICS,
} from '../memory/profile.schema.js';
import { onboardingInstructions } from './onboarding.prompt.js';
import { profileReadingInstructions } from './profile-reading.prompt.js';

// The profile comes first, so the model takes stock of what it knows before it writes the next question.
const onboardingTurn = z.object({
  profile: profileSchema,
  reply: z.string(),
});

const EMPTY_PROFILE: AranduProfile = {
  situation: null,
  likedSubjects: [],
  hardSubjects: [],
  interests: [],
  workStyle: [],
  admired: [],
  careerIdea: null,
  covered: [],
};

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
      await this.memory.recordTurn(
        sessionId,
        [{ role: 'assistant', content: turn.reply }],
        turn.profile.covered,
      );
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
    const before = await this.memory.covered(sessionId);
    // Nothing is recorded, so the next turn rebuilds the full profile from the history as if this one never happened.
    // Arandu asks the step's question again.
    if (blocksMessage(message)) {
      // The last real question: a stored safe line is skipped, so it never repeats itself.
      const asked = history.findLast(
        (m) => m.role === 'assistant' && !m.content.startsWith(SAFE_LEAD),
      )?.content;
      return {
        sessionId,
        reply: asked ? `${SAFE_LEAD} ${asked}` : SAFE_REPLY,
        profile: { ...boundProfile(EMPTY_PROFILE), covered: before },
        progress: { answered: before.length, total: TOPICS.length },
        done: false,
      };
    }
    const turn = await this.turn([...history, said], before);
    await this.memory.recordTurn(
      sessionId,
      [said, { role: 'assistant', content: turn.reply }],
      turn.profile.covered,
    );
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
    return boundProfile({ ...object, covered: answers.map((a) => a.topic) });
  }

  /** Arandu's next turn for the conversation so far (empty to start it), given the topics already covered before it. */
  async turn(
    messages: ChatMessage[],
    before: AranduProfile['covered'] = [],
  ): Promise<OnboardingTurn> {
    const { object } = await this.ai.generateObject({
      label: 'arandu-onboarding',
      schema: onboardingTurn,
      instructions: onboardingInstructions(before),
      ...(messages.length ? { messages } : { prompt: 'Start the onboarding.' }),
      maxOutputTokens: 700,
    });
    const read = boundProfile(object.profile);
    // Covered only grows: the model rebuilds it every turn and can drop a topic already answered.
    const covered = TOPICS.filter(
      (t) => before.includes(t) || read.covered.includes(t),
    );
    const profile = { ...read, covered };
    const answers = messages.filter((m) => m.role === 'user').length;
    const done = covered.length === TOPICS.length || answers >= MAX_ANSWERS;
    return {
      reply: isAbusive(object.reply) ? SAFE_REPLY : object.reply,
      profile,
      progress: { answered: covered.length, total: TOPICS.length },
      done,
    };
  }
}
