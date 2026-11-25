"""HTTP shared by every adapter: pages and files come through Firecrawl's scraper, as their original bytes."""

import base64
import hashlib
import http.client
import json
import os
import ssl
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

import certifi

USER_AGENT = "AranduEngine/0.1 (+https://github.com/AlejandroLunaDev/arandu)"
MIN_INTERVAL = 1.5  # seconds between requests to one host
RETRY_STATUSES = {429, 503}
MAX_ATTEMPTS = 5
TRANSIENT = (urllib.error.URLError, ConnectionError, TimeoutError)  # resets and timeouts: worth another try
FIRECRAWL = "https://api.firecrawl.dev/v2/scrape"
# The scraper only, never its AI: rawBase64 is the document as the server sent it, and no parser runs on a PDF (one
# credit a document). Its timeout stays under _open's 60 s socket timeout.
SCRAPE = {"formats": ["rawBase64"], "parsers": [], "maxAge": 0, "timeout": 50000}

# The system's roots plus Mozilla's: Windows loads some roots only on demand, so Python misses them (fuvest.br's Actalis).
_TLS = ssl.create_default_context()
_TLS.load_verify_locations(certifi.where())

_last_request: dict[str, float] = {}


def _open(url, data=None, headers=None):
    host = urlsplit(url).netloc
    for attempt in range(MAX_ATTEMPTS):
        wait = _last_request.get(host, 0) + MIN_INTERVAL - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _last_request[host] = time.monotonic()
        try:
            request = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT, **(headers or {})})
            return urllib.request.urlopen(request, timeout=60, context=_TLS)
        except urllib.error.HTTPError as error:
            if error.code not in RETRY_STATUSES or attempt == MAX_ATTEMPTS - 1:
                raise
            retry_after = error.headers.get("Retry-After", "")
            time.sleep(int(retry_after) if retry_after.isdigit() else 5 * 2**attempt)
        except TRANSIENT:
            if attempt == MAX_ATTEMPTS - 1:
                raise
            time.sleep(5 * 2**attempt)


def download(url, dest, data=None, headers=None):
    """Write url's original bytes into the open binary file dest and return their SHA-256 hex digest.

    A plain GET goes through Firecrawl's scraper (FIRECRAWL_API_KEY). A POST or custom headers go direct: the scraper
    only makes plain GETs.
    """
    if data is not None or headers:
        return download_direct(url, dest, data, headers)
    auth = {"Authorization": f"Bearer {os.environ['FIRECRAWL_API_KEY']}", "Content-Type": "application/json"}
    with _open(FIRECRAWL, json.dumps({"url": url, **SCRAPE}).encode(), auth) as response:
        page = json.load(response).get("data") or {}
    status = (page.get("metadata") or {}).get("statusCode")
    if status != 200 or "rawBase64" not in page:
        # The error a direct fetch raises, so the adapters that skip a dead link (404, 410) still do.
        raise urllib.error.HTTPError(url, status if status and status != 200 else 502,f"answered HTTP {status} through Firecrawl", None, None)
    content = base64.b64decode(page["rawBase64"])
    dest.seek(0)
    dest.truncate()
    dest.write(content)
    return hashlib.sha256(content).hexdigest()


def download_direct(url, dest, data=None, headers=None):
    """Stream url into the open binary file dest and return its SHA-256 hex digest. data makes it a POST.

    For what the scraper cannot carry: a POST, custom headers, or a file as large as the census ZIP (450 MB).
    """
    for attempt in range(MAX_ATTEMPTS):
        digest = hashlib.sha256()
        dest.seek(0)
        dest.truncate()
        try:
            with _open(url, data, headers) as response:
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
