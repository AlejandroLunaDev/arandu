import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchPages } from './firecrawl.js';

const limited = () =>
  new Response(JSON.stringify({ success: false, retry_after_seconds: 2 }), {
    status: 429,
  });
const found = () =>
  new Response(
    JSON.stringify({
      data: [{ url: 'https://www.ufsc.br/a', markdown: 'Texto', title: 'A' }],
    }),
    { status: 200 },
  );

describe('searchPages and the rate limit', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('waits the seconds Firecrawl names and searches again', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(limited())
      .mockResolvedValueOnce(found());
    vi.stubGlobal('fetch', fetch);

    const search = searchPages('key', 'q', 3, false);
    await vi.advanceTimersByTimeAsync(2_999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(search).resolves.toEqual([
      { url: 'https://www.ufsc.br/a', title: 'A', markdown: 'Texto' },
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up after four refusals', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(limited()));
    vi.stubGlobal('fetch', fetch);

    const search = searchPages('key', 'q', 3, false);
    const failed = expect(search).rejects.toThrow('HTTP 429');
    await vi.runAllTimersAsync();

    await failed;
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
