import io
import unittest
from pathlib import Path

from engine import fiap

FIXTURES = Path(__file__).parent / "fixtures" / "fiap"
LIST = (FIXTURES / "fiap_course_list.html").read_text(encoding="utf-8")
COURSE = (FIXTURES / "fiap_engenharia_de_software.html").read_text(encoding="utf-8")
BASE = "https://www.fiap.com.br/graduacao/"
ESCAPED_QUOTE = "\\" * 3 + '"'  # the JSON-LD sits inside a JS string inside the Next.js payload


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


class ParseCoursesTest(unittest.TestCase):
    def test_courses_exact_with_trailing_slash_and_the_campus_city(self):
        self.assertEqual(
            fiap.parse_courses(doc(LIST)),
            [
                (BASE + "tecnologo/agentes-inteligentes/", "Agentes Inteligentes", None, "São Paulo"),
                (BASE + "tecnologo/analise-e-desenvolvimento-de-sistemas/", "Análise e Desenvolvimento de Sistemas", None, "São Paulo"),
                (BASE + "tecnologo/banco-de-dados/", "Banco de Dados", None, "São Paulo"),
                (BASE + "bacharelado/administracao/", "Administração", None, "São Paulo"),
            ],
        )

    def test_the_call_to_action_duplicate_is_ignored(self):
        self.assertIn("Quero saber mais", LIST)
        courses = fiap.parse_courses(doc(LIST))
        self.assertEqual(len(courses), len({c[0] for c in courses}))
        self.assertNotIn("Quero saber mais", {c[1] for c in courses})

    def test_two_cities_raise(self):
        q = ESCAPED_QUOTE
        two = LIST.replace("</script>", f"{q}addressLocality{q}:{q}Barueri{q}</script>", 1)
        with self.assertRaisesRegex(ValueError, "one campus city"):
            fiap.parse_courses(doc(two))

    def test_no_city_raises(self):
        with self.assertRaisesRegex(ValueError, "one campus city"):
            fiap.parse_courses(doc(LIST.replace("addressLocality", "other")))

    def test_no_course_links_raise(self):
        with self.assertRaisesRegex(ValueError, "no course"):
            fiap.parse_courses(doc(LIST.replace("/graduacao/", "/x/")))


class ParseCurriculumTest(unittest.TestCase):
    def setUp(self):
        self.subjects = fiap.parse_curriculum(doc(COURSE))

    def test_year_one_has_the_eight_modules_exact(self):
        self.assertEqual(
            [s for s in self.subjects if s[1] == 1],
            [(None, 1, n, None, False) for n in (
                "Computational Thinking With Python",
                "Differentiated Problem Solving",
                "Edge Computing & Computer Systems",
                "Formação Social e Sustentabilidade",
                "Front-End Design",
                "Software & Total Experience Design",
                "Storytelling e Inspiração Empreendedora",
                "Web Development",
            )],
        )

    def test_year_two_modules_stay_in_year_two(self):
        second = [n for t, y, n, h, e in self.subjects if y == 2]
        self.assertEqual(len(second), 7)
        self.assertIn("Data Science & Statistical Computing", second)
        self.assertEqual({y for t, y, *_ in self.subjects}, {1, 2})

    def test_no_term_hours_or_electives(self):
        self.assertTrue(all(t is None and h is None and e is False for t, y, n, h, e in self.subjects))

    def test_page_without_year_blocks_raises(self):
        with self.assertRaisesRegex(ValueError, "no subject"):
            fiap.parse_curriculum(doc('<p class="styles_module-title__x">Orphan</p>'))

    def test_year_without_modules_raises(self):
        with self.assertRaisesRegex(ValueError, "no subject"):
            fiap.parse_curriculum(doc('<p class="styles_grade-year__x">1<!-- -->º Ano</p>'))


if __name__ == "__main__":
    unittest.main()
