import io
import unittest
from pathlib import Path

import psycopg

from engine import curricula, usp

FIXTURES = Path(__file__).parent / "fixtures" / "usp"
LIST = (FIXTURES / "usp_course_list_45.html").read_bytes()
PSICO = (FIXTURES / "usp_course_list_47.html").read_bytes()
POLI = (FIXTURES / "usp_course_list_3.html").read_bytes()
GRADE = (FIXTURES / "usp_grade_45052.html").read_bytes()
DIREITO = (FIXTURES / "usp_discipline_DFD0117.html").read_bytes()
MICRO = (FIXTURES / "usp_discipline_EAE1101.html").read_bytes()
BASE = "https://uspdigital.usp.br/jupiterweb/"
LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def doc(text):
    return io.BytesIO(text.encode("iso-8859-1"))


class ParseCoursesTest(unittest.TestCase):
    def test_lists_every_course_with_absolute_url_shift_and_city(self):
        courses = usp.parse_courses(io.BytesIO(LIST))
        self.assertEqual(len(courses), 4)
        self.assertEqual(
            courses[0],
            (BASE + "listarGradeCurricular?codcg=45&codcur=45052&codhab=0&tipo=N", "Bacharelado em Ciência da Computação", "integral", "São Paulo"),
        )
        self.assertEqual({c[3] for c in courses}, {"São Paulo"})
        self.assertTrue(all(c[0].startswith(BASE) for c in courses))

    def test_same_name_different_shifts_are_distinct_pages(self):
        same = [c for c in usp.parse_courses(io.BytesIO(LIST)) if c[1] == "Bacharelado em Matemática Aplicada e Computacional"]
        self.assertEqual(sorted(c[2] for c in same), ["integral", "noturno"])
        self.assertEqual(len({c[0] for c in same}), 2)

    def test_each_course_takes_the_city_of_the_campus_row_above_it(self):
        text = PSICO.decode("iso-8859-1")
        two = text + text.replace("São Paulo - Cidade", "Ribeirão Preto - Campus", 1)
        cities = [c[3] for c in usp.parse_courses(doc(two))]
        self.assertEqual(cities, ["São Paulo"] * 3 + ["Ribeirão Preto"] * 3)

    def test_course_before_any_campus_raises(self):
        no_campus = PSICO.decode("iso-8859-1").replace("Campus:", "Local:")
        with self.assertRaisesRegex(ValueError, "before any campus"):
            usp.parse_courses(doc(no_campus))

    def test_stated_degree_prefixes_only_listed_grades(self):
        def page(href):
            return doc(f'<table><tr><td>Campus: São Paulo - Cidade</td></tr><tr><td><a href="{href}">Enfermagem</a></td><td>integral</td></tr></table>')

        listed = "listarGradeCurricular?codcg=7&codcur=7012&codhab=0&tipo=N"
        self.assertEqual(usp.parse_courses(page(listed))[0][1], "Bacharelado em Enfermagem")
        self.assertEqual(usp.parse_courses(page("listarGradeCurricular?codcg=7&codcur=7099&codhab=0&tipo=N"))[0][1], "Enfermagem")

    def test_unit_with_several_degrees_of_one_course(self):
        courses = usp.parse_courses(io.BytesIO(PSICO))
        self.assertEqual(
            [(c[1], c[2], c[3]) for c in courses],
            [
                ("Psicologia - Bacharelado", "integral", "São Paulo"),
                ("Psicologia - Licenciatura", "integral", "São Paulo"),
                ("Psicologia - Psicólogo", "integral", "São Paulo"),
            ],
        )
        self.assertEqual(courses[0][0], BASE + "listarGradeCurricular?codcg=47&codcur=47012&codhab=100&tipo=N")

    def test_code_first_rows_take_name_and_shift_from_the_next_cells_and_tipo_v_is_skipped(self):
        courses = usp.parse_courses(io.BytesIO(POLI))
        self.assertEqual(
            [(c[1], c[2], c[3]) for c in courses],
            [
                ("Engenharia Ambiental", "integral", "São Paulo"),
                ("Engenharia Civil", "integral", "São Paulo"),
                ("Engenharia Elétrica - Ênfase em Automação e Controle", "integral", "São Paulo"),
            ],
        )
        self.assertEqual(courses[1][0], BASE + "listarGradeCurricular?codcg=3&codcur=3023&codhab=3000&tipo=N")
        self.assertFalse(any("tipo=V" in c[0] or "Percurso" in c[1] for c in courses))

    def test_no_courses_raise(self):
        with self.assertRaisesRegex(ValueError, "no course"):
            usp.parse_courses(doc("<html>Campus: São Paulo</html>"))


class ParseCurriculumTest(unittest.TestCase):
    def setUp(self):
        self.subjects = usp.parse_curriculum(io.BytesIO(GRADE))

    def test_first_term_mandatory_subjects_exact(self):
        first = [(n, h) for t, y, n, h, e in self.subjects if t == 1 and not e and y == 1]
        self.assertEqual(
            first,
            [
                ("Integração na Universidade e na Profissão", 30),
                ("Fundamentos de Matemática para a Computação", 60),
                ("Introdução à Computação", 60),
                ("Geometria Analítica e Fundamentos de Álgebra Linear", 60),
                ("Álgebra Booleana e Aplicações no Projeto de Arquitetura de Computadores", 60),
                ("Cálculo Diferencial e Integral I", 90),
            ],
        )

    def test_year_is_two_terms_per_year(self):
        by_term = {t: y for t, y, *_ in self.subjects}
        self.assertEqual(by_term, {1: 1, 2: 1, 3: 2})

    def test_electives_and_free_electives_are_flagged(self):
        electives = {n for t, y, n, h, e in self.subjects if e}
        self.assertIn("Matrizes, Vetores e Geometria Analítica", electives)  # Optativas Eletivas
        self.assertIn("Introdução às Ciências Atmosféricas", electives)  # Optativas Livres
        self.assertFalse(any(e for t, y, n, h, e in self.subjects if n == "Introdução à Computação"))

    def test_a_subject_in_two_sections_of_one_term_keeps_both_rows(self):
        both = [(h, e) for t, y, n, h, e in self.subjects if t == 2 and n == "Algoritmos e Estruturas de Dados I"]
        self.assertEqual(both, [(60, False), (120, True)])

    def test_empty_hours_become_none(self):
        html = (GRADE.decode("iso-8859-1")).replace('<div align="right">30</div>', '<div align="right"></div>', 1)
        first = usp.parse_curriculum(doc(html))[0]
        self.assertEqual((first[2], first[3]), ("Integração na Universidade e na Profissão", None))

    def test_bad_hours_raise(self):
        html = GRADE.decode("iso-8859-1").replace('<div align="right">30</div>', '<div align="right">3x</div>', 1)
        with self.assertRaisesRegex(ValueError, "unexpected hours"):
            usp.parse_curriculum(doc(html))

    def test_page_without_subjects_raises(self):
        with self.assertRaisesRegex(ValueError, "no subject"):
            usp.parse_curriculum(doc("<table><tr><td>Disciplinas Obrigatórias</td></tr></table>"))

    def test_subject_outside_a_section_and_term_raises(self):
        html = '<table><tr><td><a href="obterDisciplina?sgldis=X1">X1</a></td><td>Name</td><td>4</td><td>0</td><td>60</td></tr></table>'
        with self.assertRaisesRegex(ValueError, "outside a section"):
            usp.parse_curriculum(doc(html))


class FakeConn:
    """Answers the staged-count query and records everything else."""

    def __init__(self, staged):
        self.staged, self.calls = staged, []

    def execute(self, sql, params=None):
        self.calls.append(sql)
        return self

    def fetchone(self):
        return (self.staged if "count(*)" in self.calls[-1] else 7,)

    def cursor(self):
        raise AssertionError("must not reach COPY")


class LoadSubjectsTest(unittest.TestCase):
    def test_too_few_subjects_raise_before_deleting(self):
        conn = FakeConn(staged=10)
        with self.assertRaisesRegex(ValueError, "check its format"):
            curricula.load_subjects(conn, 1, [(1, 1, "A", 60, False)] * 4)
        self.assertEqual(len(conn.calls), 1)  # only the count query: nothing deleted

    def test_half_or_more_passes_the_guard(self):
        class Stop(Exception):
            pass

        def cursor():
            raise Stop

        conn = FakeConn(staged=10)
        conn.cursor = cursor  # reached only after the delete
        with self.assertRaises(Stop):
            curricula.load_subjects(conn, 1, [(1, 1, "A", 60, False)] * 5)
        self.assertIn("delete from staging.curriculum_subjects", conn.calls[1])


class ParseDisciplineTest(unittest.TestCase):
    def test_reads_code_name_topics_and_bibliography(self):
        code, name, topics, bibliography = usp.parse_discipline(io.BytesIO(DIREITO))
        self.assertEqual((code, name), ("DFD0117", "Introdução ao Estudo do Direito I"))
        self.assertEqual(len(topics), 35)
        self.assertTrue(topics[0].startswith("1. O conceito de direito"))
        self.assertTrue(bibliography[0].startswith("BOBBIO, Norberto."))

    def test_bibliography_keeps_titles_without_group_labels(self):
        bibliography = usp.parse_discipline(io.BytesIO(DIREITO))[3]
        self.assertNotIn("Bibliografia complementar", bibliography)
        self.assertFalse([t for t in bibliography if usp.LABEL.match(t)])

    def test_topics_are_none_when_the_block_only_holds_bibliography(self):
        code, _, topics, bibliography = usp.parse_discipline(io.BytesIO(MICRO))
        self.assertEqual(code, "EAE1101")
        self.assertIsNone(topics)
        self.assertTrue(bibliography)

    def test_cuts_topics_at_the_first_label_and_drops_empty_lines(self):
        page = (
            "<b>Disciplina: ABC1 - Teste</b><br><b>Conteúdo Programático</b><pre>1. Um<br><br>2. Dois<br>"
            "Bibliografia<br>KRUGMAN. Livro.</pre>"
            "<b>Bibliografia</b><pre>Livros texto:<br>SILVA. Obra.<br>(ver mais)<br></pre>"
        )
        self.assertEqual(usp.parse_discipline(doc(page))[2:], (["1. Um", "2. Dois"], ["SILVA. Obra."]))

    def test_rejects_a_page_without_the_heading(self):
        with self.assertRaises(ValueError):
            usp.parse_discipline(doc("<html>nada</html>"))


class LoadDisciplineLocalDbTest(unittest.TestCase):
    """The upsert and the link are SQL: run them against the local stack, rolled back."""

    URL = BASE + "obterDisciplina?sgldis=TST1&codcur={}&codhab=1"
    GRADE = BASE + "gradeCurricular?codcg=1&codcur={}&codhab=1&tipo=N"

    def setUp(self):
        try:
            self.conn = psycopg.connect(LOCAL_DB, connect_timeout=2)
        except psycopg.OperationalError as error:
            self.skipTest(f"local Supabase is not reachable: {error}")
        self.addCleanup(self.conn.close)  # never committed: closing rolls everything back
        self.institution = self.conn.execute("select id from public.institutions where inep_code = 55").fetchone()
        if not self.institution:
            seed = self.conn.execute(
                "insert into sources (adapter, url, label) values ('t_inst', 'https://example.test/usp-inst', 'census') returning id"
            ).fetchone()[0]
            self.conn.execute(
                "insert into public.institutions (inep_code, name, kind, source_id) values (55, 'USP test', 'public', %s)",
                (seed,),
            )
            self.institution = self.conn.execute("select id from public.institutions where inep_code = 55").fetchone()
        self.parsed = ("TST1", "Cálculo I", ["Limites", "Derivadas"], ["STEWART. Cálculo."])

    def source(self, adapter, url):
        return self.conn.execute(
            "insert into sources (adapter, url, label) values (%s, %s, 'test') returning id", (adapter, url)
        ).fetchone()[0]

    def course_with_subject(self, codcur, name="Cálculo I"):
        """A grade source for codcur with one subject; returns that subject's id."""
        grade = self.source("usp_curriculum", self.GRADE.format(codcur))
        course = self.conn.execute(
            """insert into public.courses (inep_code, institution_id, name, degree, city, source_id)
               values (%s, %s, %s, 'bacharelado', 'São Paulo', %s) returning id""",
            (990000 + codcur, self.institution[0], f"Curso {codcur}", grade),
        ).fetchone()[0]
        return self.conn.execute(
            "insert into public.curriculum_subjects (course_id, name, source_id) values (%s, %s, %s) returning id",
            (course, name, grade),
        ).fetchone()[0]

    def linked(self, subject_id):
        return self.conn.execute(
            "select discipline_id from public.curriculum_subjects where id = %s", (subject_id,)
        ).fetchone()[0]

    def test_links_only_the_course_with_the_matching_codcur(self):
        mine, other = self.course_with_subject(8801), self.course_with_subject(8802)
        usp.load_discipline(self.conn, self.source("usp_discipline", self.URL.format(8801)), self.parsed)
        self.assertIsNotNone(self.linked(mine))
        self.assertIsNone(self.linked(other))

    def test_loading_twice_writes_no_discipline_row_the_second_time(self):
        self.course_with_subject(8801)
        source = self.source("usp_discipline", self.URL.format(8801))
        self.assertEqual(usp.load_discipline(self.conn, source, self.parsed), 2)  # 1 upsert + 1 link
        self.assertEqual(usp.load_discipline(self.conn, source, self.parsed), 0)  # neither the row nor the link changes
        self.assertEqual(self.conn.execute("select count(*) from public.disciplines where code = 'TST1'").fetchone()[0], 1)

    def test_raises_when_no_subject_matches(self):
        self.course_with_subject(8801, name="Física I")
        source = self.source("usp_discipline", self.URL.format(8801))
        with self.assertRaises(ValueError):
            usp.load_discipline(self.conn, source, self.parsed)


if __name__ == "__main__":
    unittest.main()
