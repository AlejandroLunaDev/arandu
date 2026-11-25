import { z } from 'zod';

const env = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Supabase Postgres through its session pooler (ADR-0003). */
  DATABASE_URL: z.url(),
  /** The Supabase project, e.g. https://<ref>.supabase.co: its Auth proves the Google identity at sign-in. */
  SUPABASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  /** The project's publishable (anon) key: Supabase Auth asks for it next to the user's token. */
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  /** Signs the API's own access tokens (HS256). */
  JWT_SECRET: z.string().min(32),
  /** Shared with the web's Next server, the only caller besides the health check and the landing's books. */
  INTERNAL_API_SECRET: z.string().min(32),
  OPENROUTER_API_KEY: z.string().min(1),
  /** Firecrawl, for the pages chapters are written from: only the generation script uses it, never a request. */
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
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
