import { z } from 'zod';
import { REFUSED_SITES, refusedPage } from './source-check.js';

/** A page a search found, with its main text as Firecrawl downloaded it: the only text a card may quote. */
export interface Page {
  url: string;
  title: string;
  markdown: string;
}

const SEARCH = 'https://api.firecrawl.dev/v2/search';
const TIMEOUT_MS = 90_000;
/** The most of a page's text the model reads: about 2,000 tokens. */
export const PAGE_CHARS = 8_000;

// Wikipedia comes from its own search; the refused sites never.
const EXCLUDED = ['wikipedia.org', ...REFUSED_SITES];

const result = z.object({
  url: z.string(),
  title: z.string().nullish(),
  markdown: z.string().nullish(),
  metadata: z.object({ title: z.string().nullish() }).nullish(),
});
// The docs show both shapes: `data` as the list, or `data.web` when the search has categories or sources.
const response = z.object({
  data: z.union([
    z.array(result),
    z.object({ web: z.array(result).nullish() }),
  ]),
});

/**
 * One Firecrawl search in Brazil, with each result's main text: academic pages (Wikipedia and user-upload sites left
 * out), or pt.wikipedia only. Costs 2 credits per 10 results plus 1 per page downloaded. PDFs are not parsed (they
 * would cost a credit per page): they come back without text and are dropped.
 */
export async function searchPages(
  apiKey: string,
  query: string,
  limit: number,
  wikipedia: boolean,
): Promise<Page[]> {
  const res = await fetch(SEARCH, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      limit,
      country: 'BR',
      location: 'Brazil',
      ...(wikipedia
        ? { includeDomains: ['pt.wikipedia.org'] }
        : { excludeDomains: EXCLUDED }),
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
        parsers: [],
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(
      `Firecrawl search answered HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`,
    );
  const { data } = response.parse(await res.json());
  const list = Array.isArray(data) ? data : (data.web ?? []);
  return list.flatMap((r) => {
    const markdown = r.markdown?.trim();
    if (!markdown || refusedPage(r.url)) return [];
    const title = (r.metadata?.title ?? r.title ?? new URL(r.url).hostname)
      .trim()
      .slice(0, 120);
    return [{ url: r.url, title, markdown: markdown.slice(0, PAGE_CHARS) }];
  });
}
