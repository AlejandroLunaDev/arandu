import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AiModule } from '@nestjs/ai';
import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AranduModule } from './arandu/arandu.module.js';
import { DatabaseModule } from './database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AiModule.forRootAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const openrouter = createOpenAICompatible({
          name: 'openrouter',
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: config.getOrThrow<string>('OPENROUTER_API_KEY'),
          headers: { 'X-OpenRouter-Title': 'Arandu Reka' },
          // generateObject sends a JSON schema, which OpenRouter passes on to the model.
          supportsStructuredOutputs: true,
        });
        return {
          models: {
            // Prices in USD per million tokens, from openrouter.ai/anthropic/claude-haiku-5.5 (2026-11-17).
            default: {
              model: openrouter('anthropic/claude-haiku-5.5'),
              pricing: { input: 0.1, output: 0.5 },
            },
          },
          defaults: {
            maxOutputTokens: 400,
            // The students are minors (LGPD): route only to providers that neither store nor train on prompts.
            // Reasoning off: Haiku 5.5's thinking spent 307 of 400 output tokens and cut replies mid-sentence.
            providerOptions: {
              openrouter: {
                provider: { data_collection: 'deny' },
                reasoning: { enabled: false },
              },
            },
          },
        };
      },
    }),
    AranduModule,
  ],
  controllers: [AppController],
  // Validates every @Body({ schema }) and @Param(..., { schema }): Nest does not without this pipe.
  providers: [
    AppService,
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
  ],
})
export class AppModule {}
