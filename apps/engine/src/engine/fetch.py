"""Polite HTTP shared by every adapter (ADR-0004 collection rules)."""

import hashlib
import time
import urllib.error
import urllib.request
import urllib.robotparser
from urllib.parse import urlsplit

USER_AGENT = "AranduRekaEngine/0.1 (+https://github.com/AlejandroLunaDev/arandu-reka)"
MIN_INTERVAL = 1.5  # seconds between requests to one host
RETRY_STATUSES = {429, 503}
MAX_ATTEMPTS = 5

_last_request: dict[str, float] = {}


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


def allowed(url):
    """Read the host's robots.txt, as every run must, and say whether it lets us fetch url."""
    parts = urlsplit(url)
    parser = urllib.robotparser.RobotFileParser()
    try:
        with _open(f"{parts.scheme}://{parts.netloc}/robots.txt") as response:
            parser.parse(response.read().decode("utf-8", "replace").splitlines())
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            return False  # same rule as urllib.robotparser: a forbidden robots.txt disallows everything
        if 400 <= error.code < 500:
            return True  # no robots.txt
        raise
    return parser.can_fetch(USER_AGENT, url)


def download(url, dest):
    """Stream url into the open binary file dest and return its SHA-256 hex digest."""
    if not allowed(url):
        raise PermissionError(f"robots.txt disallows {url}")
    digest = hashlib.sha256()
    with _open(url) as response:
        while chunk := response.read(1 << 20):
            digest.update(chunk)
            dest.write(chunk)
    return digest.hexdigest()
