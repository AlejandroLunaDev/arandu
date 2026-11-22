import { Controller, Delete, Get, HttpCode, Logger } from '@nestjs/common';
import { UserId } from '../auth/user-id.decorator.js';
import { AccountRepository } from './account.repository.js';

@Controller('me')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(private readonly account: AccountRepository) {}

  /** K5: everything the API keeps about the person, as JSON. */
  @Get('export')
  export(
    @UserId() userId: string,
  ): Promise<Record<string, readonly unknown[]>> {
    return this.account.export(userId);
  }

  /** K5: deletes the account and all its data. The client signs out after it. */
  @Delete()
  @HttpCode(204)
  async delete(@UserId() userId: string): Promise<void> {
    this.logger.log(`Deleting user ${userId}`);
    await this.account.delete(userId);
  }
}
