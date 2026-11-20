import type { Journey, JourneyUpdate } from '@arandu/contracts';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PersonGoneError } from '../memory/memory.repository.js';
import { SQL, type Sql } from '../platform/database/database.module.js';

const EMPTY: Journey = {
  answers: null,
  professionSlug: null,
  courseId: null,
  disciplineId: null,
  weeklyGoal: null,
  age: null,
};

const COLUMNS = {
  answers: 'answers',
  professionSlug: 'profession_slug',
  courseId: 'course_id',
  disciplineId: 'discipline_id',
  weeklyGoal: 'weekly_goal',
  age: 'age',
} as const satisfies Record<keyof Journey, string>;

/** What each person chose on the way to their first stop (O02-O20). */
@Injectable()
export class JourneyRepository {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  async read(userId: string): Promise<Journey> {
    const [row] = await this.sql<Journey[]>`
      select answers, profession_slug as "professionSlug", course_id::int as "courseId",
        discipline_id::int as "disciplineId", weekly_goal as "weeklyGoal", age
      from public.journeys where user_id = ${userId}`;
    return row ?? EMPTY;
  }

  async update(userId: string, update: JourneyUpdate): Promise<Journey> {
    const values: Record<string, unknown> = { user_id: userId };
    for (const [key, column] of Object.entries(COLUMNS)) {
      const value = update[key as keyof Journey];
      if (value === undefined) continue;
      values[column] =
        key === 'answers' && value !== null
          ? this.sql.json(value as never)
          : value;
    }
    const columns = Object.keys(values);
    if (columns.length === 1) return this.read(userId);
    try {
      await this.sql`
        insert into public.journeys ${this.sql(values, columns)}
        on conflict (user_id) do update set ${this.sql(values, columns.slice(1))}, updated_at = now()`;
    } catch (error) {
      const { code, constraint_name } = error as {
        code?: string;
        constraint_name?: string;
      };
      if (code === '23503' && constraint_name === 'journeys_user_id_fkey')
        throw new PersonGoneError();
      // Any other broken key is a career, course or subject that does not exist.
      if (code === '23503')
        throw new BadRequestException('No such career, course or subject');
      throw error;
    }
    return this.read(userId);
  }
}
