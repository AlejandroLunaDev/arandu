import type { ConfigService } from '@nestjs/config';

const captured = vi.hoisted(() => ({
  options: undefined as { useFactory: (config: unknown) => any } | undefined,
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

  it('keeps data_collection deny and reasoning off on the web model beside the Exa plugin', async () => {
    const { models } = await build();

    expect(models.web.providerOptions.openrouter).toEqual({
      provider: { data_collection: 'deny' },
      reasoning: { enabled: false },
      plugins: [{ id: 'web', engine: 'exa', max_results: 10 }],
    });
  });

  it('keeps the same routing in the defaults', async () => {
    const { defaults } = await build();

    expect(defaults.providerOptions.openrouter).toEqual({
      provider: { data_collection: 'deny' },
      reasoning: { enabled: false },
    });
  });
});
