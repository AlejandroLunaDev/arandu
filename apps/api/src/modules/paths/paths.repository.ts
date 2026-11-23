import type {
  CareerPath,
  CareerPaths,
  LessonResult,
  StopCard,
  StopContent,
  StopResult,
} from '@arandu/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { PersonGoneError } from '../memory/memory.repository.js';
import { SQL, type Sql } from '../../core/database/database.module.js';

/** Sabedoria a stop finished in one pass gives (demo value); in lessons it comes LESSON_SABEDORIA at a time. */
export const STOP_SABEDORIA = 15;

/** Peixinhos a finished stop or chapter gives (demo value). */
export const STOP_PEIXINHOS = 10;

import {
  asPerson,
  madeStops,
  sabedoriaRows,
  TIME_ZONE,
} from '../progress/progress.repository.js';
import { one } from '../../core/database/one.js';
import {
  type ExerciseRef,
  LESSON_SABEDORIA,
  LESSONS,
} from './lessons.logic.js';
import { lessonLocked } from './paths.errors.js';

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

  /** Each course's first-semester subjects with their made stops; null when no profession has that slug. */
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
        and s.last_fetched_at is not null
      order by institution, c.city, c.id, cs.shift, d.name`;

    // A subject lists only its leading stops that are already made, so opening one never waits on a live generation;
    // a subject with none, and a path with no such subject, are left out.
    const ids = [...new Set(rows.map((r) => r.discipline_id))];
    const made = new Set(
      ids.length
        ? (
            await this.sql<{ d: number; t: number; text: string }[]>`
              select discipline_id::int as d, topic::int as t, topic_text as text
              from public.stop_contents where discipline_id in ${this.sql(ids)}`
          ).map((s) => `${s.d}:${s.t}:${s.text}`)
        : [],
    );
    const ready = (row: PathRow) => {
      const gap = row.topics.findIndex(
        (text, t) => !made.has(`${row.discipline_id}:${t}:${text}`),
      );
      return gap < 0 ? row.topics : row.topics.slice(0, gap);
    };

    const paths = new Map<string, CareerPath>();
    for (const row of rows) {
      const topics = ready(row);
      if (!topics.length) continue;
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
          topics,
        });
    }
    return {
      profession: { slug, name: profession.name },
      paths: [...paths.values()],
    };
  }

  /** How many leading stops of the subject are made: the run people can open and finish (0 for no subject). */
  async madeCount(disciplineId: number): Promise<number> {
    const [row] = await this.sql<{ n: number }[]>`
      select ${madeStops(this.sql)} as n from public.disciplines d where d.id = ${disciplineId}`;
    return row?.n ?? 0;
  }

  async discipline(id: number): Promise<Discipline | null> {
    const [row] = await this.sql<Discipline[]>`
      select id::int, name, coalesce(topics, '{}') as topics from public.disciplines where id = ${id}`;
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

  /** The subject's stored cards by topic, those made from the same topic text. */
  async stopCards(
    disciplineId: number,
    topics: string[],
  ): Promise<Map<number, StopCard[]>> {
    const rows = await this.sql<
      { topic: number; topic_text: string; cards: StopCard[] }[]
    >`
      select topic::int, topic_text, cards from public.stop_cards where discipline_id = ${disciplineId}`;
    return new Map(
      rows
        .filter((r) => topics[r.topic] === r.topic_text)
        .map((r) => [r.topic, r.cards]),
    );
  }

  async saveStopCards(
    disciplineId: number,
    entries: { topic: number; topicText: string; cards: StopCard[] }[],
  ): Promise<void> {
    for (const e of entries)
      await this.sql`
        insert into public.stop_cards (discipline_id, topic, topic_text, cards)
        values (${disciplineId}, ${e.topic}, ${e.topicText}, ${this.sql.json(e.cards as never)})
        on conflict (discipline_id, topic) do update
          set topic_text = excluded.topic_text, cards = excluded.cards, created_at = now()`;
  }

  async saveStopContent(content: StopContent): Promise<void> {
    await this.sql`
      insert into public.stop_contents (discipline_id, topic, topic_text, content)
      values (${content.discipline.id}, ${content.topic.index}, ${content.topic.text}, ${this.sql.json(content as never)})
      on conflict (discipline_id, topic) do update
        set topic_text = excluded.topic_text, content = excluded.content, created_at = now()`;
  }

  /** T1: a question about a stop's cards and Arandu's answer, kept for "Suas conversas". */
  async saveQuestion(
    userId: string,
    disciplineId: number,
    topic: number,
    question: string,
    answer: string,
  ): Promise<void> {
    try {
      await this.sql`
        insert into public.stop_questions (user_id, discipline_id, topic, question, answer)
        values (${userId}, ${disciplineId}, ${topic}, ${question}, ${answer.slice(0, 4000)})`;
    } catch (error) {
      const { code, constraint_name } = error as {
        code?: string;
        constraint_name?: string;
      };
      if (code === '23503' && constraint_name === 'stop_questions_user_id_fkey')
        throw new PersonGoneError();
      throw error;
    }
  }

  /** The person's finished lessons of a chapter, in order, with what they missed. */
  async lessons(
    userId: string,
    disciplineId: number,
    topic: number,
  ): Promise<{ lesson: number; missed: ExerciseRef[] }[]> {
    return this.sql<{ lesson: number; missed: ExerciseRef[] }[]>`
      select lesson, missed from public.lesson_results
      where user_id = ${userId} and discipline_id = ${disciplineId} and topic = ${topic} order by lesson`;
  }

  /** Whether the person finished the chapter, in lessons or in one pass. */
  async chapterFinished(
    userId: string,
    disciplineId: number,
    topic: number,
  ): Promise<boolean> {
    const [row] = await this.sql`
      select 1 from public.stop_results
      where user_id = ${userId} and discipline_id = ${disciplineId} and topic = ${topic}`;
    return row !== undefined;
  }

  /** What the person missed in lessons 1-3 of the subject's other chapters, newest first. */
  async missedElsewhere(
    userId: string,
    disciplineId: number,
    topic: number,
  ): Promise<ExerciseRef[]> {
    const rows = await this.sql<{ missed: ExerciseRef[] }[]>`
      select missed from public.lesson_results
      where user_id = ${userId} and discipline_id = ${disciplineId} and topic <> ${topic} and lesson < ${LESSONS}
        and jsonb_array_length(missed) > 0
      order by completed_at desc limit 20`;
    return rows.flatMap((r) => r.missed);
  }

  /**
   * Records a finished lesson, in order: 409 `lesson_locked` while an earlier one is not done (none once the chapter
   * was finished the old way). The first finish gives LESSON_SABEDORIA, none once the chapter is finished; lesson 4
   * also finishes the chapter, with its peixinhos. The patinha is the day's first lesson or stop. Achievements are added
   * by the caller.
   */
  async finishLesson(
    userId: string,
    disciplineId: number,
    topic: number,
    lesson: number,
    missed: ExerciseRef[],
  ): Promise<Omit<LessonResult, 'achievements'>> {
    return asPerson(
      this.sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${userId}))`;
        const { done, finished, studied } = one(
          await tx<{ done: number; finished: boolean; studied: boolean }[]>`
          select
            (select count(*)::int from public.lesson_results
              where user_id = ${userId} and discipline_id = ${disciplineId} and topic = ${topic}) as done,
            exists (select 1 from public.stop_results
              where user_id = ${userId} and discipline_id = ${disciplineId} and topic = ${topic}) as finished,
            exists (select 1 from ${sabedoriaRows(tx)} s
              where s.user_id = ${userId}
                and (s.completed_at at time zone ${TIME_ZONE})::date = (now() at time zone ${TIME_ZONE})::date) as studied`,
        );
        if (!finished && lesson > done + 1) throw lessonLocked();
        // A chapter already finished (in one pass or in lessons) gave its sabedoria: its lessons are practice.
        const sabedoria = finished ? 0 : LESSON_SABEDORIA;
        const inserted = await tx`
          insert into public.lesson_results (user_id, discipline_id, topic, lesson, missed, sabedoria)
          values (${userId}, ${disciplineId}, ${topic}, ${lesson}, ${tx.json(missed as never)}, ${sabedoria})
          on conflict do nothing returning 1`;
        if (!inserted.length)
          return {
            sabedoria: 0,
            peixinhos: 0,
            patinha: false,
            chapterDone: lesson === LESSONS,
          };

        let peixinhos = 0;
        if (lesson === LESSONS) {
          // The chapter's mistakes are the distinct exercises missed in lessons 1-3; the review plays the relâmpago.
          const { mistakes } = one(
            await tx<{ mistakes: number }[]>`
            select count(distinct m.value)::int as mistakes from public.lesson_results r, jsonb_array_elements(r.missed) m
            where r.user_id = ${userId} and r.discipline_id = ${disciplineId} and r.topic = ${topic}
              and r.lesson < ${LESSONS}`,
          );
          const relampago = mistakes > 0 ? Math.min(missed.length, 100) : null;
          const chapter = await tx`
            insert into public.stop_results (user_id, discipline_id, topic, mistakes, relampago_mistakes, sabedoria)
            values (${userId}, ${disciplineId}, ${topic}, ${Math.min(mistakes, 100)}, ${relampago}, 0)
            on conflict do nothing returning 1`;
          if (chapter.length) {
            await tx`insert into public.wallets (user_id) values (${userId}) on conflict do nothing`;
            await tx`
              update public.wallets set peixinhos = peixinhos + ${STOP_PEIXINHOS}, updated_at = now()
              where user_id = ${userId}`;
            peixinhos = STOP_PEIXINHOS;
          }
        }
        return {
          sabedoria,
          peixinhos,
          patinha: !studied,
          chapterDone: lesson === LESSONS,
        };
      }),
    );
  }

  /** Records a finished stop. Only the first finish counts: a replay gives nothing. Achievements are added by the caller. */
  async finishStop(
    userId: string,
    disciplineId: number,
    topic: number,
    mistakes: number,
    relampagoMistakes: number | null = null,
  ): Promise<Omit<StopResult, 'achievements'>> {
    try {
      return await this.sql.begin(async (tx) => {
        // One finish at a time per person, so two at once cannot both be "the first" of the day.
        await tx`select pg_advisory_xact_lock(hashtext(${userId}))`;
        // Lessons of this chapter done first already gave part of its sabedoria.
        const { earned } = one(
          await tx<{ earned: number }[]>`
          select coalesce(sum(sabedoria), 0)::int as earned from public.lesson_results
          where user_id = ${userId} and discipline_id = ${disciplineId} and topic = ${topic}`,
        );
        const sabedoria = Math.max(0, STOP_SABEDORIA - earned);
        const inserted = await tx`
          insert into public.stop_results (user_id, discipline_id, topic, mistakes, relampago_mistakes, sabedoria)
          values (${userId}, ${disciplineId}, ${topic}, ${mistakes}, ${relampagoMistakes}, ${sabedoria})
          on conflict do nothing returning 1`;
        if (!inserted.length)
          return { sabedoria: 0, peixinhos: 0, patinha: false };

        await tx`insert into public.wallets (user_id) values (${userId}) on conflict do nothing`;
        await tx`
          update public.wallets set peixinhos = peixinhos + ${STOP_PEIXINHOS}, updated_at = now()
          where user_id = ${userId}`;
        const { today } = one(
          await tx<{ today: number }[]>`
          select count(*)::int as today from ${sabedoriaRows(tx)} s
          where s.user_id = ${userId}
            and (s.completed_at at time zone ${TIME_ZONE})::date = (now() at time zone ${TIME_ZONE})::date`,
        );
        return {
          sabedoria,
          peixinhos: STOP_PEIXINHOS,
          patinha: today === 1,
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
