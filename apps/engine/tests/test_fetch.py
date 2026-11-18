import hashlib
import http.client
import socket
import struct
import threading
import unittest
import urllib.error
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
            if status == "reset":  # RST instead of an answer
                self.connection.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, struct.pack("ii", 1, 0))
                self.close_connection = True
                return self.connection.close()
            if status == "short":  # promise the whole body, send half, hang up
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body[: len(body) // 2])
                self.close_connection = True
                return
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
        fetch._robots.clear()

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

    def test_data_and_headers_make_a_post_that_keeps_the_user_agent(self):
        response = mock.MagicMock(status=200, length=0, read=mock.Mock(side_effect=[BODY, b""]),
                                  __enter__=lambda self: self, __exit__=lambda *a: None)
        dest = BytesIO()
        with mock.patch.object(fetch, "allowed", return_value=True), \
                mock.patch.object(fetch.urllib.request, "urlopen", return_value=response) as urlopen:
            digest = fetch.download("http://x/q", dest, data=b"{}", headers={"X-Key": "k"})
        request = urlopen.call_args.args[0]
        self.assertEqual((request.get_method(), request.data), ("POST", b"{}"))
        self.assertEqual(request.get_header("X-key"), "k")
        self.assertEqual(request.get_header("User-agent"), fetch.USER_AGENT)
        self.assertEqual((digest, dest.getvalue()), (hashlib.sha256(BODY).hexdigest(), BODY))

    def test_without_data_the_request_is_a_get(self):
        response = mock.MagicMock(status=200, length=0, read=mock.Mock(side_effect=[b""]),
                                  __enter__=lambda self: self, __exit__=lambda *a: None)
        with mock.patch.object(fetch, "allowed", return_value=True), \
                mock.patch.object(fetch.urllib.request, "urlopen", return_value=response) as urlopen:
            fetch.download("http://x/q", BytesIO())
        self.assertEqual(urlopen.call_args.args[0].get_method(), "GET")

    def test_missing_robots_txt_means_allowed(self):
        base, _ = self.serve({"/robots.txt": [(404, b"")]})
        self.assertTrue(fetch.allowed(f"{base}/f.zip"))

    def test_robots_txt_is_read_once_per_host_for_the_whole_run(self):
        base, hits = self.serve({"/robots.txt": [(200, b"User-agent: *\nDisallow: /private")]})
        self.assertTrue(fetch.allowed(f"{base}/a"))
        self.assertTrue(fetch.allowed(f"{base}/b"))
        self.assertFalse(fetch.allowed(f"{base}/private/c"))  # the cached rules still apply
        self.assertEqual(hits, ["/robots.txt"])

    def test_a_non_200_robots_txt_such_as_a_202_challenge_means_not_allowed(self):
        base, _ = self.serve({"/robots.txt": [(202, b"challenge")], "/f.zip": [(200, BODY)]})
        self.assertFalse(fetch.allowed(f"{base}/f.zip"))
        with self.assertRaises(PermissionError):
            fetch.download(f"{base}/f.zip", BytesIO())

    def test_forbidden_robots_txt_disallows_everything(self):
        base, _ = self.serve({"/robots.txt": [(403, b"")]})
        self.assertFalse(fetch.allowed(f"{base}/f.zip"))

    def test_download_raises_on_a_non_200_response(self):
        base, _ = self.serve({"/robots.txt": [(404, b"")], "/f.zip": [(202, b"come back later")]})
        dest = BytesIO()
        with self.assertRaisesRegex(RuntimeError, "HTTP 202"):
            fetch.download(f"{base}/f.zip", dest)
        self.assertEqual(dest.getvalue(), b"")

    def test_a_reset_connection_is_retried(self):
        base, hits = self.serve({"/robots.txt": [(404, b"")], "/f.zip": [("reset", b""), (200, BODY)]})
        dest = BytesIO()
        self.assertEqual(fetch.download(f"{base}/f.zip", dest), hashlib.sha256(BODY).hexdigest())
        self.assertEqual(dest.getvalue(), BODY)
        self.assertEqual(hits.count("/f.zip"), 2)
        fetch.time.sleep.assert_called_with(5)

    def _cut_responses(self, cuts):
        """Responses for mocked _open: the first `cuts` ones send half of BODY then raise IncompleteRead, the rest are whole."""
        def response(cut):
            parts = [BODY[: len(BODY) // 2], http.client.IncompleteRead(b"")] if cut else [BODY, b""]
            return mock.MagicMock(status=200, length=0, read=mock.Mock(side_effect=parts), __enter__=lambda self: self, __exit__=lambda *a: None)

        return [response(i < cuts) for i in range(fetch.MAX_ATTEMPTS)]

    def test_a_body_cut_short_on_the_wire_restarts_the_file_without_duplicated_bytes(self):
        base, hits = self.serve({"/robots.txt": [(404, b"")], "/f.zip": [("short", BODY), (200, BODY)]})
        dest = BytesIO()
        self.assertEqual(fetch.download(f"{base}/f.zip", dest), hashlib.sha256(BODY).hexdigest())
        self.assertEqual(dest.getvalue(), BODY)
        self.assertEqual(hits.count("/f.zip"), 2)

    def test_download_gives_up_after_max_attempts_on_a_body_always_cut_short(self):
        base, hits = self.serve({"/robots.txt": [(404, b"")], "/f.zip": [("short", BODY)]})
        with self.assertRaises(http.client.IncompleteRead):
            fetch.download(f"{base}/f.zip", BytesIO())
        self.assertEqual(hits.count("/f.zip"), fetch.MAX_ATTEMPTS)

    def test_a_body_cut_short_restarts_the_file_without_duplicated_bytes(self):
        dest = BytesIO()
        with mock.patch.object(fetch, "allowed", return_value=True), mock.patch.object(
            fetch, "_open", side_effect=self._cut_responses(1)
        ) as opened:
            digest = fetch.download("http://x/f.zip", dest)
        self.assertEqual(digest, hashlib.sha256(BODY).hexdigest())
        self.assertEqual(dest.getvalue(), BODY)
        self.assertEqual(opened.call_count, 2)

    def test_download_gives_up_after_max_attempts(self):
        with mock.patch.object(fetch, "allowed", return_value=True), mock.patch.object(
            fetch, "_open", side_effect=self._cut_responses(fetch.MAX_ATTEMPTS)
        ) as opened:
            with self.assertRaises(http.client.IncompleteRead):
                fetch.download("http://x/f.zip", BytesIO())
        self.assertEqual(opened.call_count, fetch.MAX_ATTEMPTS)

    def test_open_gives_up_after_max_attempts_on_resets(self):
        base, hits = self.serve({"/robots.txt": [(404, b"")], "/f.zip": [("reset", b"")]})
        with self.assertRaises((ConnectionError, OSError)):
            fetch.download(f"{base}/f.zip", BytesIO())
        self.assertGreaterEqual(hits.count("/f.zip"), fetch.MAX_ATTEMPTS)

    def test_a_404_is_not_retried(self):
        base, hits = self.serve({"/robots.txt": [(404, b"")], "/f.zip": [(404, b"")]})
        with self.assertRaises(urllib.error.HTTPError):
            fetch.download(f"{base}/f.zip", BytesIO())
        self.assertEqual(hits.count("/f.zip"), 1)


if __name__ == "__main__":
    unittest.main()
