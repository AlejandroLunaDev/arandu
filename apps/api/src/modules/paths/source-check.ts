import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

const MAX_BYTES = 3_000_000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

// The URLs come from a model's web search: never let one reach this server's own network.
const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  PRIVATE.addSubnet(net, prefix, 'ipv4');
// IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) are checked against the IPv4 ranges above by BlockList itself.
for (const [net, prefix] of [
  ['::', 127],
  ['64:ff9b::', 96],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  PRIVATE.addSubnet(net, prefix, 'ipv6');

export function isPrivateAddress(address: string, family: number): boolean {
  return PRIVATE.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

/**
 * The DNS lookup the connection itself uses: it refuses a name with any private address, so the address checked is
 * the address connected to (no DNS rebinding between a check and the request).
 */
export const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    const list = addresses as unknown as LookupAddress[];
    if (error) return callback(error, '', 0);
    if (!list.length || list.some((a) => isPrivateAddress(a.address, a.family)))
      return callback(
        Object.assign(new Error(`${hostname} is not public`), {
          code: 'ENOTFOUND',
        }),
        '',
        0,
      );
    if (options.all)
      return (callback as unknown as (e: null, a: LookupAddress[]) => void)(
        null,
        list,
      );
    callback(null, list[0].address, list[0].family);
  });
};

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

interface Page {
  status: number;
  location: string | undefined;
  /** Null unless the status is 2xx. Cut at MAX_BYTES. */
  body: string | null;
}

/**
 * The body as text, in the charset the server names (header, else the page's meta tag): many Brazilian pages are
 * ISO-8859-1, and read as UTF-8 their accents break every quote. Unknown or missing charsets read as UTF-8.
 */
export function decode(body: Buffer, contentType: string | undefined): string {
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(
      body.subarray(0, 4096).toString('latin1'),
    )?.[1];
  try {
    return new TextDecoder(charset ?? 'utf-8').decode(body);
  } catch {
    return body.toString('utf8');
  }
}

/** One GET, without following redirects. */
export function get(url: URL): Promise<Page> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        lookup: publicLookup,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': 'AranduBot/1.0 (source check)' },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status, location, body: null });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        const done = () =>
          resolve({
            status,
            location,
            body: decode(Buffer.concat(chunks), res.headers['content-type']),
          });
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.destroy();
            return done();
          }
          chunks.push(chunk);
        });
        res.on('end', done);
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/** Sites of documents uploaded by users, Wikipedia (anyone edits it) and placeholder domains: never a source.
 * Tested on every hop's host, so a redirect, a `user@` prefix or a trailing dot does not get around it. */
const REFUSED_HOST =
  /^([a-z0-9-]+\.)*(scribd\.com|passeidireto\.com|brainly\.[a-z.]+|studocu\.com|slideshare\.net|wikipedia\.org|example\.(com|org|net))\.?$/i;

async function fetchText(url: string): Promise<string | null> {
  let current = new URL(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // URL keeps an IPv6 literal's brackets ("[::1]"). Literals skip the lookup, so they are refused here.
    const host = current.hostname.replace(/^\[|\]$/g, '');
    if (
      current.protocol !== 'https:' ||
      isIP(host) ||
      host === 'localhost' ||
      REFUSED_HOST.test(host)
    )
      return null;
    const page = await get(current);
    if (page.status >= 300 && page.status < 400) {
      if (!page.location) return null;
      current = new URL(page.location, current);
      continue;
    }
    return page.body;
  }
  return null;
}

/** True when the page at `url` holds `quote` word for word (case, spacing and quote marks aside). */
export async function quoteIsOnPage(
  url: string,
  quote: string,
): Promise<boolean> {
  try {
    const page = await fetchText(url);
    return page !== null && normalize(page).includes(normalize(quote));
  } catch {
    return false;
  }
}
