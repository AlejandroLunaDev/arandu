import type { ConfigService } from '@nestjs/config';

type Opts = { providerOptions: { openrouter: unknown } };

const captured = vi.hoisted(() => ({
  options: undefined as
    | {
        useFactory: (config: unknown) => {
          models: Record<string, Opts>;
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
  const build = async () => {
    await import('./ai.module.js');
    const config = { get: () => 'key' } as unknown as ConfigService;
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
      provider: { data_collection: 'deny' },
      reasoning: { enabled: false },
    });
  });
});
