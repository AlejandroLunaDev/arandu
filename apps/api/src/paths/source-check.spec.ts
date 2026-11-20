import { lookup } from 'node:dns/promises';
import { normalize, quoteIsOnPage } from './source-check.js';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

const html = (body: string) => new Response(`<html>${body}</html>`);

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
});

describe('quoteIsOnPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(lookup).mockReset();
    vi.mocked(lookup).mockResolvedValue([
      { address: '2606:2800:220:1::1946', family: 6 },
    ] as never);
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('finds a quote despite case, markup and curly quotes', async () => {
    fetchMock.mockResolvedValue(html('<p>O “Cálculo”   é <i>ótimo</i></p>'));

    await expect(
      quoteIsOnPage('https://a.org/x', 'o "cálculo" é ótimo'),
    ).resolves.toBe(true);
  });

  it('treats a public IPv4 host as public', async () => {
    vi.mocked(lookup).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ] as never);
    fetchMock.mockResolvedValue(html('hello'));

    await expect(quoteIsOnPage('https://a.org/x', 'hello')).resolves.toBe(true);
  });

  it('is false when the quote is not on the page', async () => {
    fetchMock.mockResolvedValue(html('<p>nada</p>'));

    await expect(quoteIsOnPage('https://a.org/x', 'outra coisa')).resolves.toBe(
      false,
    );
  });

  it.each([
    ['http', 'http://a.org/x'],
    ['localhost', 'https://localhost/x'],
    ['an IPv4 literal', 'https://8.8.8.8/x'],
  ])('refuses %s without fetching', async (_, url) => {
    await expect(quoteIsOnPage(url, 'a')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a bracketed IPv6 literal without any DNS lookup', async () => {
    await expect(quoteIsOnPage('https://[::1]/', 'a')).resolves.toBe(false);
    expect(lookup).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['10.0.0.5', 4],
    ['127.0.0.1', 4],
    ['169.254.169.254', 4],
    ['192.168.1.1', 4],
    ['fc00::1', 6],
    ['::ffff:10.0.0.1', 6],
  ])('refuses a host that resolves to %s', async (address, family) => {
    vi.mocked(lookup).mockResolvedValue([{ address, family }] as never);

    await expect(quoteIsOnPage('https://evil.org/x', 'a')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses when any resolved address is private', async () => {
    vi.mocked(lookup).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ] as never);

    await expect(quoteIsOnPage('https://evil.org/x', 'a')).resolves.toBe(false);
  });

  it('follows a redirect manually', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/b' } }),
      )
      .mockResolvedValueOnce(html('hello'));

    await expect(quoteIsOnPage('https://a.org/x', 'hello')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
  });

  it('refuses a redirect to a private or non-https address', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://127.0.0.1/secret' },
      }),
    );
    await expect(quoteIsOnPage('https://a.org/x', 'a')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'http://a.org/y' },
      }),
    );
    await expect(quoteIsOnPage('https://a.org/x', 'a')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after 3 redirects', async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(null, { status: 302, headers: { location: '/loop' } }),
    );

    await expect(quoteIsOnPage('https://a.org/x', 'a')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('is false on a failed response or a network error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('no', { status: 404 }));
    await expect(quoteIsOnPage('https://a.org/x', 'no')).resolves.toBe(false);

    fetchMock.mockRejectedValueOnce(new Error('boom'));
    await expect(quoteIsOnPage('https://a.org/x', 'a')).resolves.toBe(false);
  });
});
