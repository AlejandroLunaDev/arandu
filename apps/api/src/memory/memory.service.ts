import type {
  AranduMemory,
  AranduProfile,
  ChatMessage,
} from '@arandu/contracts';
import { AiService } from '@nestjs/ai';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { summaryInstructions } from './memory.prompt.js';
import {
  MemoryRepository,
  type SessionKind,
  SUMMARY_MAX,
} from './memory.repository.js';

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
    const { sessionIds, transcript } = await this.memory.unsummarized(userId);
    if (sessionIds.length) {
      const { summary } = await this.memory.read(userId);
      const { text } = await this.ai.generateText({
        label: 'arandu-memory',
        instructions: summaryInstructions(SUMMARY_MAX),
        prompt: `Current note:\n${summary || '(empty)'}\n\nNew sessions:\n${transcript.slice(-TRANSCRIPT_MAX)}`,
        maxOutputTokens: 600,
      });
      await this.memory.saveSummary(userId, text.trim(), sessionIds);
      this.logger.log(
        `Folded ${sessionIds.length} session(s) into the summary of user ${userId}`,
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
