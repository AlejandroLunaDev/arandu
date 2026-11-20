import type {
  AchievementCode,
  CareerPath,
  CareerPaths,
  StopContent,
  StopResult,
} from '@arandu/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { PersonGoneError } from '../memory/memory.repository.js';
import { SQL, type Sql } from '../platform/database/database.module.js';

/** Sabedoria a finished stop gives (demo value). */
export const STOP_SABEDORIA = 15;

/** Days, patinhas and weeks are counted in Brazil's time. */
const TIME_ZONE = 'America/Sao_Paulo';

export interface Discipline {
  id: number;
  name: string;
  topics: string[];
}

interface PathRow {
  course_id: number;
  institution: string;
  course: string;
  city: string;
  shift: string | null;
  discipline_id: number;
  code: string | null;
  subject: string;
  topics: string[];
  source_label: string;
  source_url: string;
  retrieved_at: Date;
}

/** The paths a career can be lived through, their stops, and the stops each person finished. */
@Injectable()
export class PathsRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  /** Each course's first-semester subjects that have topics; null when no profession has that slug. */
  async careerPaths(slug: string): Promise<CareerPaths | null> {
    const [profession] = await this.sql<{ name: string }[]>`
      select name from public.professions where slug = ${slug}`;
    if (!profession) return null;

    // First semester: term 1, or year 1 when the source states no term (FIAP).
    const rows = await this.sql<PathRow[]>`
      select c.id::int as course_id, coalesce(i.short_name, i.name) as institution, c.name as course, c.city,
        cs.shift, d.id::int as discipline_id, d.code, d.name as subject, d.topics,
        s.label as source_label, s.url as source_url, s.last_fetched_at as retrieved_at
      from public.professions p
      join public.courses c on c.profession_id = p.id
      join public.institutions i on i.id = c.institution_id
      join public.curriculum_subjects cs on cs.course_id = c.id
      join public.disciplines d on d.id = cs.discipline_id
      join public.sources s on s.id = cs.source_id
      where p.slug = ${slug} and (cs.term = 1 or (cs.term is null and cs.year = 1)) and cardinality(d.topics) > 0
      order by institution, c.city, c.id, cs.shift, d.name`;

    const paths = new Map<string, CareerPath>();
    for (const row of rows) {
      const key = `${row.course_id} ${row.shift}`;
      let path = paths.get(key);
      if (!path) {
        path = {
          courseId: row.course_id,
          institution: row.institution,
          course: row.course,
          city: row.city,
          shift: row.shift,
          subjects: [],
          source: {
            label: row.source_label,
            url: row.source_url,
            retrievedAt: row.retrieved_at.toISOString(),
          },
        };
        paths.set(key, path);
      }
      if (!path.subjects.some((s) => s.disciplineId === row.discipline_id))
        path.subjects.push({
          disciplineId: row.discipline_id,
          code: row.code,
          name: row.subject,
          topics: row.topics,
        });
    }
    return {
      profession: { slug, name: profession.name },
      paths: [...paths.values()],
    };
  }

  async discipline(id: number): Promise<Discipline | null> {
    const [row] = await this.sql<Discipline[]>`
      select id::int, name, topics from public.disciplines where id = ${id}`;
    return row ?? null;
  }

  /** The stop's stored content, when it was made from this same topic text. */
  async stopContent(
    disciplineId: number,
    topic: number,
    topicText: string,
  ): Promise<StopContent | null> {
    const [row] = await this.sql<{ content: StopContent }[]>`
      select content from public.stop_contents
      where discipline_id = ${disciplineId} and topic = ${topic} and topic_text = ${topicText}`;
    return row?.content ?? null;
  }

  async saveStopContent(content: StopContent): Promise<void> {
    await this.sql`
      insert into public.stop_contents (discipline_id, topic, topic_text, content)
      values (${content.discipline.id}, ${content.topic.index}, ${content.topic.text}, ${this.sql.json(content as never)})
      on conflict (discipline_id, topic) do update
        set topic_text = excluded.topic_text, content = excluded.content, created_at = now()`;
  }

  /** Records a finished stop. Only the first finish counts: a replay gives nothing. */
  async finishStop(
    userId: string,
    disciplineId: number,
    topic: number,
    mistakes: number,
  ): Promise<StopResult> {
    try {
      return await this.sql.begin(async (tx) => {
        const inserted = await tx`
          insert into public.stop_results (user_id, discipline_id, topic, mistakes, sabedoria)
          values (${userId}, ${disciplineId}, ${topic}, ${mistakes}, ${STOP_SABEDORIA})
          on conflict do nothing returning 1`;
        if (!inserted.length)
          return { sabedoria: 0, patinha: false, achievements: [] };

        const [{ finished, today }] = await tx<
          { finished: number; today: number }[]
        >`
          select count(*)::int as finished,
            count(*) filter (
              where (completed_at at time zone ${TIME_ZONE})::date = (now() at time zone ${TIME_ZONE})::date
            )::int as today
          from public.stop_results where user_id = ${userId}`;
        const achievements: AchievementCode[] =
          finished === 1 ? ['primeira_parada'] : [];
        return {
          sabedoria: STOP_SABEDORIA,
          patinha: today === 1,
          achievements,
        };
      });
    } catch (error) {
      const { code, constraint_name } = error as {
        code?: string;
        constraint_name?: string;
      };
      if (code === '23503' && constraint_name === 'stop_results_user_id_fkey')
        throw new PersonGoneError();
      throw error;
    }
  }
}
