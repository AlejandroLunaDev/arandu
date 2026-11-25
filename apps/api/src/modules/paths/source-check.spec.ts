import { normalize, quoteIn, refusedPage } from './source-check.js';

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

describe('quoteIn', () => {
  const page =
    '# Evolução humana\n\nA **paleoantropologia** estuda os [fósseis](https://x.org/f) dos “hominídeos”.\n\n| a | b |';

  it('finds a quote despite markdown, case, spacing and curly quotes', () => {
    expect(
      quoteIn(page, 'a paleoantropologia estuda os fósseis dos "hominídeos".'),
    ).toBe(true);
    expect(quoteIn(page, 'A **paleoantropologia**  estuda')).toBe(true);
  });

  it('is false for a quote that is not on the page, or an empty one', () => {
    expect(quoteIn(page, 'a paleoantropologia estuda os planetas')).toBe(false);
    expect(quoteIn(page, ' ** ')).toBe(false);
  });
});

describe('refusedPage', () => {
  it.each([
    'https://www.scribd.com/doc/1',
    'https://br.brainly.com.br/tarefa/1',
    'https://pt.slideshare.net/x',
    'https://passeidireto.com.',
    'https://www.youtube.com/watch?v=1',
    'https://m.YouTube.com/watch?v=1',
    'https://youtu.be/1',
    'http://scielo.br/a',
    'not a url',
  ])('refuses %s', (url) => {
    expect(refusedPage(url)).toBe(true);
  });

  it.each([
    'https://www.scielo.br/j/a',
    'https://pt.wikipedia.org/wiki/Antropoceno',
  ])('accepts %s', (url) => {
    expect(refusedPage(url)).toBe(false);
  });
});
