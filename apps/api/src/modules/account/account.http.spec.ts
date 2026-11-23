import { fakeModel } from '@nestjs/ai/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHttpApp, USER_ID } from '../../../test/http-app.js';
import { AccountModule } from './account.module.js';
import { AccountRepository } from './account.repository.js';

describe('account routes', () => {
  let app: INestApplication;
  const repo = { export: vi.fn(), delete: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    app = await createHttpApp([AccountModule], fakeModel({ object: {} }), [
      [AccountRepository, repo],
    ]);
  });
  afterEach(() => app.close());

  it('GET /me/export returns everything kept about the person', async () => {
    const data = { journeys: [{ user_id: USER_ID }], arandu_messages: [] };
    repo.export.mockResolvedValue(data);

    const res = await request(app.getHttpServer())
      .get('/me/export')
      .expect(200);

    expect(res.body).toEqual(data);
    expect(repo.export).toHaveBeenCalledWith(USER_ID);
  });

  it('DELETE /me answers 204 and deletes the person', async () => {
    repo.delete.mockResolvedValue(undefined);

    await request(app.getHttpServer()).delete('/me').expect(204);

    expect(repo.delete).toHaveBeenCalledWith(USER_ID);
  });

  it('DELETE /me does not answer 204 when the deletion fails', async () => {
    repo.delete.mockRejectedValue(new Error('db down'));

    await request(app.getHttpServer()).delete('/me').expect(500);
  });
});
