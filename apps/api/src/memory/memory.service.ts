import type {
  AranduMemory,
  AranduProfile,
  ChatMessage,
} from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { summaryInstructions } from './memory.prompt.js';
import {
  MemoryRepository,
  type SessionKind,
  SUMMARY_MAX,
} from './memory.repository.js';

const factList = z.object({
  facts: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(300),
        source: z.enum(['onboarding', 'stop', 'conversation']),
      }),
    )
    .max(15),
});

/** The newest part of the unsummarized transcript the summary reads; older text is already in the note. */
const TRANSCRIPT_MAX = 12_000;

/** What Arandu remembers about each signed-in person, within a limit, and the person's right to make it forget. */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly memory: MemoryRepository,
    private readonly ai: AiService,
  ) {}

  read(userId: string): Promise<AranduMemory> {
    return this.memory.read(userId);
  }

  /** Deletes one fact; 404 when it is not this person's. */
  async deleteFact(userId: string, id: number): Promise<void> {
    if (!(await this.memory.deleteFact(userId, id)))
      throw new NotFoundException(`No fact ${id}`);
  }

  forget(userId: string): Promise<void> {
    this.logger.log(`Forgetting user ${userId}`);
    return this.memory.forget(userId);
  }

  saveProfile(userId: string, profile: AranduProfile): Promise<void> {
    return this.memory.saveProfile(userId, profile);
  }

  /**
   * Opens a session. The person's earlier sessions are folded into the summary first, so Arandu remembers them.
   * shortcut: the summary runs on the request that opens the session (a couple of seconds); queue it if that shows.
   */
  async openSession(
    userId: string,
    kind: SessionKind,
    professionSlug: string | null = null,
  ): Promise<string> {
    const { sessionIds, questionIds, transcript } =
      await this.memory.unsummarized(userId);
    if (sessionIds.length || questionIds.length) {
      const current = await this.memory.facts(userId);
      const { object } = await this.ai.generateObject({
        label: 'arandu-memory',
        schema: factList,
        instructions: summaryInstructions(SUMMARY_MAX),
        prompt: `Current facts:\n${JSON.stringify(current.map(({ text, source }) => ({ text, source })))}\n\nNew sessions:\n${transcript.slice(-TRANSCRIPT_MAX)}`,
        maxOutputTokens: 900,
      });
      const saved = await this.memory.saveFacts(
        userId,
        current.map((f) => f.id),
        object.facts,
        sessionIds,
        questionIds,
      );
      if (saved)
        this.logger.log(
          `Folded ${sessionIds.length} session(s) into the facts of user ${userId}`,
        );
    }
    return this.memory.createSession(userId, kind, professionSlug);
  }

  /** The session's last `limit` messages; 404 when it is not this person's session of this kind and career. */
  async history(
    userId: string,
    sessionId: string,
    kind: SessionKind,
    limit: number,
    professionSlug: string | null = null,
  ): Promise<ChatMessage[]> {
    const messages = await this.memory.sessionMessages(
      userId,
      sessionId,
      kind,
      limit,
      professionSlug,
    );
    if (!messages) throw new NotFoundException(`No session "${sessionId}"`);
    return messages;
  }

  record(sessionId: string, messages: ChatMessage[]): Promise<void> {
    return this.memory.addMessages(sessionId, messages);
  }
}
