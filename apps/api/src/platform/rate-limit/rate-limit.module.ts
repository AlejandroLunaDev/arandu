import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Caps requests per signed-in person (per IP on public routes), so no one can drain the model key: every Arandu
 * answer is a paid model call. ThrottlerGuard must run after AuthGuard, which sets the person (see AppModule).
 * shortcut: counters live in this instance's memory; move them to Redis if the API ever runs on more than one.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'burst', ttl: 60_000, limit: 20 },
        { name: 'daily', ttl: 86_400_000, limit: 300 },
      ],
      getTracker: (request: { userId?: string; ip?: string }) =>
        request.userId ?? request.ip ?? 'unknown',
      errorMessage: 'Too many messages, take a short break and try again',
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
