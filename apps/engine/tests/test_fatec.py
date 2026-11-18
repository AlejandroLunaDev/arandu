import io
import json
import unittest
from unittest import mock

import psycopg
from reportlab.pdfgen import canvas

from engine import fatec
from tests.fakes import FakeConn

LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
BASE = "https://fatecexemplo.cps.sp.gov.br/wp-content/uploads/sites/9/2026/03/"
SUBJECTS = ["Algoritmos e Lógica", "Banco de Dados", "Engenharia de Software", "Inglês I"]


def media(*names):
    return io.BytesIO(json.dumps([{"source_url": BASE + n} for n in names]).encode())


def pdf(*pages):
    """A PDF whose pages are lists of (x, y, text) drawn with reportlab's built-in Helvetica."""
    out = io.BytesIO()
    pen = canvas.Canvas(out)
    for page in pages:
        for x, y, text in page:
            pen.drawString(x, y, text)
        pen.showPage()
    pen.save()
    out.seek(0)
    return out


def grid(subjects, headers=True):
    cells = [(50, 700, "1º semestre"), (300, 700, "2º semestre"), (300, 680, "Cálculo (80 aulas)")] if headers else []
    return cells + [(50, 680 - 20 * i, f"{name} (80 aulas)") for i, name in enumerate(subjects)]


COVER = [(50, 780, "Projeto Pedagógico do Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas")]
EMENTARIO = [(50, 780 - 20 * i, name) for i, name in enumerate(SUBJECTS)]


class ParseMediaTest(unittest.TestCase):
    def test_keeps_ppc_grade_matriz_and_projeto_pedagogico_pdfs(self):
        keep = ["PPC_ADS.pdf", "Grade-DSM.PDF", "Matriz_Curricular.pdf", "Projeto-Pedagogico-GE.pdf"]
        self.assertEqual(fatec.parse_media(media(*keep)), sorted(BASE + n for n in keep))

    def test_drops_timetables_calendars_ams_references_and_non_pdfs(self):
        drop = ["Grade-Horaria-ADS.pdf", "Calendario-PPC.pdf", "PPC_AMS_ADS.pdf", "Referencias-PPC.pdf",
                "PPC_ADS.docx", "Edital.pdf", "PPC.png"]
        self.assertEqual(fatec.parse_media(media(*drop)), [])

    def test_repeated_urls_are_listed_once(self):
        self.assertEqual(fatec.parse_media(media("PPC.pdf", "PPC.pdf")), [BASE + "PPC.pdf"])


class LoadMediaTest(unittest.TestCase):
    def test_each_pdf_is_registered_with_the_searchs_inep_code(self):
        conn = FakeConn([(15682,)])
        self.assertEqual(fatec.load_media(conn, 7, [BASE + "PPC.pdf"]), 2)
        self.assertEqual(conn.calls[1][1], (BASE + "PPC.pdf", "Fatec (CO_IES 15682), PDF: PPC.pdf"))
        self.assertEqual(conn.calls[2][1], (15682, BASE + "PPC.pdf"))


class ParseCurriculumTest(unittest.TestCase):
    def test_reads_the_first_semester_column_only(self):
        title, subjects = fatec.parse_curriculum(pdf(COVER, grid(SUBJECTS), EMENTARIO))
        self.assertIn("Tecnologia em Análise e Desenvolvimento de Sistemas", title)
        self.assertEqual(subjects, [(1, 1, name, None, False) for name in SUBJECTS])

    def test_a_name_the_ppc_never_states_again_raises(self):
        with self.assertRaisesRegex(ValueError, "does not state again"):
            fatec.parse_curriculum(pdf(COVER, grid(SUBJECTS), EMENTARIO[:3]))

    def test_too_few_subjects_raises(self):
        with self.assertRaisesRegex(ValueError, "2 subjects"):
            fatec.parse_curriculum(pdf(COVER, grid(SUBJECTS[:2]), EMENTARIO))

    def test_no_semester_header_raises(self):
        with self.assertRaisesRegex(ValueError, "no 1º semestre column"):
            fatec.parse_curriculum(pdf(COVER, grid(SUBJECTS, headers=False), EMENTARIO))

    def test_a_placeholder_cell_is_not_a_subject(self):
        with self.assertRaisesRegex(ValueError, "not read cleanly"):
            fatec.parse_curriculum(pdf(COVER, grid(SUBJECTS + ["Disciplina xxx"]), EMENTARIO))


class LoadCurriculumLocalDbTest(unittest.TestCase):
    OLD, NEW = BASE.replace("2026/03", "2024/01") + "PPC.pdf", BASE + "PPC.pdf"
    PARSED = ("Projeto Pedagógico do Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas",
              [(1, 1, name, None, False) for name in SUBJECTS])

    def setUp(self):
        try:
            self.conn = psycopg.connect(LOCAL_DB, connect_timeout=2)
        except psycopg.OperationalError as error:
            self.skipTest(f"local Supabase is not reachable: {error}")
        self.addCleanup(self.conn.close)  # never committed: closing rolls everything back
        run = self.conn.execute
        base = run("insert into sources (adapter, url, label) values ('inep_census', 'https://example.test/fatec-census', 'c') returning id").fetchone()[0]
        run("insert into institutions (inep_code, name, kind, source_id) values (999001, 'Fatec Exemplo', 'public', %s)", (base,))
        run("""insert into courses (inep_code, institution_id, name, degree, shift, duration_years, city, source_id)
               select 9990011, id, 'Análise e Desenvolvimento de Sistemas', 'tecnologico', 'integral', 3, 'Cotia', %s
               from institutions where inep_code = 999001""", (base,))
        self.ids = {}
        for url in (self.OLD, self.NEW):
            self.ids[url] = run("insert into sources (adapter, url, label) values ('fatec_curriculum', %s, 'Fatec test') returning id", (url,)).fetchone()[0]
            run("insert into staging.fatec_documents (source_id, institution_inep_code) values (%s, 999001)", (self.ids[url],))

    def staged_urls(self):
        return [r[0] for r in self.conn.execute(
            """select s.url from staging.curriculum_courses cc join sources s on s.id = cc.source_id
               where cc.institution_inep_code = 999001""").fetchall()]

    def test_the_newest_ppc_wins_whichever_is_processed_first(self):
        for order in ((self.OLD, self.NEW), (self.NEW, self.OLD)):
            with self.subTest(order=order):
                for url in order:
                    fatec.load_curriculum(self.conn, self.ids[url], self.PARSED)
                self.assertEqual(self.staged_urls(), [self.NEW])
                subjects = self.conn.execute("select count(*) from staging.curriculum_subjects where source_id = %s", (self.ids[self.OLD],)).fetchone()[0]
                self.assertEqual(subjects, 0)

    def test_a_cover_naming_no_census_course_raises(self):
        with self.assertRaisesRegex(ValueError, "no census course of CO_IES 999001"):
            fatec.load_curriculum(self.conn, self.ids[self.NEW], ("Tecnologia em Astrologia", self.PARSED[1]))


if __name__ == "__main__":
    unittest.main()
