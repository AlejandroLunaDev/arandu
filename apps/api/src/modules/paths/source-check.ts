/** Checks a card's quote against the text of the page it cites, as Firecrawl downloaded it for the model. */

const MARKS: Record<string, string> = {
  acute: '́',
  grave: '̀',
  circ: '̂',
  tilde: '̃',
  uml: '̈',
  cedil: '̧',
};

/** The page's visible text, lower case, one space between words, quotes and dashes made plain. */
export function normalize(text: string): string {
  return (
    text
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      // Accented letters written as entities (Tr&ecirc;s, &#227;, &#xE7;): NFC below joins letter and mark.
      .replace(
        /&([a-z])(acute|grave|circ|tilde|uml|cedil);/gi,
        (_, letter: string, mark: string) => letter + MARKS[mark.toLowerCase()],
      )
      .replace(
        /&#(\d+);|&#x([0-9a-f]+);/gi,
        (entity, dec?: string, hex?: string) => {
          const code = dec ? Number(dec) : parseInt(hex!, 16);
          return code > 0 && code <= 0x10ffff
            ? String.fromCodePoint(code)
            : entity;
        },
      )
      .replace(/&ordf;/g, 'ª')
      .replace(/&ordm;/g, 'º')
      .replace(/&hellip;/g, '...')
      .replace(/&ndash;|&mdash;/g, '-')
      .replace(/&laquo;|&raquo;/g, '"')
      .replace(/&nbsp;|&#160;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;|&#34;|&ldquo;|&rdquo;/g, '"')
      .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
      .replace(/[“”«»]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, '-')
      .normalize('NFC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Markdown down to its words: a link or image keeps its text; emphasis, heading, code and table marks go. */
export function plain(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|]+/g, ' ');
}

/** True when the page's text holds `quote` word for word (case, spacing, markdown and quote marks aside). */
export function quoteIn(page: string, quote: string): boolean {
  const needle = normalize(plain(quote));
  return needle.length > 0 && normalize(plain(page)).includes(needle);
}

/**
 * Never a source, whatever a search returns: sites of documents users upload, videos and social networks (a page
 * of comments or a transcript, not a text that explains), and placeholder domains. A subdomain counts as its site.
 */
export const REFUSED_SITES = [
  'scribd.com',
  'passeidireto.com',
  'brainly.com',
  'brainly.com.br',
  'studocu.com',
  'slideshare.net',
  'youtube.com',
  'youtu.be',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'example.com',
  'example.org',
  'example.net',
  // A search can return Google's own redirect links (google.com/goto?url=...): the page behind one is unknown, even a video.
  'google.com',
];

/** True for a page that may not be a source: not https, or on a refused site. */
export function refusedPage(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    const host = hostname.toLowerCase().replace(/\.$/, '');
    return (
      protocol !== 'https:' ||
      REFUSED_SITES.some((site) => host === site || host.endsWith(`.${site}`))
    );
  } catch {
    return true;
  }
}
