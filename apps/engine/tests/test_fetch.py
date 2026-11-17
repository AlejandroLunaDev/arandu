import hashlib
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from io import BytesIO
from unittest import mock

from engine import fetch

BODY = b"census bytes" * 1000


def serve(routes):
    """routes: path -> list of (status, body) answered in order, the last one repeating. Returns (server, hits)."""
    hits = []

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            hits.append(self.path)
            queue = routes.get(self.path, [(404, b"")])
            status, body = queue.pop(0) if len(queue) > 1 else queue[0]
            self.send_response(status)
            if status == 503:
                self.send_header("Retry-After", "0")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, hits


class FetchTest(unittest.TestCase):
    def serve(self, routes):
        server, hits = serve(routes)
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        return f"http://127.0.0.1:{server.server_port}", hits

    def setUp(self):
        for patcher in (mock.patch.object(fetch, "MIN_INTERVAL", 0), mock.patch.object(fetch.time, "sleep")):
            patcher.start()
            self.addCleanup(patcher.stop)
        fetch._last_request.clear()

    def test_robots_disallow_raises_before_downloading(self):
        base, hits = self.serve({"/robots.txt": [(200, b"User-agent: *\nDisallow: /")], "/f.zip": [(200, BODY)]})
        with self.assertRaises(PermissionError):
            fetch.download(f"{base}/f.zip", BytesIO())
        self.assertEqual(hits, ["/robots.txt"])

    def test_retries_503_and_returns_the_body_digest(self):
        base, hits = self.serve({"/robots.txt": [(404, b"")], "/f.zip": [(503, b""), (200, BODY)]})
        dest = BytesIO()
        digest = fetch.download(f"{base}/f.zip", dest)
        self.assertEqual(digest, hashlib.sha256(BODY).hexdigest())
        self.assertEqual(dest.getvalue(), BODY)
        self.assertEqual(hits.count("/f.zip"), 2)

    def test_missing_robots_txt_means_allowed(self):
        base, _ = self.serve({"/robots.txt": [(404, b"")]})
        self.assertTrue(fetch.allowed(f"{base}/f.zip"))


if __name__ == "__main__":
    unittest.main()
