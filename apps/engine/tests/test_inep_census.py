import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from engine import inep_census

FIXTURES = Path(__file__).parent / "fixtures"
FOLDER = "microdados_censo_da_educacao_superior_2024/dados/"
COURSES = "MICRODADOS_CADASTRO_CURSOS_2024.CSV"
IES = "MICRODADOS_ED_SUP_IES_2024.CSV"


def make_zip(tmp, courses=None, ies=None):
    """Zip the fixtures like the official download; courses/ies override the file contents (bytes)."""
    path = Path(tmp) / "census.zip"
    with zipfile.ZipFile(path, "w") as z:
        z.writestr(FOLDER + COURSES, courses if courses is not None else (FIXTURES / COURSES).read_bytes())
        z.writestr(FOLDER + IES, ies if ies is not None else (FIXTURES / IES).read_bytes())
    return path


class ParseTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = tmp.name

    def test_keeps_only_sao_paulo_city_courses_and_their_institutions(self):
        institutions, courses = inep_census.parse(make_zip(self.tmp))
        self.assertEqual(
            {c[0] for c in courses}, {"614", "615", "7261", "1113804", "5000589", "900002", "900004"}
        )  # in person and distance; not São Carlos (621), RJ (900001) nor Campinas (900003)
        self.assertEqual({i[0] for i in institutions}, {"7", "322", "591", "526"})  # no UFRJ

    def test_keeps_the_modality_of_each_course(self):
        _, courses = inep_census.parse(make_zip(self.tmp))
        by_code = {c[0]: c for c in courses}
        self.assertEqual((by_code["614"][12], by_code["900002"][12]), ("1", "2"))  # in person, distance

    def test_decodes_latin1_accents(self):
        institutions, courses = inep_census.parse(make_zip(self.tmp))
        by_code = {c[0]: c for c in courses}
        self.assertEqual(by_code["614"][2], "Ciência Da Computação")
        self.assertEqual(by_code["614"][11], "São Paulo")
        self.assertEqual({i[0]: i for i in institutions}["7"][1], "UNIVERSIDADE FEDERAL DE SÃO CARLOS")

    def test_keeps_the_raw_fields_the_staging_needs(self):
        institutions, courses = inep_census.parse(make_zip(self.tmp))
        abi = {c[0]: c for c in courses}["5000589"]
        self.assertEqual((abi[8], abi[10]), ("", "0"))  # entry area: no degree, QT_CURSO 0
        self.assertEqual({i[0]: i for i in institutions}["526"][2], "")  # no acronym

    def test_keeps_the_cine_label_as_published_and_the_area_names(self):
        institutions, courses = inep_census.parse(make_zip(self.tmp))
        civil = {c[0]: c for c in courses}["615"]
        self.assertEqual(civil[3], '"0732E01"')  # INEP's literal quotes survive: the SQL strips them
        self.assertEqual(
            civil[5:8], ("Engenharia, produção e construção", "Arquitetura e construção", "Engenharia civil e construção")
        )

    def test_missing_column_raises(self):
        header, rest = (FIXTURES / COURSES).read_bytes().split(b"\n", 1)
        broken = header.replace(b'"QT_CURSO"', b'"QT_OTHER"') + b"\n" + rest
        with self.assertRaisesRegex(ValueError, "QT_CURSO"):
            inep_census.parse(make_zip(self.tmp, courses=broken))

    def test_course_with_unknown_institution_raises(self):
        header, first, *_ = (FIXTURES / IES).read_bytes().split(b"\n")
        with self.assertRaisesRegex(ValueError, "missing from the IES file"):
            inep_census.parse(make_zip(self.tmp, ies=header + b"\n" + first + b"\n"))

    def test_zip_without_exactly_one_matching_file_raises(self):
        path = Path(self.tmp) / "empty.zip"
        with zipfile.ZipFile(path, "w") as z:
            z.writestr("readme.txt", "x")
        with self.assertRaisesRegex(ValueError, "expected one file"):
            inep_census.parse(path)


class _Result:
    def __init__(self, value):
        self.value = value

    def fetchone(self):
        return (self.value,)


class _Conn:
    def __init__(self, staged):
        self.staged, self.statements = staged, []

    def execute(self, sql, params=None):
        self.statements.append(sql)
        return _Result(self.staged)


class LoadTest(unittest.TestCase):
    def test_refuses_a_census_under_half_the_staged_courses(self):
        conn = _Conn(staged=10)
        with self.assertRaisesRegex(ValueError, "check its format"):
            inep_census.load(conn, 1, ([], [("c",)] * 4))
        self.assertEqual(len(conn.statements), 1)  # only the count ran: nothing was truncated

    def test_relinks_every_staged_curriculum_page_and_adds_the_subjects_to_the_count(self):
        from tests.fakes import FakeConn

        class Conn(FakeConn):
            def cursor(self):
                cur = mock.MagicMock()
                cur.__enter__.return_value = cur
                return cur

        conn = Conn(answers=[(0,), (5,), (3,)])  # staged before, normalize_inep_census, normalize_curriculum sum
        self.assertEqual(inep_census.load(conn, 1, ([], [("c",)])), 8)
        sql = conn.calls[-1][0]
        self.assertIn("staging.normalize_curriculum(source_id)", sql)
        self.assertIn("select distinct source_id from staging.curriculum_courses", sql)
        self.assertIn("normalize_inep_census", conn.calls[-2][0])  # the census first, so the courses exist to link


if __name__ == "__main__":
    unittest.main()
