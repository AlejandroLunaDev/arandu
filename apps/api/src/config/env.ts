import { z } from 'zod';

const env = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Supabase Postgres through its session pooler (ADR-0003). */
  DATABASE_URL: z.url(),
  /** The Supabase project, e.g. https://<ref>.supabase.co: its Auth issues the tokens the API checks. */
  SUPABASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  OPENROUTER_API_KEY: z.string().min(1),
  /** Origins allowed to call the API from a browser, comma-separated (the web app). */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((list) =>
      list
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof env>;

/** Fails the startup with every missing or invalid variable listed, instead of failing on the first request. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = env.safeParse(config);
  if (!parsed.success)
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}
