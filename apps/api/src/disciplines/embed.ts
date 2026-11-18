// Embeds the disciplines that are new or changed. Run by hand after the engine loads disciplines, like the migrations
// (ADR-0003): npm run embed --workspace @arandu/api. Costs about US$ 0.01 per million tokens.
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DisciplinesService } from './disciplines.service.js';

const app = await NestFactory.createApplicationContext(AppModule);
try {
  await app.get(DisciplinesService).embedPending();
} finally {
  await app.close();
}
