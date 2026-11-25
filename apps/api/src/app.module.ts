import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthGuard } from './modules/auth/auth.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BooksModule } from './modules/books/books.module.js';
import { CareerChatModule } from './modules/career-chat/career-chat.module.js';
import { CareersModule } from './modules/careers/careers.module.js';
import { validateEnv } from './core/config/env.js';
import { MemoryModule } from './modules/memory/memory.module.js';
import { JourneyModule } from './modules/journey/journey.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { PathsModule } from './modules/paths/paths.module.js';
import { AccountModule } from './modules/account/account.module.js';
import { GameModule } from './modules/game/game.module.js';
import { ProgressModule } from './modules/progress/progress.module.js';
import { AiModule } from './core/ai/ai.module.js';
import { DatabaseModule } from './core/database/database.module.js';
import {
  AllExceptionsFilter,
  validationFailed,
} from './core/http/all-exceptions.filter.js';
import { RequestLoggerMiddleware } from './core/http/request-logger.middleware.js';
import { RateLimitModule } from './core/rate-limit/rate-limit.module.js';
import { RecommendationsModule } from './modules/recommendations/recommendations.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    AiModule,
    RateLimitModule,
    AuthModule,
    CareersModule,
    BooksModule,
    MemoryModule,
    OnboardingModule,
    RecommendationsModule,
    CareerChatModule,
    JourneyModule,
    PathsModule,
    ProgressModule,
    GameModule,
    AccountModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards run in this order: who the person is first, then how often they may call.
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Validates every @Body({ schema }) and @Param(..., { schema }): Nest does not without this pipe.
    {
      provide: APP_PIPE,
      useValue: new StandardSchemaValidationPipe({
        exceptionFactory: validationFailed,
      }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*path}');
  }
}
