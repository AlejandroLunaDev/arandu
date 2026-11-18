import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  SUPABASE_URL: 'https://project.supabase.co/',
  OPENROUTER_API_KEY: 'key',
};

describe('validateEnv', () => {
  it('lists every missing variable', () => {
    expect.assertions(3);
    try {
      validateEnv({});
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('SUPABASE_URL');
      expect(message).toContain('OPENROUTER_API_KEY');
    }
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
