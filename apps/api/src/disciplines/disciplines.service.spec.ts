import type { AiService } from '@nestjs/ai';
import { EMBEDDING_MODEL } from '../platform/ai/ai.module.js';
import type { DisciplinesRepository } from './disciplines.repository.js';
import { DisciplinesService } from './disciplines.service.js';

describe('DisciplinesService', () => {
  const repository = {
    pending: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    nearest: vi.fn(),
  };
  const ai = { embed: vi.fn(), embedMany: vi.fn() };
  const service = new DisciplinesService(
    repository as unknown as DisciplinesRepository,
    ai as unknown as AiService,
  );

  beforeEach(() => vi.clearAllMocks());

  describe('embedPending', () => {
    it('returns 0 and never calls the model when nothing is pending', async () => {
      repository.pending.mockResolvedValue([]);

      expect(await service.embedPending()).toBe(0);
      expect(repository.pending).toHaveBeenCalledWith(EMBEDDING_MODEL);
      expect(ai.embedMany).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('embeds the texts in order and saves each vector with its row', async () => {
      const pending = [
        { id: '7', text: 'A: x; y' },
        { id: '3', text: 'B: z' },
      ];
      repository.pending.mockResolvedValue(pending);
      ai.embedMany.mockResolvedValue({
        embeddings: [
          [1, 1],
          [2, 2],
        ],
      });

      expect(await service.embedPending()).toBe(2);
      expect(ai.embedMany).toHaveBeenCalledTimes(1);
      expect(ai.embedMany.mock.calls[0][0].values).toEqual(['A: x; y', 'B: z']);
      expect(repository.save).toHaveBeenCalledWith(EMBEDDING_MODEL, [
        { id: '7', text: 'A: x; y', embedding: [1, 1] },
        { id: '3', text: 'B: z', embedding: [2, 2] },
      ]);
    });

    it('saves nothing when the model fails', async () => {
      repository.pending.mockResolvedValue([{ id: '1', text: 't' }]);
      ai.embedMany.mockRejectedValue(new Error('provider down'));

      await expect(service.embedPending()).rejects.toThrow('provider down');
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('embeds the query and passes the vector and the limit to nearest', async () => {
      const matches = [{ id: '1' }];
      ai.embed.mockResolvedValue({ embedding: [0.5, 0.5] });
      repository.nearest.mockResolvedValue(matches);

      expect(await service.search('gosto de biologia', 3)).toBe(matches);
      expect(ai.embed.mock.calls[0][0].value).toBe('gosto de biologia');
      expect(repository.nearest).toHaveBeenCalledWith(
        EMBEDDING_MODEL,
        [0.5, 0.5],
        3,
      );
    });

    it('defaults to 5 results', async () => {
      ai.embed.mockResolvedValue({ embedding: [1] });
      repository.nearest.mockResolvedValue([]);

      await service.search('q');

      expect(repository.nearest).toHaveBeenCalledWith(EMBEDDING_MODEL, [1], 5);
    });
  });
});
