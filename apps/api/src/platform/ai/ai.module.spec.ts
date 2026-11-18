import { AiService } from '@nestjs/ai';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiModule } from './ai.module.js';

const reply = (vectors: number[][]) =>
  new Response(
    JSON.stringify({
      data: vectors.map((embedding, index) => ({ index, embedding })),
      usage: { prompt_tokens: 3, total_tokens: 3 },
    }),
    { headers: { 'content-type': 'application/json' } },
  );

describe('AiModule embeddings', () => {
  let ai: AiService;
  let fetchStub: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchStub = vi.fn();
    vi.stubGlobal('fetch', fetchStub);
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ OPENROUTER_API_KEY: 'test-key' })],
        }),
        AiModule,
      ],
    }).compile();
    ai = module.get(AiService);
  });

  afterEach(() => vi.unstubAllGlobals());

  const sent = () => {
    const [url, init] = fetchStub.mock.calls[0];
    return { url: String(url), init, body: JSON.parse(init.body) };
  };

  it('embed sends the model, the value and the data_collection deny rule to OpenRouter', async () => {
    fetchStub.mockResolvedValue(reply([[0.1, 0.2]]));

    const { embedding } = await ai.embed({ value: 'olá mundo' });

    expect(embedding).toEqual([0.1, 0.2]);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const { url, init, body } = sent();
    expect(url).toBe('https://openrouter.ai/api/v1/embeddings');
    expect(body.provider).toEqual({ data_collection: 'deny' });
    expect(body.model).toBe('baai/bge-m3');
    expect(body.input).toEqual(['olá mundo']);
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer test-key',
    );
  });

  it('embedMany sends every value in order with the same rule, in one request', async () => {
    fetchStub.mockResolvedValue(reply([[1], [2], [3]]));

    const { embeddings } = await ai.embedMany({ values: ['a', 'b', 'c'] });

    expect(embeddings).toEqual([[1], [2], [3]]);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(sent().body).toMatchObject({
      model: 'baai/bge-m3',
      input: ['a', 'b', 'c'],
      provider: { data_collection: 'deny' },
    });
  });
});
