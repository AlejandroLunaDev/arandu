import contextlib
import io
import unittest
from types import SimpleNamespace
from unittest import mock

from engine import __main__ as cli


class FakeDb:
    """Just enough of a psycopg connection for run(): sources per adapter, plus a log of the writes."""

    def __init__(self, sources):
        self.sources = sources  # adapter -> [(id, url, last_hash)]
        self.hashes, self.runs, self.ran = {}, [], []

    def execute(self, sql, params=()):
        sql = " ".join(sql.split())
        result = mock.Mock()
        if sql.startswith("insert into scrape_runs"):
            self.runs.append({"adapter": params[0], "status": "running"})
            result.fetchone.return_value = (len(self.runs),)
        elif sql.startswith("select id, url"):
            result.fetchall.return_value = self.sources.get(params[0], [])
        elif sql.startswith("update sources"):
            self.hashes[params[1]] = params[0]
        elif sql.startswith("update scrape_runs set status = 'succeeded'"):
            self.runs[params[1] - 1].update(status="succeeded", rows=params[0])
        elif sql.startswith("update scrape_runs set status = 'failed'"):
            self.runs[params[1] - 1].update(status="failed", error=params[0])
        return result

    @contextlib.contextmanager
    def transaction(self):
        yield

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def adapter(db, fail_on=()):
    def parse(doc):
        text = doc.read().decode()
        if text in fail_on:
            raise ValueError(f"cannot parse {text}")
        return text

    def load(conn, source_id, parsed):
        db.ran.append(parsed)
        return 2

    return SimpleNamespace(parse=parse, load=load)


class RunTest(unittest.TestCase):
    def run_adapter(self, db, ad, hashes=None):
        def download(url, dest):
            dest.write(url.encode())
            return (hashes or {}).get(url, "digest-" + url)

        with mock.patch.dict(cli.ADAPTERS, {"fake": ad}), mock.patch.object(cli.fetch, "download", download):
            cli.run(db, "fake")

    def test_all_sources_loaded_and_run_logged_as_succeeded(self):
        db = FakeDb({"fake": [(1, "a", None), (2, "b", None)]})
        self.run_adapter(db, adapter(db))
        self.assertEqual((db.ran, db.hashes), (["a", "b"], {1: "digest-a", 2: "digest-b"}))
        self.assertEqual(db.runs[0], {"adapter": "fake", "status": "succeeded", "rows": 4})

    def test_an_adapter_with_its_own_download_is_used_instead_of_fetch_download(self):
        db = FakeDb({"fake": [(1, "a", None)]})
        ad = adapter(db)
        ad.download = lambda url, dest: dest.write(b"own " + url.encode()) and "own-digest"
        self.run_adapter(db, ad)  # run_adapter patches fetch.download with a different digest and body
        self.assertEqual((db.ran, db.hashes), (["own a"], {1: "own-digest"}))

    def test_a_failing_source_does_not_stop_the_others_and_run_raises_listing_it(self):
        db = FakeDb({"fake": [(1, "a", None), (2, "bad", None), (3, "c", None)]})
        with self.assertRaises(RuntimeError) as caught:
            self.run_adapter(db, adapter(db, fail_on={"bad"}))
        self.assertEqual(db.ran, ["a", "c"])  # sources after the failure still loaded
        self.assertEqual(db.hashes, {1: "digest-a", 3: "digest-c"})  # the failed one keeps its old hash
        message = str(caught.exception)
        self.assertIn("1 of 3 sources failed (rows written: 4)", message)
        self.assertIn("bad: cannot parse bad", message)
        self.assertEqual(db.runs[0]["status"], "failed")
        self.assertEqual(db.runs[0]["error"], message)

    def test_download_failure_is_collected_like_a_parse_failure(self):
        db = FakeDb({"fake": [(1, "a", None)]})
        with mock.patch.dict(cli.ADAPTERS, {"fake": adapter(db)}), \
                mock.patch.object(cli.fetch, "download", side_effect=RuntimeError("HTTP 202")):
            with self.assertRaisesRegex(RuntimeError, "a: HTTP 202"):
                cli.run(db, "fake")
        self.assertEqual(db.hashes, {})

    def test_unchanged_document_is_not_parsed_again(self):
        db = FakeDb({"fake": [(1, "a", "digest-a")]})
        self.run_adapter(db, adapter(db))
        self.assertEqual(db.ran, [])
        self.assertIn(1, db.hashes)  # fetched-at still updated

    def test_adapter_without_sources_fails_the_run(self):
        db = FakeDb({})
        with self.assertRaisesRegex(LookupError, "no source registered"):
            self.run_adapter(db, adapter(db))
        self.assertEqual(db.runs[0]["status"], "failed")


class MainTest(unittest.TestCase):
    def main(self, argv, db, adapters):
        err = io.StringIO()
        with mock.patch.dict(cli.ADAPTERS, adapters, clear=True), mock.patch.object(cli.sys, "argv", ["engine", *argv]), \
                mock.patch.dict(cli.os.environ, {"DATABASE_URL": "postgres://x"}), \
                mock.patch.object(cli.psycopg, "connect", return_value=db), \
                mock.patch.object(cli.fetch, "download", lambda url, dest: dest.write(url.encode()) and "d-" + url), \
                contextlib.redirect_stderr(err):
            try:
                cli.main()
            except SystemExit as exit_:
                return exit_.code, err.getvalue()
        return None, err.getvalue()

    def test_all_runs_every_adapter_in_order_and_exits_listing_the_failed_ones(self):
        db = FakeDb({"one": [(1, "u1", None)], "two": [(2, "bad", None)], "three": [(3, "u3", None)]})
        code, err = self.main(["all"], db, {"one": adapter(db), "two": adapter(db, fail_on={"bad"}), "three": adapter(db)})
        self.assertEqual([r["adapter"] for r in db.runs], ["one", "two", "three"])  # kept going past 'two'
        self.assertEqual(db.ran, ["u1", "u3"])
        self.assertEqual(code, "failed adapters: two")
        self.assertIn("two failed:", err)

    def test_all_without_failures_exits_zero(self):
        db = FakeDb({"one": [(1, "u1", None)]})
        self.assertEqual(self.main(["all"], db, {"one": adapter(db)})[0], None)

    def test_a_single_adapter_failure_exits_non_zero(self):
        db = FakeDb({"one": [(1, "bad", None)]})
        self.assertEqual(self.main(["one"], db, {"one": adapter(db, fail_on={"bad"})})[0], "failed adapters: one")

    def test_unknown_adapter_prints_usage(self):
        code, _ = self.main(["nope"], FakeDb({}), {"one": adapter(None)})
        self.assertIn("usage: python -m engine {all|one}", code)

    def test_adapters_run_each_list_before_its_curriculum_level(self):
        order = {n: i for i, n in enumerate(cli.ADAPTERS)}
        for first, second in (("usp_courses", "usp_curriculum"), ("anima_sitemap", "anima_course"), ("anima_course", "anima_curriculum"),
                              ("unip_courses", "unip_units"), ("unip_units", "unip_curriculum"),
                              ("usp_curriculum", "enem_usp")):
            self.assertLess(order[first], order[second], f"{first} must run before {second}")


if __name__ == "__main__":
    unittest.main()
