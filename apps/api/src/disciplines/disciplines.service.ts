import { AiService } from '@nestjs/ai';
import { Injectable, Logger } from '@nestjs/common';
import { EMBEDDING_MODEL } from '../platform/ai/ai.module.js';
import {
  type DisciplineMatch,
  DisciplinesRepository,
} from './disciplines.repository.js';

/** Finds first-semester subjects by what they are about: the RAG over the disciplines' real topics. */
@Injectable()
export class DisciplinesService {
  private readonly logger = new Logger(DisciplinesService.name);

  constructor(
    private readonly disciplines: DisciplinesRepository,
    private readonly ai: AiService,
  ) {}

  /** Embeds every discipline that is new or changed since its last embedding; returns how many. */
  async embedPending(): Promise<number> {
    const pending = await this.disciplines.pending(EMBEDDING_MODEL);
    if (!pending.length) return 0;
    const { embeddings } = await this.ai.embedMany({
      label: 'disciplines',
      values: pending.map((d) => d.text),
    });
    await this.disciplines.save(
      EMBEDDING_MODEL,
      pending.map((d, i) => ({ ...d, embedding: embeddings[i] })),
    );
    this.logger.log(`Embedded ${pending.length} discipline(s)`);
    return pending.length;
  }

  /** The disciplines closest in meaning to `query`. The query is embedded and never stored. */
  async search(query: string, limit = 5): Promise<DisciplineMatch[]> {
    const { embedding } = await this.ai.embed({
      label: 'disciplines-search',
      value: query,
    });
    return this.disciplines.nearest(EMBEDDING_MODEL, embedding, limit);
  }
}
