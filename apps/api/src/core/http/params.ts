import type { PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/** A row id: a positive Postgres integer. */
export const id = z.coerce.number().int().positive().max(2_147_483_647);

/** A stop's index inside its subject. */
export const topic = z.coerce.number().int().min(0).max(200);

/** A profession's slug. */
export const slug = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/**
 * Parses a route param. A malformed one answers the resource's own 404, as an id that does not exist would: the
 * caller learns nothing more from "malformed" than from "not found".
 */
export function param<T>(
  schema: z.ZodType<T>,
  notFound: () => Error,
): PipeTransform<unknown, T> {
  return {
    transform(value) {
      const parsed = schema.safeParse(value);
      if (!parsed.success) throw notFound();
      return parsed.data;
    },
  };
}
