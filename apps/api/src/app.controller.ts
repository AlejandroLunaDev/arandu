import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { OpenToBrowsers } from './modules/auth/public.decorator.js';
import { SkipThrottle } from '@nestjs/throttler';

/** Health check: public and never rate limited, or Render's checks and UptimeRobot would mark the API down. */
@OpenToBrowsers()
// Named: a bare @SkipThrottle() skips only a throttler called "default".
@SkipThrottle({ burst: true, daily: true })
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
