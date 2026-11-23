import type {
  Caixa,
  League,
  Season,
  Wallet,
  Wardrobe,
  WardrobeUpdate,
} from '@arandu/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { LEAGUES, LEVELS } from './game.logic.js';
import { GameRepository } from './game.repository.js';
import { id, param } from '../../core/http/params.js';
import {
  caixaNotFound,
  levelNotFound,
  shopItemNotFound,
} from './game.errors.js';

const level = z.coerce.number().int().min(1).max(LEVELS);
const shopItem = z.enum(['novelos', 'marcador']);
const wardrobeUpdate = z
  .object({
    wearing: z
      .enum(LEAGUES.map((l) => l.id) as [string, ...string[]])
      .nullable()
      .optional(),
    // Others see it in the league: letters, digits, spaces and . _ - only.
    nickname: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(/^[\p{L}\p{N} ._-]+$/u)
      .nullable()
      .optional(),
  })
  .strict();

@Controller('me')
export class GameController {
  constructor(private readonly game: GameRepository) {}

  /** L1: this round's league of 12; reading it settles a finished round. */
  @Get('league')
  league(@UserId() userId: string): Promise<League> {
    return this.game.league(userId);
  }

  /** L7 was shown. */
  @Post('league/promotion/seen')
  @HttpCode(204)
  promotionSeen(@UserId() userId: string): Promise<void> {
    return this.game.promotionSeen(userId);
  }

  /** L3. */
  @Get('season')
  season(@UserId() userId: string): Promise<Season> {
    return this.game.season(userId);
  }

  @Post('season/levels/:level/claim')
  @HttpCode(200)
  claim(
    @UserId() userId: string,
    @Param('level', param(level, levelNotFound)) levelNumber: number,
  ): Promise<Season> {
    return this.game.claim(userId, levelNumber);
  }

  /** L4: earned only, never sold. */
  @Get('caixas')
  caixas(@UserId() userId: string): Promise<Caixa[]> {
    return this.game.caixas(userId);
  }

  @Post('caixas/:id/open')
  @HttpCode(200)
  open(
    @UserId() userId: string,
    @Param('id', param(id, caixaNotFound)) caixaId: number,
  ): Promise<Caixa> {
    return this.game.open(userId, caixaId);
  }

  /** K1: full novelos or a page marker, for peixinhos. */
  @Post('shop/:item')
  @HttpCode(200)
  buy(
    @UserId() userId: string,
    @Param('item', param(shopItem, shopItemNotFound))
    item: 'novelos' | 'marcador',
  ): Promise<Wallet> {
    return this.game.buy(userId, item);
  }

  /** L6. */
  @Get('wardrobe')
  wardrobe(@UserId() userId: string): Promise<Wardrobe> {
    return this.game.wardrobe(userId);
  }

  @Put('wardrobe')
  updateWardrobe(
    @UserId() userId: string,
    @Body({ schema: wardrobeUpdate }) body: WardrobeUpdate,
  ): Promise<Wardrobe> {
    return this.game.updateWardrobe(userId, body);
  }
}
