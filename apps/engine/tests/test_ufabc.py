import io
import unittest
import zipfile
from pathlib import Path
from unittest import mock
from xml.sax.saxutils import escape

from engine import ufabc
from tests.fakes import FakeConn

FIXTURES = Path(__file__).parent / "fixtures" / "ufabc"
LIST = (FIXTURES / "ufabc_course_list.html").read_bytes()
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
HEADER = {"A": "SIGLA", "B": "DISCIPLINA", "C": "TPEI", "D": "Curso (categoria)"}
# Real rows of the 2025-2026 categories catalog; the long Curso (categoria) cells keep only some of their courses.
ROWS = [
    {"A": "MCTB001-17", "B": "ÁLGEBRA LINEAR", "C": "6-0-0-5",
     "D": "BCC - Bacharelado em Ciências da Computação (OBR);EENE - Engenharia de Energia (OBR);BC&T - Bacharelado em Ciência e Tecnologia (OL)"},
    {"A": "ESZR007-21", "B": "A QUESTÃO NUCLEAR NAS RELAÇÕES INTERNACIONAIS", "C": "4-0-0-4",
     "D": "BRI - Bacharelado em Relações Internacionais (OL);EENE - Engenharia de Energia (OL)"},
    {"A": "NHPD001-25", "B": "AÇÕES INTEGRADORAS DE EDUCAÇÃO COM CRIANÇAS EM DIFERENTES CONTEXTOS SOCIAIS", "C": "2-2-4-4",
     "D": " LEILA-Licenciatura em Educação das Infâncias, Linguagens e Artes(OL), LPE- Licenciatura em Pedagogia (OBR)"},
    {"A": "NHPD011-25", "B": "LEITURA, ESCRITA, ORALIDADE E LINGUAGEM SIMBÓLICA NA EDUCAÇÃO INFANTIL", "C": "4-0-0-4",
     "D": "LEILA-Licenciatura em\nEducação para as Infâncias, Linguagens e Artes(OL), LPE- Licenciatura em\nPedagogia (OL E OBR)"},
    {"A": "NHZ3001-09", "B": "CIÊNCIA NA ANTIGUIDADE E PERÍODO MEDIEVAL", "C": "4-0-0-4", "D": "LFIS-Licenciatura em Física(OL),"},
    {"A": "NHT3004-13", "B": "ESTÁGIO SUPERVISIONADO EM FÍSICA I (NÍVEL MÉDIO)", "C": "0-7-0-0", "D": "LFIS-Licenciatura em Física(OBR)"},
    {"A": "NHLF001-22", "B": "ARTE NO ENSINO DE CIÊNCIAS HUMANAS", "C": "4-0-0-4", "D": "LFIL - Licenciatura em Filosofia (OL)"},
    {"A": "NHH2101-16", "B": "ESTÁGIO SUPERVISIONADO EM FILOSOFIA I", "C": "0-0-0-0", "D": "LFIL- Licenciatura em Filosofia(OBR)"},
    {"A": "NHZ2143-18", "B": "TEMAS DE FILOSOFIA MODERNAII", "C": "4-0-0-4", "D": "LFIS- Licenciatura em Filosofia(OL)"},
]


def xlsx(rows):
    """A minimal workbook (sharedStrings + sheet1) the way the adapter reads it, built with zipfile."""
    strings, sheet = [], []
    for n, row in enumerate(rows, 1):
        cells = ""
        for col, text in row.items():
            strings.append(text)
            cells += f'<c r="{col}{n}" t="s"><v>{len(strings) - 1}</v></c>'
        sheet.append(f'<row r="{n}">{cells}</row>')
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as book:
        book.writestr("xl/sharedStrings.xml", f'<sst xmlns="{NS}">' + "".join(f"<si><t>{escape(s)}</t></si>" for s in strings) + "</sst>")
        book.writestr("xl/worksheets/sheet1.xml", f'<worksheet xmlns="{NS}"><sheetData>' + "".join(sheet) + "</sheetData></worksheet>")
    out.seek(0)
    return out


def subjects(parsed, slug):
    return {s[2]: s[4] for s in parsed[slug]}


class ParseCoursesTest(unittest.TestCase):
    def setUp(self):
        self.courses = ufabc.parse_courses(io.BytesIO(LIST))

    def test_campus_line_above_each_link_gives_its_city(self):
        self.assertEqual(self.courses[0], ("https://prograd.ufabc.edu.br/cursos/bb", "Biotecnologia", "Santo André"))
        self.assertIn(("https://prograd.ufabc.edu.br/cursos/bn", "Neurociência", "São Bernardo do Campo"), self.courses)

    def test_entry_course_takes_the_campus_line_below_its_link(self):
        self.assertIn(("https://prograd.ufabc.edu.br/bch", "Bacharelado em Ciências e Humanidades (BC&H)", "São Bernardo do Campo"), self.courses)

    def test_two_campi_and_no_campus_courses_are_left_out(self):
        urls = {c[0] for c in self.courses}
        self.assertNotIn("https://prograd.ufabc.edu.br/bct", urls)  # 'Campi Santo André e São Bernardo do Campo'
        self.assertNotIn("https://prograd.ufabc.edu.br/cursos/lec-chs", urls)  # no campus line
        self.assertEqual(len(self.courses), 33)
        self.assertEqual({c[2] for c in self.courses}, {"Santo André", "São Bernardo do Campo"})

    def test_list_without_campus_lines_raises(self):
        with self.assertRaisesRegex(ValueError, "no course with a campus"):
            ufabc.parse_courses(io.BytesIO(LIST.replace(b"<em>Campus", b"<em>X")))

    def test_load_registers_a_course_page_source_labelled_with_its_campus(self):
        conn = FakeConn()
        ufabc.courses.load(conn, 1, [("https://prograd.ufabc.edu.br/cursos/bcc", "Ciência da Computação", "Santo André")])
        self.assertEqual(conn.calls[0][1], ("https://prograd.ufabc.edu.br/cursos/bcc", "UFABC, campus Santo André: Ciência da Computação"))


class ParseCoursePageTest(unittest.TestCase):
    def test_heading_text_is_the_course_name_per_page(self):
        for slug, name in (("bcc", "Bacharelado em Ciência da Computação"), ("ee", "Engenharia de Energia"),
                           ("bch", "Bacharelado em Ciências e Humanidades")):
            with self.subTest(slug):
                page = io.BytesIO((FIXTURES / f"ufabc_course_{slug}.html").read_bytes())
                self.assertEqual(ufabc.parse_course_page(page), name)

    def test_page_without_a_heading_raises(self):
        with self.assertRaisesRegex(ValueError, "no course heading"):
            ufabc.parse_course_page(io.BytesIO(b"<html></html>"))

    def test_load_stages_the_course_in_the_city_of_the_list_label_and_drops_other_cities(self):
        conn = FakeConn([("https://prograd.ufabc.edu.br/cursos/bcc", "UFABC, campus Santo André: Ciência da Computação")])
        ufabc.course_page.load(conn, 5, "Bacharelado em Ciência da Computação")
        delete = next(c for c in conn.calls if c[0].startswith("delete from staging.curriculum_courses"))
        self.assertEqual(delete[1], (5, "Santo André"))
        staged = next(c for c in conn.calls if "insert into staging.curriculum_courses" in c[0])
        self.assertEqual(staged[1][1:], (ufabc.INEP_CODE, "Bacharelado em Ciência da Computação", "Santo André", None, False, None))

    def test_load_with_a_label_naming_no_campus_raises(self):
        conn = FakeConn([("https://prograd.ufabc.edu.br/cursos/bcc", "Ciência da Computação")])
        with self.assertRaisesRegex(ValueError, "run ufabc_courses first"):
            ufabc.course_page.load(conn, 5, "X")


class ParseCurriculumTest(unittest.TestCase):
    """Approach: a tiny XLSX built with zipfile in the test from real catalog rows."""

    def setUp(self):
        self.parsed = ufabc.parse_curriculum(xlsx([HEADER, *ROWS]))

    def test_each_course_slug_with_term_year_and_hours_none(self):
        self.assertEqual(self.parsed["bcc"], [(None, None, "ÁLGEBRA LINEAR", None, False)])

    def test_catalog_codes_map_to_their_page_slug(self):
        self.assertEqual(set(self.parsed), {"bcc", "ee", "bct", "bri", "leila", "lp", "lfis", "lfil"})  # EENE -> ee, BC&T -> bct, LPE -> lp

    def test_obr_is_mandatory_ol_is_elective_and_anything_else_unknown(self):
        self.assertEqual(subjects(self.parsed, "ee"), {"ÁLGEBRA LINEAR": False, "A QUESTÃO NUCLEAR NAS RELAÇÕES INTERNACIONAIS": True})
        self.assertIs(subjects(self.parsed, "bct")["ÁLGEBRA LINEAR"], True)
        self.assertEqual(subjects(self.parsed, "lp"), {
            "AÇÕES INTEGRADORAS DE EDUCAÇÃO COM CRIANÇAS EM DIFERENTES CONTEXTOS SOCIAIS": False,
            "LEITURA, ESCRITA, ORALIDADE E LINGUAGEM SIMBÓLICA NA EDUCAÇÃO INFANTIL": None,  # 'OL E OBR'
        })

    def test_comma_separated_and_multiline_cells_give_each_course(self):
        self.assertEqual(len(self.parsed["leila"]), 2)

    def test_a_code_naming_another_course_is_a_typo_and_its_subject_is_dropped(self):
        # 'LFIS- Licenciatura em Filosofia' on 'TEMAS DE FILOSOFIA MODERNAII': LFIS is Física
        self.assertNotIn("TEMAS DE FILOSOFIA MODERNAII", subjects(self.parsed, "lfis"))
        self.assertNotIn("TEMAS DE FILOSOFIA MODERNAII", subjects(self.parsed, "lfil"))
        self.assertEqual(len(self.parsed["lfis"]), 2)

    def test_a_subject_repeated_for_a_course_is_kept_once(self):
        again = ufabc.parse_curriculum(xlsx([HEADER, ROWS[0], dict(ROWS[0], A="OTHER-1")]))
        self.assertEqual(len(again["bcc"]), 1)

    def test_renamed_columns_raise(self):
        with self.assertRaisesRegex(ValueError, "no longer has the SIGLA"):
            ufabc.parse_curriculum(xlsx([dict(HEADER, B="NOME"), *ROWS]))

    def test_sheet_without_course_codes_raises(self):
        with self.assertRaisesRegex(ValueError, "no course category"):
            ufabc.parse_curriculum(xlsx([HEADER, {"A": "X", "B": "Y", "C": "1", "D": "nothing here"}]))

    def test_load_stages_each_course_on_its_page_and_skips_unstaged_ones(self):
        conn = FakeConn([(11,), None])
        with mock.patch.object(ufabc.curricula, "load_subjects", return_value=3) as load:
            written = ufabc.curriculum.load(conn, 1, {"bcc": [(None, None, "A", None, False)], "zzz": [(None, None, "B", None, None)]})
        self.assertEqual(written, 3)
        load.assert_called_once_with(conn, 11, [(None, None, "A", None, False)])
        self.assertEqual(conn.calls[0][1], (["https://prograd.ufabc.edu.br/cursos/bcc", "https://prograd.ufabc.edu.br/bcc"],))


if __name__ == "__main__":
    unittest.main()
