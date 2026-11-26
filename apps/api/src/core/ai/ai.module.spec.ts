import type { ConfigService } from '@nestjs/config';

type Opts = { providerOptions: { openrouter: unknown } };
type Model = { model: { modelId: string }; pricing?: unknown };

const captured = vi.hoisted(() => ({
  options: undefined as
    | {
        useFactory: (config: unknown) => {
          models: Record<string, Model>;
          defaults: Opts;
        };
      }
    | undefined,
}));

vi.mock('@nestjs/ai', () => ({
  AiModule: {
    forRootAsync: (options: typeof captured.options) => {
      captured.options = options;
      return { module: class {} };
    },
  },
}));

describe('AiModule config', () => {
  const build = async (models: string[] = []) => {
    await import('./ai.module.js');
    const config = {
      get: (name: string) => (name === 'OPENROUTER_MODELS' ? models : 'key'),
    } as unknown as ConfigService;
    return captured.options!.useFactory(config);
  };

  it('no model has providerOptions of its own, which would replace the routing below', async () => {
    const { models } = await build();

    for (const model of Object.values(models))
      expect(model).not.toHaveProperty('providerOptions');
  });

  it('keeps the same routing in the defaults', async () => {
    const { defaults } = await build();

    expect(defaults.providerOptions.openrouter).toEqual({
      reasoning: { enabled: false },
    });
  });

  it('uses Haiku 5.5, with its price, when OPENROUTER_MODELS is not set', async () => {
    const { models } = await build();

    expect(models.default!.model.modelId).toBe('anthropic/claude-haiku-5.5');
    expect(models.default!.pricing).toEqual({ input: 0.1, output: 0.5 });
  });

  it('answers with the first of OPENROUTER_MODELS and has OpenRouter fall back through the rest, in order', async () => {
    const list = ['a/one:free', 'b/two:free', 'c/three:free'];
    const { models, defaults } = await build(list);

    expect(models.default!.model.modelId).toBe('a/one:free');
    expect(models.default).not.toHaveProperty('pricing');
    expect(defaults.providerOptions.openrouter).toEqual({
      reasoning: { enabled: false },
      models: list,
    });
  });
});
