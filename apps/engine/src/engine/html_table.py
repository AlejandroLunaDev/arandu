"""Table rows out of an HTML page, with the standard library only (ADR-0003)."""

from html.parser import HTMLParser


class _Rows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self._open = []  # one list of cells per <tr> still open; tables nest

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._open.append([])
        elif tag in ("td", "th") and self._open:
            self._open[-1].append(["", None])
        elif tag == "a" and self._open and self._open[-1] and self._open[-1][-1][1] is None:
            self._open[-1][-1][1] = dict(attrs).get("href")

    def handle_endtag(self, tag):
        if tag == "tr" and self._open:
            self.rows.append([(" ".join(text.split()), href) for text, href in self._open.pop()])

    def handle_data(self, data):
        if self._open and self._open[-1]:
            self._open[-1][-1][0] += data


def rows(html):
    """Every <tr> as a list of (text, first link href) per cell, inner tables before the row that holds them."""
    parser = _Rows()
    parser.feed(html)
    parser.close()
    return parser.rows
