import {
  type CanActivate,
  Controller,
  type ExecutionContext,
  Get,
  type INestApplication,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AllExceptionsFilter } from '../http/all-exceptions.filter.js';
import { RateLimitModule } from './rate-limit.module.js';

/** Stands in for AuthGuard with a fake token verifier: the bearer token is the user id. */
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.userId = req.headers.authorization?.split(' ')[1];
    return true;
  }
}

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return 'pong';
  }
}

describe('Rate limit', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitModule],
      controllers: [PingController],
      providers: [
        // The same order as AppModule: who the person is, then how often they may call.
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  const ping = (user: string) =>
    request(app.getHttpServer())
      .get('/ping')
      .set('Authorization', `Bearer ${user}`);

  it('answers 429 on the 21st request of a person in a minute, and only for that person', async () => {
    for (let i = 0; i < 20; i++) await ping('ana').expect(200);

    const res = await ping('ana').expect(429);

    expect(res.body).toEqual({
      statusCode: 429,
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many messages, take a short break and try again',
      path: '/ping',
      timestamp: expect.any(String),
    });
    await ping('bia').expect(200);
  });
});
