import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  SUPABASE_URL: 'https://project.supabase.co/',
  OPENROUTER_API_KEY: 'key',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
  JWT_SECRET: 'j'.repeat(32),
  INTERNAL_API_SECRET: 'i'.repeat(32),
};

describe('validateEnv', () => {
  it('lists every missing variable', () => {
    expect.assertions(6);
    try {
      validateEnv({});
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('SUPABASE_URL');
      expect(message).toContain('OPENROUTER_API_KEY');
      expect(message).toContain('SUPABASE_PUBLISHABLE_KEY');
      expect(message).toContain('JWT_SECRET');
      expect(message).toContain('INTERNAL_API_SECRET');
    }
  });

  it('requires JWT_SECRET and INTERNAL_API_SECRET to be at least 32 characters', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(
      'JWT_SECRET',
    );
    expect(() =>
      validateEnv({ ...valid, INTERNAL_API_SECRET: 'short' }),
    ).toThrow('INTERNAL_API_SECRET');
  });

  it('defaults PORT, NODE_ENV and CORS_ORIGINS', () => {
    expect(validateEnv(valid)).toMatchObject({
      PORT: 3000,
      NODE_ENV: 'development',
      CORS_ORIGINS: ['http://localhost:3000'],
    });
  });

  it('splits CORS_ORIGINS by comma, trimmed', () => {
    const env = validateEnv({
      ...valid,
      CORS_ORIGINS: 'https://a.test, https://b.test ,',
    });

    expect(env.CORS_ORIGINS).toEqual(['https://a.test', 'https://b.test']);
  });

  it('drops the trailing slash of SUPABASE_URL', () => {
    expect(validateEnv(valid).SUPABASE_URL).toBe('https://project.supabase.co');
  });
});
