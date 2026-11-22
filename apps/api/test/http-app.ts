import { AiModule } from '@nestjs/ai';
import type { FakeModel } from '@nestjs/ai/testing';
import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  StandardSchemaValidationPipe,
  type Type,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { MemoryRepository } from '../src/memory/memory.repository.js';
import {
  AllExceptionsFilter,
  validationFailed,
} from '../src/platform/http/all-exceptions.filter.js';

export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const SESSION_ID = '22222222-2222-4222-8222-222222222222';

/** Stands in for AuthGuard: every request comes from USER_ID. */
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().userId = USER_ID;
    return true;
  }
}

/** A MemoryRepository with nothing stored: a new person, and sessions that open with SESSION_ID. */
export const fakeMemoryRepository = () => ({
  read: vi
    .fn()
    .mockResolvedValue({ profile: null, summary: '', facts: [], sessions: [] }),
  conversations: vi.fn().mockResolvedValue({ conversations: [] }),
  facts: vi.fn().mockResolvedValue([]),
  deleteFact: vi.fn().mockResolvedValue(true),
  createSession: vi.fn().mockResolvedValue(SESSION_ID),
  sessionMessages: vi.fn().mockResolvedValue([]),
  addMessages: vi.fn().mockResolvedValue(undefined),
  saveProfile: vi.fn().mockResolvedValue(undefined),
  unsummarized: vi
    .fn()
    .mockResolvedValue({ sessionIds: [], questionIds: [], transcript: '' }),
  saveFacts: vi.fn().mockResolvedValue(true),
  forget: vi.fn().mockResolvedValue(undefined),
});

export const withMemory = (
  memory: ReturnType<typeof fakeMemoryRepository>,
): [Type, object] => [MemoryRepository, memory];

/** A feature module on a fake model and fake repositories, wired as AppModule wires the HTTP side. */
export async function createHttpApp(
  imports: Type[],
  model: FakeModel,
  overrides: [Type, object][],
): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    imports: [
      AiModule.forRoot({ isGlobal: true, models: { default: model } }),
      ...imports,
    ],
    providers: [
      { provide: APP_GUARD, useClass: FakeAuthGuard },
      {
        provide: APP_PIPE,
        useValue: new StandardSchemaValidationPipe({
          exceptionFactory: validationFailed,
        }),
      },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
    ],
  });
  for (const [token, value] of overrides)
    builder.overrideProvider(token).useValue(value);
  const app = (await builder.compile()).createNestApplication();
  await app.init();
  return app;
}
