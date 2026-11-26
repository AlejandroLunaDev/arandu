import type {
  CareerPath,
  CareerPaths,
  LessonResult,
  ChapterCard,
  ChapterResult,
} from '@arandu/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { PersonGoneError } from '../memory/memory.repository.js';
import { SQL, type Sql } from '../../core/database/database.module.js';

/** Sabedoria a chapter finished in one pass gives (demo value); in lessons it comes LESSON_SABEDORIA at a time. */
export const CHAPTER_SABEDORIA = 15;

/** Peixinhos a finished chapter gives (demo value). */
export const CHAPTER_PEIXINHOS = 10;

import {
  asPerson,
  madeChapters,
  studyRows,
  openWallet,
  TIME_ZONE,
} from '../progress/progress.repository.js';
import { one } from '../../core/database/one.js';
import type { ChapterPieces, PieceRef } from './composer.js';
import { LESSON_SABEDORIA, LESSONS, lessonOpen } from './lessons.logic.js';
import type { Piece, StoredChapter } from './pieces.js';
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
  city: string | null;
  discipline_id: number;
  code: string | null;
  subject: string;
  topics: string[];
  source_label: string;
  source_url: string;
  retrieved_at: Date;
}

/** The paths a career can be lived through, their chapters, and the chapters each person finished. */
@Injectable()
export class PathsRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  /** Each course of the career with the career's first-semester subjects and their made chapters; null for no slug. */
  async careerPaths(slug: string): Promise<CareerPaths | null> {
    const [profession] = await this.sql<{ name: string }[]>`
      select name from public.professions where slug = ${slug}`;
    if (!profession) return null;

    // One content per career (ADR-0008): every course of the career is lived through the first semester of the
    // career's grid (term 1, or year 1 when the source states no term), whichever institution published it. A subject
    // is played from the one discipline its name is taught from; its code is shown only at its own institution.
    const rows = await this.sql<PathRow[]>`
      select c.id::int as course_id, coalesce(i.short_name, i.name) as institution, c.name as course, c.city,
        d.id::int as discipline_id, case when d.institution_id = c.institution_id then d.code end as code,
        d.name as subject, d.topics, s.label as source_label, s.url as source_url, s.last_fetched_at as retrieved_at
      from public.professions p
      join public.career_grids g on g.profession_id = p.id
      join public.sources s on s.id = g.source_id
      join public.courses c on c.profession_id = p.id
      join public.institutions i on i.id = c.institution_id
      join public.disciplines d on d.id in (
        select su.discipline_id from public.curriculum_subjects cs
        join public.subjects su on su.key = cs.subject_key
        where cs.source_id = g.source_id and (cs.term = 1 or (cs.term is null and cs.year = 1)))
      where p.slug = ${slug} and cardinality(d.topics) > 0
      order by institution, c.city, c.id, d.name`;

    // A subject lists only its leading chapters that are already made, so opening one never waits on a live generation;
    // a subject with none, and a path with no such subject, are left out.
    const ids = [...new Set(rows.map((r) => r.discipline_id))];
    const made = new Set(
      ids.length
        ? (
            await this.sql<{ d: number; t: number; text: string }[]>`
              select discipline_id::int as d, topic::int as t, topic_text as text
              from public.chapter_contents where discipline_id in ${this.sql(ids)}`
          ).map((s) => `${s.d}:${s.t}:${s.text}`)
        : [],
    );
    const ready = (row: PathRow) => {
      const gap = row.topics.findIndex(
        (text, t) => !made.has(`${row.discipline_id}:${t}:${text}`),
      );
      return gap < 0 ? row.topics : row.topics.slice(0, gap);
    };

    const paths = new Map<number, CareerPath>();
    for (const row of rows) {
      const topics = ready(row);
      if (!topics.length) continue;
      let path = paths.get(row.course_id);
      if (!path) {
        path = {
          courseId: row.course_id,
          institution: row.institution,
          course: row.course,
          city: row.city,
          // The career's grid is shared by all its courses, and the census states no shift.
          shift: null,
          subjects: [],
          source: {
            label: row.source_label,
            url: row.source_url,
            retrievedAt: row.retrieved_at.toISOString(),
          },
        };
        paths.set(row.course_id, path);
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

  /** How many leading chapters of the subject are made: the run people can open and finish (0 for no subject). */
  async madeCount(disciplineId: number): Promise<number> {
    const [row] = await this.sql<{ n: number }[]>`
      select ${madeChapters(this.sql)} as n from public.disciplines d where d.id = ${disciplineId}`;
    return row?.n ?? 0;
  }

  async discipline(id: number): Promise<Discipline | null> {
    const [row] = await this.sql<Discipline[]>`
      select id::int, name, coalesce(topics, '{}') as topics from public.disciplines where id = ${id}`;
    return row ?? null;
  }

  /** The chapter's stored content, when it was made from this same topic text. */
  async chapterContent(
    disciplineId: number,
    topic: number,
    topicText: string,
  ): Promise<StoredChapter | null> {
    const [row] = await this.sql<{ content: StoredChapter }[]>`
      select content from public.chapter_contents
      where discipline_id = ${disciplineId} and topic = ${topic} and topic_text = ${topicText}`;
    return row?.content ?? null;
  }

  /** The pieces of every stored chapter of the subject made from its current topic text, in one query. */
  async subjectPieces(
    disciplineId: number,
    topics: string[],
  ): Promise<ChapterPieces[]> {
    const rows = await this.sql<
      { topic: number; topic_text: string; pieces: Piece[] | null }[]
    >`
      select topic::int, topic_text, content -> 'pieces' as pieces
      from public.chapter_contents where discipline_id = ${disciplineId} order by topic`;
    return rows
      .filter((r) => topics[r.topic] === r.topic_text)
      .map((r) => ({ topic: r.topic, pieces: r.pieces ?? [] }));
  }

  /** The subject's stored cards by topic, those made from the same topic text. */
  async chapterCards(
    disciplineId: number,
    topics: string[],
  ): Promise<Map<number, ChapterCard[]>> {
    const rows = await this.sql<
      { topic: number; topic_text: string; cards: ChapterCard[] }[]
    >`
      select topic::int, topic_text, cards from public.chapter_cards where discipline_id = ${disciplineId}`;
    return new Map(
      rows
        .filter((r) => topics[r.topic] === r.topic_text)
        .map((r) => [r.topic, r.cards]),
    );
  }

  async saveChapterCards(
    disciplineId: number,
    entries: { topic: number; topicText: string; cards: ChapterCard[] }[],
  ): Promise<void> {
    for (const e of entries)
      await this.sql`
        insert into public.chapter_cards (discipline_id, topic, topic_text, cards)
        values (${disciplineId}, ${e.topic}, ${e.topicText}, ${this.sql.json(e.cards as never)})
        on conflict (discipline_id, topic) do update
          set topic_text = excluded.topic_text, cards = excluded.cards, created_at = now()`;
  }

  async saveChapterContent(content: StoredChapter): Promise<void> {
    await this.sql`
      insert into public.chapter_contents (discipline_id, topic, topic_text, content)
      values (${content.discipline.id}, ${content.topic.index}, ${content.topic.text}, ${this.sql.json(content as never)})
      on conflict (discipline_id, topic) do update
        set topic_text = excluded.topic_text, content = excluded.content, created_at = now()`;
  }

  /** T1: a question about a chapter's cards and Arandu's answer, kept for "Suas conversas". */
  async saveQuestion(
    userId: string,
    disciplineId: number,
    topic: number,
    question: string,
    answer: string,
  ): Promise<void> {
    try {
      await this.sql`
        insert into public.chapter_questions (user_id, discipline_id, topic, question, answer)
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
  ): Promise<{ lesson: number; missed: PieceRef[] }[]> {
    return this.sql<{ lesson: number; missed: PieceRef[] }[]>`
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
      select 1 from public.chapter_results
      where user_id = ${userId} and discipline_id = ${disciplineId} and topic = ${topic}`;
    return row !== undefined;
  }

  /**
   * Records a finished lesson: 409 `lesson_locked` before it opens (lessonOpen; never once the chapter was finished in
   * one pass). The first finish gives LESSON_SABEDORIA (none once the chapter is finished) and a caixa (#145); lesson 3
   * also finishes the chapter. The patinha is the day's first lesson or chapter. Achievements are added by the caller.
   */
  async finishLesson(
    userId: string,
    disciplineId: number,
    topic: number,
    lesson: number,
    missed: PieceRef[],
  ): Promise<Omit<LessonResult, 'achievements'>> {
    return asPerson(
      this.sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${userId}))`;
        const { done, finished, studied } = one(
          await tx<{ done: number[]; finished: boolean; studied: boolean }[]>`
          select
            array(select lesson::int from public.lesson_results
              where user_id = ${userId} and discipline_id = ${disciplineId} and topic = ${topic}) as done,
            exists (select 1 from public.chapter_results
              where user_id = ${userId} and discipline_id = ${disciplineId} and topic = ${topic}) as finished,
            exists (select 1 from ${studyRows(tx)} s
              where s.user_id = ${userId}
                and (s.completed_at at time zone ${TIME_ZONE})::date = (now() at time zone ${TIME_ZONE})::date) as studied`,
        );
        if (!finished && !lessonOpen(lesson, new Set(done)))
          throw lessonLocked();
        // A chapter already finished (in one pass or in lessons) gave its sabedoria: its lessons are practice.
        const sabedoria = finished ? 0 : LESSON_SABEDORIA;
        const inserted = await tx`
          insert into public.lesson_results (user_id, discipline_id, topic, lesson, missed, sabedoria)
          values (${userId}, ${disciplineId}, ${topic}, ${lesson}, ${tx.json(missed as never)}, ${sabedoria})
          on conflict do nothing returning 1`;
        if (!inserted.length)
          return {
            sabedoria: 0,
            patinha: false,
            caixaId: null,
            chapterDone: lesson === LESSONS,
          };

        const [caixa] = await tx<{ id: number }[]>`
          insert into public.caixas (user_id, reason) values (${userId}, ${`lesson:${disciplineId}:${topic}:${lesson}`})
          on conflict do nothing returning id::int`;
        if (lesson === LESSONS) {
          // The chapter's mistakes are the distinct exercises missed in its lessons.
          const { mistakes } = one(
            await tx<{ mistakes: number }[]>`
            select count(distinct m.value)::int as mistakes from public.lesson_results r, jsonb_array_elements(r.missed) m
            where r.user_id = ${userId} and r.discipline_id = ${disciplineId} and r.topic = ${topic}`,
          );
          await tx`
            insert into public.chapter_results (user_id, discipline_id, topic, mistakes, sabedoria)
            values (${userId}, ${disciplineId}, ${topic}, ${Math.min(mistakes, 100)}, 0)
            on conflict do nothing`;
        }
        return {
          sabedoria,
          patinha: !studied,
          caixaId: caixa?.id ?? null,
          chapterDone: lesson === LESSONS,
        };
      }),
    );
  }

  /** Records a finished chapter. Only the first finish counts: a replay gives nothing. Achievements are added by the caller. */
  async finishChapter(
    userId: string,
    disciplineId: number,
    topic: number,
    mistakes: number,
    relampagoMistakes: number | null = null,
  ): Promise<Omit<ChapterResult, 'achievements'>> {
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
        const sabedoria = Math.max(0, CHAPTER_SABEDORIA - earned);
        const inserted = await tx`
          insert into public.chapter_results (user_id, discipline_id, topic, mistakes, relampago_mistakes, sabedoria)
          values (${userId}, ${disciplineId}, ${topic}, ${mistakes}, ${relampagoMistakes}, ${sabedoria})
          on conflict do nothing returning 1`;
        if (!inserted.length)
          return { sabedoria: 0, peixinhos: 0, patinha: false };

        // The day's top-up first, so these peixinhos are not swallowed by it later.
        await openWallet(tx, userId);
        await tx`
          update public.wallets set peixinhos = peixinhos + ${CHAPTER_PEIXINHOS}, updated_at = now()
          where user_id = ${userId}`;
        const { today } = one(
          await tx<{ today: number }[]>`
          select count(*)::int as today from ${studyRows(tx)} s
          where s.user_id = ${userId}
            and (s.completed_at at time zone ${TIME_ZONE})::date = (now() at time zone ${TIME_ZONE})::date`,
        );
        return {
          sabedoria,
          peixinhos: CHAPTER_PEIXINHOS,
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
