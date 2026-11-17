import io
import unittest
from pathlib import Path

from engine import curricula, usp

FIXTURES = Path(__file__).parent / "fixtures" / "usp"
LIST = (FIXTURES / "usp_course_list_45.html").read_bytes()
GRADE = (FIXTURES / "usp_grade_45052.html").read_bytes()
BASE = "https://uspdigital.usp.br/jupiterweb/"


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

    def test_two_campuses_raise(self):
        two = LIST.replace(b"Campus:", b"Campus: Ribeir\xe3o Preto - X</span></td></tr><tr><td>Campus:", 1)
        with self.assertRaisesRegex(ValueError, "one campus"):
            usp.parse_courses(io.BytesIO(two))

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


if __name__ == "__main__":
    unittest.main()
