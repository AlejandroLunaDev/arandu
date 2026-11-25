import base64
import hashlib
import http.client
import json
import os
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


    def test_retries_503_and_returns_the_body_digest(self):
        base, hits = self.serve({"/f.zip": [(503, b""), (200, BODY)]})
        dest = BytesIO()
        digest = fetch.download_direct(f"{base}/f.zip", dest)
        self.assertEqual(digest, hashlib.sha256(BODY).hexdigest())
        self.assertEqual(dest.getvalue(), BODY)
        self.assertEqual(hits.count("/f.zip"), 2)

    def test_data_and_headers_make_a_post_that_keeps_the_user_agent(self):
        response = mock.MagicMock(status=200, length=0, read=mock.Mock(side_effect=[BODY, b""]),
                                  __enter__=lambda self: self, __exit__=lambda *a: None)
        dest = BytesIO()
        with mock.patch.object(fetch.urllib.request, "urlopen", return_value=response) as urlopen:
            digest = fetch.download_direct("http://x/q", dest, data=b"{}", headers={"X-Key": "k"})
        request = urlopen.call_args.args[0]
        self.assertEqual((request.get_method(), request.data), ("POST", b"{}"))
        self.assertEqual(request.get_header("X-key"), "k")
        self.assertEqual(request.get_header("User-agent"), fetch.USER_AGENT)
        self.assertEqual((digest, dest.getvalue()), (hashlib.sha256(BODY).hexdigest(), BODY))

    def test_without_data_the_request_is_a_get(self):
        response = mock.MagicMock(status=200, length=0, read=mock.Mock(side_effect=[b""]),
                                  __enter__=lambda self: self, __exit__=lambda *a: None)
        with mock.patch.object(fetch.urllib.request, "urlopen", return_value=response) as urlopen:
            fetch.download_direct("http://x/q", BytesIO())
        self.assertEqual(urlopen.call_args.args[0].get_method(), "GET")

    def test_requests_use_the_tls_context_with_certifi_roots(self):
        response = mock.MagicMock(status=200, length=0, read=mock.Mock(side_effect=[b""]),
                                  __enter__=lambda self: self, __exit__=lambda *a: None)
        with mock.patch.object(fetch.urllib.request, "urlopen", return_value=response) as urlopen:
            fetch.download_direct("https://x/q", BytesIO())
        self.assertIs(urlopen.call_args.kwargs["context"], fetch._TLS)
        names = {v for cert in fetch._TLS.get_ca_certs() for rdn in cert["subject"] for k, v in rdn if k == "commonName"}
        self.assertIn("Actalis Authentication Root CA", names)  # fuvest.br's root, which Windows loads only on demand
        self.assertGreater(len(fetch._TLS.get_ca_certs()), len(fetch.ssl.create_default_context().get_ca_certs()))





    def test_download_raises_on_a_non_200_response(self):
        base, _ = self.serve({"/f.zip": [(202, b"come back later")]})
        dest = BytesIO()
        with self.assertRaisesRegex(RuntimeError, "HTTP 202"):
            fetch.download_direct(f"{base}/f.zip", dest)
        self.assertEqual(dest.getvalue(), b"")

    def test_a_reset_connection_is_retried(self):
        base, hits = self.serve({"/f.zip": [("reset", b""), (200, BODY)]})
        dest = BytesIO()
        self.assertEqual(fetch.download_direct(f"{base}/f.zip", dest), hashlib.sha256(BODY).hexdigest())
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
        base, hits = self.serve({"/f.zip": [("short", BODY), (200, BODY)]})
        dest = BytesIO()
        self.assertEqual(fetch.download_direct(f"{base}/f.zip", dest), hashlib.sha256(BODY).hexdigest())
        self.assertEqual(dest.getvalue(), BODY)
        self.assertEqual(hits.count("/f.zip"), 2)

    def test_download_gives_up_after_max_attempts_on_a_body_always_cut_short(self):
        base, hits = self.serve({"/f.zip": [("short", BODY)]})
        with self.assertRaises(http.client.IncompleteRead):
            fetch.download_direct(f"{base}/f.zip", BytesIO())
        self.assertEqual(hits.count("/f.zip"), fetch.MAX_ATTEMPTS)

    def test_a_body_cut_short_restarts_the_file_without_duplicated_bytes(self):
        dest = BytesIO()
        with mock.patch.object(
            fetch, "_open", side_effect=self._cut_responses(1)
        ) as opened:
            digest = fetch.download_direct("http://x/f.zip", dest)
        self.assertEqual(digest, hashlib.sha256(BODY).hexdigest())
        self.assertEqual(dest.getvalue(), BODY)
        self.assertEqual(opened.call_count, 2)

    def test_download_gives_up_after_max_attempts(self):
        with mock.patch.object(
            fetch, "_open", side_effect=self._cut_responses(fetch.MAX_ATTEMPTS)
        ) as opened:
            with self.assertRaises(http.client.IncompleteRead):
                fetch.download_direct("http://x/f.zip", BytesIO())
        self.assertEqual(opened.call_count, fetch.MAX_ATTEMPTS)

    def test_open_gives_up_after_max_attempts_on_resets(self):
        base, hits = self.serve({"/f.zip": [("reset", b"")]})
        with self.assertRaises((ConnectionError, OSError)):
            fetch.download_direct(f"{base}/f.zip", BytesIO())
        self.assertGreaterEqual(hits.count("/f.zip"), fetch.MAX_ATTEMPTS)

    def test_a_404_is_not_retried(self):
        base, hits = self.serve({"/f.zip": [(404, b"")]})
        with self.assertRaises(urllib.error.HTTPError):
            fetch.download_direct(f"{base}/f.zip", BytesIO())
        self.assertEqual(hits.count("/f.zip"), 1)


class DownloadTest(unittest.TestCase):
    URL = "https://example.org/ementa.pdf"

    def setUp(self):
        patcher = mock.patch.dict(os.environ, {"FIRECRAWL_API_KEY": "fc-secret"})
        patcher.start()
        self.addCleanup(patcher.stop)

    def scrape(self, payload):
        return mock.patch.object(fetch, "_open", return_value=BytesIO(json.dumps(payload).encode()))

    def test_writes_the_original_bytes_and_returns_their_sha256(self):
        ok = {"data": {"metadata": {"statusCode": 200}, "rawBase64": base64.b64encode(BODY).decode()}}
        dest = BytesIO(b"stale leftovers" * 1000)
        with self.scrape(ok):
            digest = fetch.download(self.URL, dest)
        self.assertEqual((digest, dest.getvalue()), (hashlib.sha256(BODY).hexdigest(), BODY))

    def test_posts_the_scrape_request_to_firecrawl_with_the_bearer_key(self):
        ok = {"data": {"metadata": {"statusCode": 200}, "rawBase64": base64.b64encode(BODY).decode()}}
        with self.scrape(ok) as opened:
            fetch.download(self.URL, BytesIO())
        url, data, headers = opened.call_args.args
        body = json.loads(data)
        self.assertEqual(url, fetch.FIRECRAWL)
        self.assertEqual((body["url"], body["formats"], body["parsers"]), (self.URL, ["rawBase64"], []))
        self.assertEqual(headers["Authorization"], "Bearer fc-secret")

    def test_a_404_behind_firecrawl_raises_an_http_error_with_that_code(self):
        with self.scrape({"data": {"metadata": {"statusCode": 404}}}):
            with self.assertRaises(urllib.error.HTTPError) as caught:
                fetch.download(self.URL, BytesIO())
        self.assertEqual(caught.exception.code, 404)

    def test_a_missing_status_or_body_raises_an_http_error_502(self):
        for payload in ({"data": {"metadata": {}, "rawBase64": "AA=="}}, {"data": {"metadata": {"statusCode": 200}}}, {}):
            with self.subTest(payload=payload), self.scrape(payload):
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    fetch.download(self.URL, BytesIO())
                self.assertEqual(caught.exception.code, 502)

    def test_a_post_or_custom_headers_skip_firecrawl_and_go_direct(self):
        for kwargs in ({"data": b"{}"}, {"headers": {"X-Key": "k"}}):
            with mock.patch.object(fetch, "_open") as opened,                     mock.patch.object(fetch, "download_direct", return_value="digest") as direct:
                dest = BytesIO()
                self.assertEqual(fetch.download(self.URL, dest, **kwargs), "digest")
            opened.assert_not_called()
            direct.assert_called_once_with(self.URL, dest, kwargs.get("data"), kwargs.get("headers"))


if __name__ == "__main__":
    unittest.main()
