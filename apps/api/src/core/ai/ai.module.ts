import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AiModule as NestAiModule } from '@nestjs/ai';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

const logger = new Logger('AI');

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
        // The students are minors (LGPD): route only to providers that neither store nor train on prompts.
        // Reasoning off: Haiku 5.5's thinking spent 307 of 400 output tokens and cut replies mid-sentence.
        // A model's own providerOptions replace these defaults (not merged), so each model repeats them.
        const routing = {
          provider: { data_collection: 'deny' },
          reasoning: { enabled: false },
        };
        return {
          models: {
            // Prices in USD per million tokens, from openrouter.ai/anthropic/claude-haiku-5.5 (2026-11-17).
            default: {
              model: openrouter('anthropic/claude-haiku-5.5'),
              pricing: { input: 0.1, output: 0.5 },
            },
            // The same model with OpenRouter's web search on Exa (US$ 0.007 a search, up to 10 results, whatever the
            // model), only for writing chapters' cards from real sources. Anthropic's native search (":online") cost
            // several times more. The search is billed on top and not counted in `cost`.
            web: {
              model: openrouter('anthropic/claude-haiku-5.5'),
              providerOptions: {
                openrouter: {
                  ...routing,
                  plugins: [{ id: 'web', engine: 'exa', max_results: 10 }],
                },
              },
              pricing: { input: 0.1, output: 0.5 },
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
