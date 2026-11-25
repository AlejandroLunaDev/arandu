import type { ChapterContent } from '@arandu/contracts';
import type { AiService } from '@nestjs/ai';
import { NotFoundException } from '@nestjs/common';
import { SAFE_REPLY } from '../arandu/arandu.safety.js';
import { CardTalkService } from './card-talk.service.js';
import type { PathsRepository } from './paths.repository.js';

const chapter = (withExplain = true): ChapterContent =>
  ({
    topic: { index: 1, text: 'Derivadas', total: 2 },
    cards: [
      {
        title: 't1',
        text: 'x1',
        source: { label: 'l1', url: 'https://a.org/1', quote: 'q1' },
      },
      {
        title: 't2',
        text: 'x2',
        source: { label: 'l2', url: 'https://a.org/2', quote: 'q2' },
      },
    ],
    exercises: [
      {
        kind: 'ordene',
        mode: 'produzir',
        prompt: 'p',
        steps: ['a', 'b', 'c'],
        why: 'w',
      },
      ...(withExplain
        ? [
            {
              kind: 'explique_para_o_arandu',
              mode: 'produzir',
              prompt: 'Explique',
              ideas: ['i1', 'i2', 'i3'],
              why: 'w',
            },
          ]
        : []),
    ],
  }) as ChapterContent;

describe('CardTalkService', () => {
  const discipline = { id: 7, name: 'C', topics: ['Limites', 'Derivadas'] };
  let ai: {
    generateObject: ReturnType<typeof vi.fn>;
    generateText: ReturnType<typeof vi.fn>;
  };
  let paths: {
    discipline: ReturnType<typeof vi.fn>;
    chapterContent: ReturnType<typeof vi.fn>;
    madeCount: ReturnType<typeof vi.fn>;
    saveQuestion: ReturnType<typeof vi.fn>;
  };
  let service: CardTalkService;

  beforeEach(() => {
    ai = {
      generateObject: vi.fn().mockResolvedValue({
        object: { got: [true, false, true], reply: 'ok' },
      }),
      generateText: vi.fn().mockResolvedValue({ text: '  A resposta.  ' }),
    };
    paths = {
      discipline: vi.fn().mockResolvedValue(discipline),
      chapterContent: vi.fn().mockResolvedValue(chapter()),
      madeCount: vi.fn().mockResolvedValue(2),
      saveQuestion: vi.fn().mockResolvedValue(undefined),
    };
    service = new CardTalkService(
      ai as unknown as AiService,
      paths as unknown as PathsRepository,
    );
  });

  describe('explain', () => {
    it('maps the model verdicts to the expected ideas', async () => {
      await expect(service.explain(7, 1, 'minha explicacao')).resolves.toEqual({
        ideas: [
          { text: 'i1', got: true },
          { text: 'i2', got: false },
          { text: 'i3', got: true },
        ],
        reply: 'ok',
      });
      expect(paths.chapterContent).toHaveBeenCalledWith(7, 1, 'Derivadas');
      const prompt = JSON.parse(ai.generateObject.mock.calls[0]![0].prompt);
      expect(prompt).toEqual({
        question: 'Explique',
        ideas: ['i1', 'i2', 'i3'],
        answer: 'minha explicacao',
      });
    });

    it('an abusive answer gets the safe reply and no idea, without calling the model', async () => {
      await expect(service.explain(7, 1, 'V1@D0')).resolves.toEqual({
        ideas: [
          { text: 'i1', got: false },
          { text: 'i2', got: false },
          { text: 'i3', got: false },
        ],
        reply: SAFE_REPLY,
      });
      expect(ai.generateObject).not.toHaveBeenCalled();
    });

    it('an abusive model reply is replaced, keeping the verdicts', async () => {
      ai.generateObject.mockResolvedValue({
        object: { got: [true, false, true], reply: 'seu babaca' },
      });

      const { ideas, reply } = await service.explain(7, 1, 'a');

      expect(reply).toBe(SAFE_REPLY);
      expect(ideas.map((i) => i.got)).toEqual([true, false, true]);
    });

    it('an idea the model left out counts as not got', async () => {
      ai.generateObject.mockResolvedValue({
        object: { got: [true], reply: 'r' },
      });

      const { ideas } = await service.explain(7, 1, 'a');

      expect(ideas.map((i) => i.got)).toEqual([true, false, false]);
    });

    it('extra verdicts are ignored', async () => {
      ai.generateObject.mockResolvedValue({
        object: { got: [false, true, false, true, true], reply: 'r' },
      });

      const { ideas } = await service.explain(7, 1, 'a');

      expect(ideas.map((i) => i.got)).toEqual([false, true, false]);
    });

    it.each([
      ['an unknown subject', null, chapter(), 1],
      ['a topic out of range', discipline, chapter(), 5],
      ['a chapter not stored', discipline, null, 1],
      ['a chapter with no explique exercise', discipline, chapter(false), 1],
    ])('404s for %s without calling the model', async (_, d, c, t) => {
      paths.discipline.mockResolvedValue(d);
      paths.chapterContent.mockResolvedValue(c);

      await expect(service.explain(7, t, 'a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateObject).not.toHaveBeenCalled();
    });
  });

  describe('explain outside the made run', () => {
    it('404s for a chapter past the made run even when its content is stored', async () => {
      paths.madeCount.mockResolvedValue(1);

      await expect(service.explain(7, 1, 'a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateObject).not.toHaveBeenCalled();
    });
  });

  describe('ask', () => {
    it('answers from the cards, saves the question and returns the sources', async () => {
      const reply = await service.ask('u', 7, 1, 'Por que?');

      expect(reply).toEqual({
        reply: 'A resposta.',
        sources: [
          { label: 'l1', url: 'https://a.org/1' },
          { label: 'l2', url: 'https://a.org/2' },
        ],
      });
      expect(paths.saveQuestion).toHaveBeenCalledWith(
        'u',
        7,
        1,
        'Por que?',
        'A resposta.',
      );
      const call = ai.generateText.mock.calls[0]![0];
      expect(call.prompt).toBe('Por que?');
      expect(call.instructions).toContain('Derivadas');
      expect(call.instructions).toContain('x2');
    });

    it('an abusive question gets the safe reply, without calling the model or saving', async () => {
      await expect(service.ask('u', 7, 1, 'vai se foder')).resolves.toEqual({
        reply: SAFE_REPLY,
        sources: [],
      });
      expect(ai.generateText).not.toHaveBeenCalled();
      expect(paths.saveQuestion).not.toHaveBeenCalled();
    });

    it('an abusive model reply is replaced, and the replacement is what is saved', async () => {
      ai.generateText.mockResolvedValue({ text: ' arrombado ' });

      const { reply } = await service.ask('u', 7, 1, 'Por que?');

      expect(reply).toBe(SAFE_REPLY);
      expect(paths.saveQuestion).toHaveBeenCalledWith(
        'u',
        7,
        1,
        'Por que?',
        SAFE_REPLY,
      );
    });

    it.each([
      ['an unknown subject', null, chapter()],
      ['a chapter not stored', discipline, null],
    ])('404s for %s without calling the model or saving', async (_, d, c) => {
      paths.discipline.mockResolvedValue(d);
      paths.chapterContent.mockResolvedValue(c);

      await expect(service.ask('u', 7, 1, 'q')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateText).not.toHaveBeenCalled();
      expect(paths.saveQuestion).not.toHaveBeenCalled();
    });

    it('404s for a chapter past the made run and saves nothing', async () => {
      paths.madeCount.mockResolvedValue(1);

      await expect(service.ask('u', 7, 1, 'q')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(ai.generateText).not.toHaveBeenCalled();
      expect(paths.saveQuestion).not.toHaveBeenCalled();
    });

    it('saves nothing when the model fails', async () => {
      ai.generateText.mockRejectedValue(new Error('boom'));

      await expect(service.ask('u', 7, 1, 'q')).rejects.toThrow('boom');
      expect(paths.saveQuestion).not.toHaveBeenCalled();
    });

    it('503s and saves nothing when the model answers empty', async () => {
      ai.generateText.mockResolvedValue({ text: '   ' });

      await expect(service.ask('u', 7, 1, 'q')).rejects.toMatchObject({
        status: 503,
      });
      expect(paths.saveQuestion).not.toHaveBeenCalled();
    });
  });
});
