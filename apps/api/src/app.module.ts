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
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { BooksModule } from './books/books.module.js';
import { CareerChatModule } from './career-chat/career-chat.module.js';
import { CareersModule } from './careers/careers.module.js';
import { validateEnv } from './config/env.js';
import { MemoryModule } from './memory/memory.module.js';
import { JourneyModule } from './journey/journey.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { PathsModule } from './paths/paths.module.js';
import { AiModule } from './platform/ai/ai.module.js';
import { DatabaseModule } from './platform/database/database.module.js';
import { AllExceptionsFilter } from './platform/http/all-exceptions.filter.js';
import { RequestLoggerMiddleware } from './platform/http/request-logger.middleware.js';
import { RateLimitModule } from './platform/rate-limit/rate-limit.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';

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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards run in this order: who the person is first, then how often they may call.
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Validates every @Body({ schema }) and @Param(..., { schema }): Nest does not without this pipe.
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*path}');
  }
}
