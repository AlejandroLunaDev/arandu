import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { AiService } from '@nestjs/ai';
import { z } from 'zod';

const verdicts = z.object({
  verdicts: z.array(
    // reason before pass: the judge reasons first, then decides, instead of justifying a verdict it already gave.
    z.object({ criterion: z.string(), reason: z.string(), pass: z.boolean() }),
  ),
});

/** Grades Arandu's output against criteria with a model, and keeps the judge's running cost in US$. */
export function createJudge(ai: AiService) {
  // shortcut: Haiku judges itself to keep a run near 3 US cents; switch to anthropic/claude-sonnet-5.5 (about 20x the
  // judge's cost) when a verdict looks wrong.
  const model = createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    supportsStructuredOutputs: true,
  })('anthropic/claude-haiku-5.5');

  const judge = {
    cost: 0,
    /** The criteria the output fails, each with the judge's reason. `context` holds what Arandu was given and said. */
    async failures(context: string[], criteria: string[]): Promise<string[]> {
      const { object, usage } = await ai.generateObject({
        model,
        label: 'eval-judge',
        schema: verdicts,
        temperature: 0,
        maxOutputTokens: 1000,
        instructions:
          'You grade the output of Arandu, a vocational-orientation chat for anyone in Brazil choosing a career ' +
          '(teens, young adults, adults). Judge each criterion strictly and independently; return one verdict per ' +
          'criterion, with its id or text.',
        prompt: [
          ...context,
          `Criteria:\n${criteria.map((k) => `- ${k}`).join('\n')}`,
        ].join('\n\n'),
      });
      // Haiku 5.5's price per million tokens: this model is built here, without the app's pricing.
      judge.cost += (usage.inputTokens * 0.1 + usage.outputTokens * 0.5) / 1e6;
      return object.verdicts
        .filter((v) => !v.pass)
        .map((v) => `${v.criterion.split(':')[0]}: ${v.reason}`);
    },
  };
  return judge;
}

export const questionMarks = (text: string) => (text.match(/\?/g) ?? []).length;
