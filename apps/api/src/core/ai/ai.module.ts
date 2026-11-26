import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AiModule as NestAiModule } from '@nestjs/ai';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

const logger = new Logger('AI');
/** The model when OPENROUTER_MODELS is not set, and the only one with a price. */
const HAIKU = 'anthropic/claude-haiku-5.5';

/**
 * The language model behind Arandu, through OpenRouter. AiService adds timeouts (60 s), retries of what the provider
 * marks retryable (429, 5xx, network) and the cost of each call, logged here without any of its content.
 */
@Module({
  imports: [
    NestAiModule.forRootAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const openrouter = createOpenAICompatible({
          name: 'openrouter',
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: config.get('OPENROUTER_API_KEY', { infer: true }),
          headers: { 'X-OpenRouter-Title': 'Arandu' },
          // generateObject sends a JSON schema, which OpenRouter passes on to the model.
          supportsStructuredOutputs: true,
        });
        // shortcut: for the demo prompts may go to providers that store or train on them, as free models do (owner,
        // 2026-11-26); the people may be minors (LGPD), so put `provider: { data_collection: 'deny' }` back before real users.
        // Reasoning off: Haiku 5.5's thinking spent 307 of 400 output tokens and cut replies mid-sentence.
        // A model's own providerOptions replace these defaults (not merged), so each model repeats them.
        // With more than one model OpenRouter falls back through `models` itself, within the same request.
        const [id = HAIKU, ...fallbacks] = config.get('OPENROUTER_MODELS', {
          infer: true,
        });
        const routing = {
          reasoning: { enabled: false },
          ...(fallbacks.length > 0 && { models: [id, ...fallbacks] }),
        };
        return {
          models: {
            // Prices in USD per million tokens, from openrouter.ai/anthropic/claude-haiku-5.5 (2026-11-17).
            // shortcut: another model logs no cost; add its price here if it is kept.
            // Chapters are written from pages Firecrawl downloads (modules/paths/firecrawl.ts), not from a model's search.
            default: {
              model: openrouter(id),
              ...(id === HAIKU && { pricing: { input: 0.1, output: 0.5 } }),
            },
          },
          defaults: {
            maxOutputTokens: 400,
            providerOptions: { openrouter: routing },
          },
          onUsage: ({
            label,
            model,
            attempt,
            usage,
            cost,
            durationMs,
            finishReason,
          }) =>
            logger.log(
              `${label ?? 'call'} ${model.modelId} ${usage.inputTokens}→${usage.outputTokens} tokens` +
                ` US$ ${(cost ?? 0).toFixed(6)} ${durationMs} ms ${finishReason}${attempt > 1 ? ` attempt ${attempt}` : ''}`,
            ),
        };
      },
    }),
  ],
})
export class AiModule {}
