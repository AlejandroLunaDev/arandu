import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { SQL, type Sql } from '../platform/database/database.module.js';

/** A discipline whose stored vector is missing, from another model, or from an older name or topic list. */
export interface PendingDiscipline {
  id: string;
  /** What gets embedded: the name and the topics, in the source's order. */
  text: string;
}

/** A discipline close in meaning to what was searched. */
export interface DisciplineMatch {
  id: string;
  name: string;
  topics: string[];
  institution: string;
  /** The careers whose first semester lists this discipline. */
  careers: string[];
  /** Cosine similarity, 1 = same meaning. */
  similarity: number;
}

/** The embedded text, built in SQL: the pending check hashes it there and save() hashes the same string in Node. */
const TEXT = `d.name || ': ' || array_to_string(d.topics, '; ')`;

const md5 = (text: string) => createHash('md5').update(text).digest('hex');

/** The disciplines' vectors: what each first-semester subject is about, so it can be found by meaning. */
@Injectable()
export class DisciplinesRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  pending(model: string): Promise<PendingDiscipline[]> {
    const text = this.sql.unsafe(TEXT);
    return this.sql<PendingDiscipline[]>`
      select d.id::text as id, ${text} as text
      from public.disciplines d
      left join public.discipline_embeddings e on e.discipline_id = d.id
      where d.topics is not null
        and (e.discipline_id is null or e.model <> ${model} or e.content_hash <> md5(${text}))
      order by d.id`;
  }

  async save(
    model: string,
    rows: { id: string; text: string; embedding: number[] }[],
  ): Promise<void> {
    if (!rows.length) return;
    await this.sql`
      insert into public.discipline_embeddings ${this.sql(
        rows.map((r) => ({
          discipline_id: r.id,
          model,
          content_hash: md5(r.text),
          embedding: JSON.stringify(r.embedding),
        })),
      )}
      on conflict (discipline_id) do update set model = excluded.model, content_hash = excluded.content_hash,
        embedding = excluded.embedding, embedded_at = now()`;
  }

  nearest(
    model: string,
    embedding: number[],
    limit: number,
  ): Promise<DisciplineMatch[]> {
    const vector = JSON.stringify(embedding);
    return this.sql<DisciplineMatch[]>`
      select d.id::text as id, d.name, d.topics, coalesce(i.short_name, i.name) as institution,
        array(
          select distinct p.slug from public.curriculum_subjects cs
          join public.courses c on c.id = cs.course_id
          join public.professions p on p.id = c.profession_id
          where cs.discipline_id = d.id and (cs.term = 1 or (cs.term is null and cs.year = 1))
          order by p.slug
        ) as careers,
        1 - (e.embedding operator(extensions.<=>) ${vector}::extensions.halfvec) as similarity
      from public.discipline_embeddings e
      join public.disciplines d on d.id = e.discipline_id
      join public.institutions i on i.id = d.institution_id
      where e.model = ${model}
      order by e.embedding operator(extensions.<=>) ${vector}::extensions.halfvec
      limit ${limit}`;
  }
}
