import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module.js';
import { GameController } from './game.controller.js';
import { GameRepository } from './game.repository.js';

@Module({
  imports: [ProgressModule],
  controllers: [GameController],
  providers: [GameRepository],
})
export class GameModule {}
