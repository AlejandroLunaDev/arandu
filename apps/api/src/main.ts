import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const production = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Colored, readable lines in development; one JSON object per line in production, for the log collector.
    logger: new ConsoleLogger({
      prefix: 'Arandu',
      timestamp: !production,
      colors: !production,
      json: production,
    }),
  });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Only the web app may call the API from a browser; the token travels in the Authorization header, not a cookie.
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  });
  // The largest valid body is a profile or a 2000-character message: anything bigger is refused before parsing.
  app.useBodyParser('json', { limit: '20kb' });
  // Render's proxy sets X-Forwarded-For: trust its first hop, so rate limits see the client's IP, not the proxy's.
  app.set('trust proxy', 1);
  // Closes the database pool on SIGTERM (DatabaseModule.onApplicationShutdown).
  app.enableShutdownHooks();
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
