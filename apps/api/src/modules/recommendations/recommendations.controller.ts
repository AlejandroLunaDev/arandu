import type {
  Recommendations,
  RecommendationsRequest,
} from '@arandu/contracts';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { UserId } from '../auth/user-id.decorator.js';
import { profileInput } from '../memory/profile.schema.js';
import { RecommendationsService } from './recommendations.service.js';

const recommendationsRequest = z.object({ profile: profileInput });

@Controller('arandu/recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Post()
  @HttpCode(200)
  recommend(
    @UserId() userId: string,
    @Body({ schema: recommendationsRequest }) body: RecommendationsRequest,
  ): Promise<Recommendations> {
    return this.recommendations.forPerson(userId, body.profile);
  }
}
