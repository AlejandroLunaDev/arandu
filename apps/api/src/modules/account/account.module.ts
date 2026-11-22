import { Module } from '@nestjs/common';
import { AccountController } from './account.controller.js';
import { AccountRepository } from './account.repository.js';

@Module({
  controllers: [AccountController],
  providers: [AccountRepository],
})
export class AccountModule {}
