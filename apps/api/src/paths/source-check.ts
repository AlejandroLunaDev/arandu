import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

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
  ['192.168.0.0', 16],
] as const)
  PRIVATE.addSubnet(net, prefix, 'ipv4');
// IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) are checked against the IPv4 ranges above by BlockList itself.
for (const [net, prefix] of [
  ['::', 127],
  ['fc00::', 7],
  ['fe80::', 10],
] as const)
  PRIVATE.addSubnet(net, prefix, 'ipv6');

async function isPublicHost(hostname: string): Promise<boolean> {
  // URL keeps an IPv6 literal's brackets ("[::1]").
  if (isIP(hostname.replace(/^\[|\]$/g, '')) || hostname === 'localhost')
    return false;
  const addresses = await lookup(hostname, { all: true });
  return addresses.every(
    (a) => !PRIVATE.check(a.address, a.family === 6 ? 'ipv6' : 'ipv4'),
  );
}

/** The page's visible text, lower case, one space between words, quotes and dashes made plain. */
export function normalize(text: string): string {
  return text
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
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
    .trim();
}

async function fetchText(url: string): Promise<string | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== 'https:' || !(await isPublicHost(parsed.hostname)))
      return null;
    const response = await fetch(parsed, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'AranduBot/1.0 (source check)' },
    });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      if (!next) return null;
      current = new URL(next, parsed).toString();
      continue;
    }
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
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
