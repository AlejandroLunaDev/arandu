import gzip
import io
import json
import unittest
from pathlib import Path
from unittest import mock

from engine import mec_powerbi

FIXTURES = Path(__file__).parent / "fixtures" / "mec_powerbi"
SISU = (FIXTURES / "sisu.raw").read_bytes()
PROUNI = (FIXTURES / "prouni.raw").read_bytes()
NULL = "Ø"  # Power BI's null bitmask key


def dsr(rows, dicts=None, **extra):
    return {"DS": [{"PH": [{"DM0": rows}], "ValueDicts": dicts or {}, **extra}]}


def edited(raw, change):
    """The raw answer with its first DS changed by change(ds)."""
    route, body = raw.split(b"\n", 1)
    doc = json.loads(body)
    change(doc["results"][0]["result"]["data"]["dsr"]["DS"][0])
    return route + b"\n" + json.dumps(doc, ensure_ascii=False).encode()


class ParseTest(unittest.TestCase):
    def test_sisu_rows_keep_the_route_int_code_lowercased_shift_and_edition(self):
        rows = mec_powerbi.parse(io.BytesIO(SISU))
        self.assertEqual(len(rows), 10)
        self.assertEqual(rows[1], ("sisu", 101064, "CAMPUS DIADEMA - COMPLEXO DIDÁTICO", "integral", 2024, 1, "AC",
                                   "AMPLA / AC / Não se aplica", None, 718.22))
        self.assertIsInstance(rows[1][1], int)

    def test_sisu_quota_code_gets_the_income_band_but_ac_does_not(self):
        codes = {row[6] for row in mec_powerbi.parse(io.BytesIO(SISU))}
        self.assertIn("AC", codes)  # 'Não se aplica' appends nothing
        self.assertIn("LB_EP | INFERIOR A 1,5 SAL. MÍN.", codes)
        self.assertIn("LI_EP | INDEPENDENTE DE RENDA", codes)

    def test_sisu_has_no_scholarship_and_keeps_null_scores(self):
        rows = mec_powerbi.parse(io.BytesIO(SISU))
        self.assertEqual({row[8] for row in rows}, {None})
        self.assertIsNone(rows[0][9])

    def test_prouni_bolsa_integral_becomes_integral(self):
        rows = mec_powerbi.parse(io.BytesIO(PROUNI))
        self.assertEqual({row[8] for row in rows}, {"integral"})
        self.assertEqual(rows[0], ("prouni", 105690, "Unidade SEDE", "matutino", 2024, 1, "AMPLA", "AMPLA", "integral", 562.92))
        self.assertEqual(rows[2][6:8], ("PCD", "COTA / PCD"))  # quota_code is the code, the label adds the modality

    def test_prouni_bolsa_prefix_is_removed(self):
        def change(ds):
            ds["ValueDicts"]["D7"] = ["BOLSA INTEGRAL", "BOLSA INTEGRAL"]
        self.assertEqual({row[8] for row in mec_powerbi.parse(io.BytesIO(edited(PROUNI, change)))}, {"integral"})

    def test_prouni_unknown_scholarship_raises(self):
        def change(ds):
            ds["ValueDicts"]["D7"] = ["BOLSA OUTRA", "BOLSA OUTRA"]
        with self.assertRaisesRegex(ValueError, "unknown ProUni scholarship 'BOLSA OUTRA'"):
            mec_powerbi.parse(io.BytesIO(edited(PROUNI, change)))

    def test_a_gzip_body_is_read(self):
        route, body = SISU.split(b"\n", 1)
        self.assertEqual(len(mec_powerbi.parse(io.BytesIO(route + b"\n" + gzip.compress(body)))), 10)

    def test_a_refused_query_raises(self):
        body = json.dumps({"results": [{"result": {"data": {"dsr": {"DataShapes": [{"odata.error": "x"}]}}}}]})
        with self.assertRaisesRegex(ValueError, "refused"):
            mec_powerbi.parse(io.BytesIO(b"sisu\n" + body.encode()))


class RowsTest(unittest.TestCase):
    def test_repeat_and_null_bitmasks(self):
        rows = [
            {"S": [{"N": "G0", "DN": "D0"}, {"N": "G1"}, {"N": "G2"}], "C": [0, 5, 1.5]},
            {"C": [1, 2.5], "R": 2},  # column 1 repeats the previous row
            {"C": [9], "R": 1, NULL: 4},  # column 0 repeats, column 2 is null, column 1 is read
            {"C": [], "R": 3, NULL: 4},  # columns 0 and 1 repeat, column 2 is null
        ]
        self.assertEqual(mec_powerbi._rows(dsr(rows, {"D0": ["a", "b"]}), 3),
                         [["a", 5, 1.5], ["b", 5, 2.5], ["b", 9, None], ["b", 9, None]])

    def test_dictionary_index_is_only_resolved_for_dictionary_columns(self):
        rows = [{"S": [{"N": "G0", "DN": "D0"}, {"N": "G1"}], "C": [1, 1]}]
        self.assertEqual(mec_powerbi._rows(dsr(rows, {"D0": ["a", "b"]}), 2), [["b", 1]])

    def test_a_truncated_answer_raises_on_rt(self):
        rows = [{"S": [{"N": "G0"}], "C": [1]}]
        with self.assertRaisesRegex(ValueError, "more than 30000 rows"):
            mec_powerbi._rows(dsr(rows, RT=[["x"]]), 1)

    def test_a_truncated_answer_raises_on_incomplete_ic(self):
        rows = [{"S": [{"N": "G0"}], "C": [1]}]
        with self.assertRaisesRegex(ValueError, "more than 30000 rows"):
            mec_powerbi._rows(dsr(rows, IC=False), 1)


class QueryTest(unittest.TestCase):
    def command(self, route):
        return mec_powerbi.query(route, 2024, 1)["queries"][0]["Query"]["Commands"][0]["SemanticQueryDataShapeCommand"]

    def conditions(self, route):
        where = self.command(route)["Query"]["Where"]
        return {c["Condition"]["In"]["Expressions"][0]["Column"]["Property"]:
                [v[0]["Literal"]["Value"] for v in c["Condition"]["In"]["Values"]] for c in where}

    def test_filters_institutions_year_and_edition(self):
        self.assertEqual(self.conditions("sisu"),
                         {"CODIGO_IES": ["55L", "591L", "7L", "4925L"], "NU_ANO": ["2024L"], "NU_EDICAO": ["1L"]})
        self.assertEqual(self.conditions("prouni")["CODIGO_IES"], ["22L", "203L", "466L", "852L"])

    def test_selects_the_route_entity_and_projects_every_column(self):
        for route, entity in (("sisu", "Relatorio Nota de Corte"), ("prouni", "Dados Painel PROUNI")):
            command = self.command(route)
            self.assertEqual(command["Query"]["From"][0]["Entity"], entity)
            self.assertEqual(command["Binding"]["Primary"]["Groupings"][0]["Projections"], list(range(9)))


class DownloadTest(unittest.TestCase):
    def test_posts_the_query_with_the_headers_and_prefixes_the_route(self):
        def fake(url, dest, data=None, headers=None):
            fake.args = (url, data, headers)
            dest.write(b'{"answer": 1}')
            return "digest"

        dest = io.BytesIO()
        with mock.patch.object(mec_powerbi.fetch, "download", fake):
            digest = mec_powerbi.download(mec_powerbi.API + "#prouni-2024-1", dest)
        url, data, headers = fake.args
        self.assertEqual((digest, url), ("digest", mec_powerbi.API))
        self.assertEqual(json.loads(data), mec_powerbi.query("prouni", 2024, 1))
        self.assertEqual(headers["X-PowerBI-ResourceKey"], mec_powerbi.RESOURCE_KEY)
        self.assertIn("application/json", headers["Content-Type"])
        self.assertTrue(dest.getvalue().startswith(b"prouni\n"))
        self.assertEqual(dest.getvalue(), b'prouni\n{"answer": 1}')

    def test_the_prefixed_file_round_trips_through_parse(self):
        def fake(url, dest, data=None, headers=None):
            dest.write(PROUNI.split(b"\n", 1)[1])
            return "d"

        dest = io.BytesIO()
        with mock.patch.object(mec_powerbi.fetch, "download", fake):
            mec_powerbi.download(mec_powerbi.API + "#prouni-2024-1", dest)
        dest.seek(0)
        self.assertEqual(mec_powerbi.parse(dest)[0][0], "prouni")


class LoadTest(unittest.TestCase):
    def test_replaces_staged_rows_normalizes_and_relinks_pages_with_units(self):
        conn = mock.MagicMock()
        conn.execute.return_value.fetchone.side_effect = [(3,), (2,)]
        self.assertEqual(mec_powerbi.load(conn, 7, mec_powerbi.parse(io.BytesIO(PROUNI))), 5)
        calls = conn.execute.call_args_list
        self.assertIn("delete from staging.mec_offers", calls[0].args[0])
        self.assertEqual(calls[1].args, ("select staging.normalize_mec(%s)", (7,)))
        self.assertIn("units is not null", calls[2].args[0])
        copy = conn.cursor.return_value.__enter__.return_value.copy.return_value.__enter__.return_value
        self.assertEqual(copy.write_row.call_count, 10)
        self.assertEqual(copy.write_row.call_args_list[0].args[0][:3], (7, "prouni", 105690))


if __name__ == "__main__":
    unittest.main()
