"""Polite HTTP shared by every adapter (ADR-0004 collection rules)."""

import hashlib
import http.client
import time
import urllib.error
import urllib.request
import urllib.robotparser
from urllib.parse import urlsplit

USER_AGENT = "AranduRekaEngine/0.1 (+https://github.com/AlejandroLunaDev/arandu-reka)"
MIN_INTERVAL = 1.5  # seconds between requests to one host
RETRY_STATUSES = {429, 503}
MAX_ATTEMPTS = 5
TRANSIENT = (urllib.error.URLError, ConnectionError, TimeoutError)  # resets and timeouts: worth another try

_last_request: dict[str, float] = {}
_robots: dict[str, urllib.robotparser.RobotFileParser | bool] = {}  # per host, read once per run


def _open(url):
    host = urlsplit(url).netloc
    for attempt in range(MAX_ATTEMPTS):
        wait = _last_request.get(host, 0) + MIN_INTERVAL - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _last_request[host] = time.monotonic()
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": USER_AGENT}), timeout=60)
        except urllib.error.HTTPError as error:
            if error.code not in RETRY_STATUSES or attempt == MAX_ATTEMPTS - 1:
                raise
            retry_after = error.headers.get("Retry-After", "")
            time.sleep(int(retry_after) if retry_after.isdigit() else 5 * 2**attempt)
        except TRANSIENT:
            if attempt == MAX_ATTEMPTS - 1:
                raise
            time.sleep(5 * 2**attempt)


def _read_robots(base):
    parser = urllib.robotparser.RobotFileParser()
    try:
        with _open(f"{base}/robots.txt") as response:
            if response.status != 200:
                return False  # e.g. a 202 bot challenge: the host's rules can't be read, so don't fetch
            parser.parse(response.read().decode("utf-8", "replace").splitlines())
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            return False  # same rule as urllib.robotparser: a forbidden robots.txt disallows everything
        if 400 <= error.code < 500:
            return True  # no robots.txt
        raise
    return parser


def allowed(url):
    """Read the host's robots.txt once per run, as every run must, and say whether it lets us fetch url."""
    parts = urlsplit(url)
    base = f"{parts.scheme}://{parts.netloc}"
    if base not in _robots:
        _robots[base] = _read_robots(base)
    rules = _robots[base]
    return rules if isinstance(rules, bool) else rules.can_fetch(USER_AGENT, url)


def download(url, dest):
    """Stream url into the open binary file dest and return its SHA-256 hex digest."""
    if not allowed(url):
        raise PermissionError(f"robots.txt disallows {url}")
    for attempt in range(MAX_ATTEMPTS):
        digest = hashlib.sha256()
        dest.seek(0)
        dest.truncate()
        try:
            with _open(url) as response:
                if response.status != 200:
                    raise RuntimeError(f"{url} answered HTTP {response.status} instead of the document")
                while chunk := response.read(1 << 20):
                    digest.update(chunk)
                    dest.write(chunk)
                if response.length:  # bytes still owed by Content-Length: read(amt) ends quietly on a cut body
                    raise http.client.IncompleteRead(b"", response.length)
            return digest.hexdigest()
        except (ConnectionError, TimeoutError, http.client.IncompleteRead):  # cut mid-download: start over
            if attempt == MAX_ATTEMPTS - 1:
                raise
            time.sleep(5 * 2**attempt)
