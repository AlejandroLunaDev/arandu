import { lookup } from 'node:dns';
import { EventEmitter } from 'node:events';
import { request } from 'node:https';
import { Readable } from 'node:stream';
import {
  isPrivateAddress,
  normalize,
  publicLookup,
  quoteIsOnPage,
} from './source-check.js';

vi.mock('node:dns', () => ({ lookup: vi.fn() }));
vi.mock('node:https', () => ({ request: vi.fn() }));

describe('normalize', () => {
  it('drops tags, script and style, and keeps the visible words', () => {
    expect(
      normalize(
        '<style>p{color:red}</style><script>var a="x"</script><p>Hello <b>World</b></p>',
      ),
    ).toBe('hello world');
  });

  it('makes entities, curly quotes, dashes, case and spacing plain', () => {
    expect(normalize('A &amp; B&nbsp;&nbsp;“Oi”\n\n‘x’ – y — z')).toBe(
      'a & b "oi" \'x\' - y - z',
    );
    expect(normalize('&quot;a&quot; &rsquo;b&rsquo;')).toBe('"a" \'b\'');
  });

  it('decodes accent entities so the sentence equals the plain one', () => {
    const plain = 'Três ações da Ciência: a Única, o Órgão, ç, ü, à, ã';
    const encoded =
      'Tr&ecirc;s a&ccedil;&otilde;es da Ci&ecirc;ncia: a &Uacute;nica, o &Oacute;rg&atilde;o, &ccedil;, &uuml;, &agrave;, &atilde;';
    expect(normalize(encoded)).toBe(normalize(plain));
    expect(normalize('&Aacute;gua')).toBe('água');
  });

  it('decodes decimal and hex numeric entities', () => {
    expect(normalize('a&#227;o &#xE7;&#XC7; &#233;')).toBe('aão çç é');
    expect(normalize('&#227;')).toBe(normalize('ã'));
  });

  it('leaves out-of-range numeric entities as they are', () => {
    expect(normalize('&#0;')).toBe('&#0;');
    expect(normalize('&#99999999;')).toBe('&#99999999;');
    expect(normalize('&#x110000;')).toBe('&#x110000;');
  });

  it('decodes ordinals, ellipsis, dashes and guillemets', () => {
    expect(
      normalize('1&ordf; e 2&ordm; &hellip; a&ndash;b&mdash;c &laquo;x&raquo;'),
    ).toBe('1ª e 2º ... a-b-c "x"');
  });
});

describe('isPrivateAddress', () => {
  it.each([
    ['10.0.0.5', 4],
    ['127.0.0.1', 4],
    ['169.254.169.254', 4],
    ['172.16.0.1', 4],
    ['192.0.0.1', 4],
    ['192.168.1.1', 4],
    ['198.18.0.1', 4],
    ['224.0.0.1', 4],
    ['240.0.0.1', 4],
    ['::1', 6],
    ['fc00::1', 6],
    ['fe80::1', 6],
    ['ff02::1', 6],
    ['64:ff9b::a00:1', 6],
    ['2002:a00:1::', 6],
    ['::ffff:10.0.0.1', 6],
  ])('blocks %s', (address, family) => {
    expect(isPrivateAddress(address, family)).toBe(true);
  });

  it.each([
    ['93.184.216.34', 4],
    ['8.8.8.8', 4],
    ['2606:2800:220:1::1946', 6],
    ['::ffff:93.184.216.34', 6],
  ])('allows %s', (address, family) => {
    expect(isPrivateAddress(address, family)).toBe(false);
  });
});

type Answer = [string, number];

describe('publicLookup', () => {
  const answer = (...addresses: Answer[]) =>
    vi.mocked(lookup).mockImplementation(((
      _host: string,
      _options: unknown,
      callback: (...args: unknown[]) => void,
    ) =>
      callback(
        null,
        addresses.map(([address, family]) => ({ address, family })),
      )) as never);
  const call = (all: boolean) =>
    new Promise<unknown[]>((resolve) =>
      (publicLookup as (...args: unknown[]) => void)(
        'a.org',
        { all },
        (...args: unknown[]) => resolve(args),
      ),
    );

  it('always asks DNS for every address', async () => {
    answer(['93.184.216.34', 4]);

    await call(false);

    expect(vi.mocked(lookup).mock.calls[0][1]).toMatchObject({ all: true });
  });

  it('answers a single address when all is false', async () => {
    answer(['93.184.216.34', 4], ['2606:2800:220:1::1946', 6]);

    await expect(call(false)).resolves.toEqual([null, '93.184.216.34', 4]);
  });

  it('answers every address when all is true', async () => {
    answer(['93.184.216.34', 4], ['2606:2800:220:1::1946', 6]);

    await expect(call(true)).resolves.toEqual([
      null,
      [
        { address: '93.184.216.34', family: 4 },
        { address: '2606:2800:220:1::1946', family: 6 },
      ],
    ]);
  });

  it.each([
    ['one private address', [['10.0.0.1', 4]]],
    [
      'a private address among public ones',
      [
        ['93.184.216.34', 4],
        ['169.254.169.254', 4],
      ],
    ],
    ['no address', []],
  ])('fails with ENOTFOUND for %s', async (_, addresses) => {
    answer(...(addresses as Answer[]));

    const [error] = await call(false);

    expect(error).toMatchObject({ code: 'ENOTFOUND' });
  });

  it('passes a DNS error through', async () => {
    const failure = new Error('boom');
    vi.mocked(lookup).mockImplementation(((
      _host: string,
      _options: unknown,
      callback: (...args: unknown[]) => void,
    ) => callback(failure)) as never);

    await expect(call(false)).resolves.toEqual([failure, '', 0]);
  });
});

describe('quoteIsOnPage', () => {
  type Reply = { status: number; location?: string; body?: string } | Error;
  let replies: Reply[];

  // Stands in for node:https: each request gets the next reply.
  beforeEach(() => {
    replies = [];
    vi.mocked(lookup).mockReset();
    vi.mocked(request).mockReset();
    vi.mocked(request).mockImplementation(((
      _url: URL,
      _options: unknown,
      onResponse: (res: Readable) => void,
    ) => {
      const req = new EventEmitter() as EventEmitter & { end: () => void };
      req.end = () => {
        const reply = replies.shift() ?? { status: 404 };
        if (reply instanceof Error) {
          req.emit('error', reply);
          return;
        }
        onResponse(
          Object.assign(Readable.from([Buffer.from(reply.body ?? '')]), {
            statusCode: reply.status,
            headers: { location: reply.location },
          }),
        );
      };
      return req;
    }) as never);
  });

  const urls = () => vi.mocked(request).mock.calls.map((c) => String(c[0]));

  it('finds a quote despite case, markup and curly quotes', async () => {
    replies = [{ status: 200, body: '<p>O “Cálculo”   é <i>ótimo</i></p>' }];

    await expect(
      quoteIsOnPage('https://a.org/x', 'o "cálculo" é ótimo'),
    ).resolves.toBe(true);
  });

  it('finds an entity-encoded quote against the plain text', async () => {
    replies = [{ status: 200, body: '<p>Tr&ecirc;s a&ccedil;&#245;es</p>' }];

    await expect(quoteIsOnPage('https://a.org/x', 'Três ações')).resolves.toBe(
      true,
    );
  });

  it.each([
    'https://scribd.com/doc/1',
    'https://www.scribd.com/doc/1',
    'https://pt.passeidireto.com/arquivo/1',
    'https://brainly.com.br/tarefa/1',
    'https://brainly.com/question/1',
    'https://brainly.lat/tarea/1',
    'https://www.studocu.com/pt-br/x',
    'https://example.com/x',
    'https://a.example.org/x',
    'https://example.net',
    'https://scribd.com:443/x',
    'https://scribd.com?x=1',
    'https://scribd.com#top',
    'HTTPS://SCRIBD.COM/x',
  ])('refuses %s without any request', async (url) => {
    await expect(quoteIsOnPage(url, 'a')).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    'https://notscribd.com/x',
    'https://scribd.com.evil.org/x',
    'https://a.org/scribd.com/x',
    'https://a.org/?u=brainly.com.br',
    'https://myexample.com/x',
    'https://brainlyx.com/x',
  ])('does not refuse %s by host', async (url) => {
    replies = [{ status: 200, body: 'hello' }];

    await expect(quoteIsOnPage(url, 'hello')).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('connects through publicLookup', async () => {
    replies = [{ status: 200, body: 'hello' }];

    await quoteIsOnPage('https://a.org/x', 'hello');

    expect(vi.mocked(request).mock.calls[0][1]).toMatchObject({
      lookup: publicLookup,
    });
  });

  it('is false when the quote is not on the page', async () => {
    replies = [{ status: 200, body: '<p>nada</p>' }];

    await expect(quoteIsOnPage('https://a.org/x', 'outra coisa')).resolves.toBe(
      false,
    );
  });

  it.each([
    ['http', 'http://a.org/x'],
    ['localhost', 'https://localhost/x'],
    ['an IPv4 literal', 'https://8.8.8.8/x'],
    ['a bracketed IPv6 literal', 'https://[::1]/'],
    ['a bracketed public IPv6 literal', 'https://[2606:2800:220:1::1946]/'],
  ])('refuses %s without any request', async (_, url) => {
    await expect(quoteIsOnPage(url, 'a')).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('follows a redirect, resolving a relative location', async () => {
    replies = [
      { status: 302, location: '/b' },
      { status: 200, body: 'hello' },
    ];

    await expect(quoteIsOnPage('https://a.org/x', 'hello')).resolves.toBe(true);
    expect(urls()).toEqual(['https://a.org/x', 'https://a.org/b']);
  });

  it.each([
    ['an IPv4 literal', 'https://127.0.0.1/secret'],
    ['a bracketed IPv6 literal', 'https://[::1]/secret'],
    ['localhost', 'https://localhost/secret'],
    ['http', 'http://a.org/y'],
  ])('refuses a redirect to %s', async (_, location) => {
    replies = [
      { status: 302, location },
      { status: 200, body: 'a' },
    ];

    await expect(quoteIsOnPage('https://a.org/x', 'a')).resolves.toBe(false);
    expect(urls()).toEqual(['https://a.org/x']);
  });

  it('refuses a redirect without a location', async () => {
    replies = [{ status: 302 }];

    await expect(quoteIsOnPage('https://a.org/x', 'a')).resolves.toBe(false);
  });

  it('gives up after 3 redirects', async () => {
    replies = Array(5).fill({ status: 302, location: '/loop' });

    await expect(quoteIsOnPage('https://a.org/x', 'a')).resolves.toBe(false);
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('is false on a failed response or a network error', async () => {
    replies = [{ status: 404, body: 'no' }];
    await expect(quoteIsOnPage('https://a.org/x', 'no')).resolves.toBe(false);

    replies = [new Error('ENOTFOUND')];
    await expect(quoteIsOnPage('https://a.org/x', 'a')).resolves.toBe(false);
  });

  it('reads only the first 3 MB of a page', async () => {
    replies = [{ status: 200, body: 'a'.repeat(3_000_001) + ' needle' }];

    await expect(quoteIsOnPage('https://a.org/x', 'needle')).resolves.toBe(
      false,
    );
  });
});
