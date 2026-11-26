import { fakeModel } from '@nestjs/ai/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHttpApp, USER_ID } from '../../../test/http-app.js';
import { ProgressRepository } from '../progress/progress.repository.js';
import { GameModule } from './game.module.js';
import { GameRepository } from './game.repository.js';

describe('game routes', () => {
  let app: INestApplication;
  const repo = {
    league: vi.fn(),
    promotionSeen: vi.fn(),
    season: vi.fn(),
    claim: vi.fn(),
    caixas: vi.fn(),
    open: vi.fn(),
    buy: vi.fn(),
    wardrobe: vi.fn(),
    updateWardrobe: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    for (const fn of Object.values(repo)) fn.mockResolvedValue({ ok: true });
    app = await createHttpApp([GameModule], fakeModel({ object: {} }), [
      [GameRepository, repo],
      [ProgressRepository, {}],
    ]);
  });
  afterEach(() => app.close());

  const server = () => request(app.getHttpServer());

  it('GET /me/league returns the league of the user', async () => {
    const res = await server().get('/me/league').expect(200);

    expect(repo.league).toHaveBeenCalledWith(USER_ID);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /me/league/promotion/seen answers 204', async () => {
    const res = await server().post('/me/league/promotion/seen').expect(204);

    expect(repo.promotionSeen).toHaveBeenCalledWith(USER_ID);
    expect(res.body).toEqual({});
  });

  it('GET /me/season returns the season of the user', async () => {
    await server().get('/me/season').expect(200);

    expect(repo.season).toHaveBeenCalledWith(USER_ID);
  });

  describe('POST /me/season/levels/:level/claim', () => {
    it.each([1, 8])('claims level %i with a parsed number', async (level) => {
      await server().post(`/me/season/levels/${level}/claim`).expect(200);

      expect(repo.claim).toHaveBeenCalledWith(USER_ID, level);
    });

    it.each(['0', '9', 'abc', '-1', '1.5'])('404s for level %s', async (l) => {
      await server().post(`/me/season/levels/${l}/claim`).expect(404);

      expect(repo.claim).not.toHaveBeenCalled();
    });
  });

  it('GET /me/caixas lists the caixas of the user', async () => {
    await server().get('/me/caixas').expect(200);

    expect(repo.caixas).toHaveBeenCalledWith(USER_ID);
  });

  describe('POST /me/caixas/:id/open', () => {
    it('opens the caixa with a parsed id', async () => {
      await server().post('/me/caixas/42/open').expect(200);

      expect(repo.open).toHaveBeenCalledWith(USER_ID, 42);
    });

    it.each(['0', 'abc', '-1', '2147483648'])('404s for id %s', async (id) => {
      await server().post(`/me/caixas/${id}/open`).expect(404);

      expect(repo.open).not.toHaveBeenCalled();
    });
  });

  describe('POST /me/shop/:item', () => {
    it.each(['marcador'])('buys %s', async (item) => {
      await server().post(`/me/shop/${item}`).expect(200);

      expect(repo.buy).toHaveBeenCalledWith(USER_ID, item);
    });

    it.each(['cachecol', 'caixa', 'novelos'])('404s for %s', async (item) => {
      await server().post(`/me/shop/${item}`).expect(404);

      expect(repo.buy).not.toHaveBeenCalled();
    });
  });

  it('GET /me/wardrobe returns the wardrobe of the user', async () => {
    await server().get('/me/wardrobe').expect(200);

    expect(repo.wardrobe).toHaveBeenCalledWith(USER_ID);
  });

  describe('PUT /me/wardrobe', () => {
    it('passes a valid body, trimming the nickname', async () => {
      await server()
        .put('/me/wardrobe')
        .send({ wearing: 'mestre', nickname: '  Ana_Luz-2.0  ' })
        .expect(200);

      expect(repo.updateWardrobe).toHaveBeenCalledWith(USER_ID, {
        wearing: 'mestre',
        nickname: 'Ana_Luz-2.0',
      });
    });

    it('accepts null to clear and an empty body', async () => {
      await server()
        .put('/me/wardrobe')
        .send({ wearing: null, nickname: null })
        .expect(200);
      await server().put('/me/wardrobe').send({}).expect(200);

      expect(repo.updateWardrobe).toHaveBeenNthCalledWith(1, USER_ID, {
        wearing: null,
        nickname: null,
      });
      expect(repo.updateWardrobe).toHaveBeenNthCalledWith(2, USER_ID, {});
    });

    it('accepts accented letters in the nickname', async () => {
      await server().put('/me/wardrobe').send({ nickname: 'João' }).expect(200);
    });

    it.each([
      ['an unknown key', { hat: 'x' }],
      ['a nickname of 1 char', { nickname: 'a' }],
      ['a nickname of 21 chars', { nickname: 'a'.repeat(21) }],
      ['a nickname with an emoji', { nickname: 'Ana \u{1F600}' }],
      ['a nickname with <', { nickname: 'Ana<b>' }],
      ['a blank nickname', { nickname: '   ' }],
      ['wearing that is not a league', { wearing: 'rei' }],
      ['wearing that is a number', { wearing: 1 }],
    ])('400s for %s', async (_name, body) => {
      await server().put('/me/wardrobe').send(body).expect(400);

      expect(repo.updateWardrobe).not.toHaveBeenCalled();
    });
  });
});
