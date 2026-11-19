import io
import unittest
from pathlib import Path
from unittest import mock

import psycopg

from engine import fiap
from tests.fakes import FakeConn

FIXTURES = Path(__file__).parent / "fixtures" / "fiap"
LIST = (FIXTURES / "fiap_course_list.html").read_text(encoding="utf-8")
COURSE = (FIXTURES / "fiap_engenharia_de_software.html").read_text(encoding="utf-8")
AI = (FIXTURES / "fiap_inteligencia_artificial.html").read_text(encoding="utf-8")
LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
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


class ParsePageTest(unittest.TestCase):
    def setUp(self):
        self.subjects, self.descriptions = fiap.parse_page(doc(AI))

    def test_subjects_are_parse_curriculums_with_ten_in_year_one(self):
        self.assertEqual(self.subjects, fiap.parse_curriculum(doc(AI)))
        self.assertEqual(len(self.subjects), 19)
        self.assertEqual(len([s for s in self.subjects if s[1] == 1]), 10)

    def test_every_subject_has_a_description(self):
        self.assertEqual([n for n, _ in self.descriptions], [s[2] for s in self.subjects])
        self.assertTrue(all(d for _, d in self.descriptions))

    def test_one_description_exact_and_entities_unescaped(self):
        descriptions = dict(self.descriptions)
        self.assertEqual(
            descriptions["Machine Learning & Modelling"],
            "Conceitos de lógica, modelagem matemática de sistemas físicos, inferência, lógica Fuzzy e técnicas de "
            "otimização. Aprenda técnicas de aprendizado de máquina como a regressão linear, regressão logística e "
            "árvores de decisão.",
        )
        self.assertIn("AI Computer Systems & Sensors", descriptions)
        self.assertFalse(any("&amp;" in n or "&amp;" in d for n, d in self.descriptions))

    def test_a_module_without_a_description_is_skipped_but_stays_a_subject(self):
        page = (
            '<p class="styles_grade-year__x">1<!-- -->º Ano</p>'
            '<p class="styles_module-title__x">Bare</p><div class="d"></div>'
            '<p class="styles_module-title__x">Told</p><p class="styles_module-description__x">  Text  </p>'
            '<p class="styles_module-title__x">Empty</p><p class="styles_module-description__x"> </p>'
        )
        subjects, descriptions = fiap.parse_page(doc(page))
        self.assertEqual([s[2] for s in subjects], ["Bare", "Told", "Empty"])
        self.assertEqual(descriptions, [("Told", "Text")])

    def test_a_repeated_name_keeps_its_first_description(self):
        page = (
            '<p class="styles_grade-year__x">1<!-- -->º Ano</p>'
            '<p class="styles_module-title__x">Dup</p><p class="styles_module-description__x">First</p>'
            '<p class="styles_module-title__x">Dup</p><p class="styles_module-description__x">Second</p>'
        )
        self.assertEqual(fiap.parse_page(doc(page))[1], [("Dup", "First")])

    def test_the_page_without_descriptions_has_none(self):
        subjects, descriptions = fiap.parse_page(doc(COURSE))
        self.assertEqual(subjects, fiap.parse_curriculum(doc(COURSE)))
        self.assertEqual(descriptions, [])


class LoadPageTest(unittest.TestCase):
    URL = BASE + "tecnologo/inteligencia-artificial/"

    def load(self, descriptions):
        conn = FakeConn([(self.URL,)])
        order = []
        with mock.patch.object(fiap.curricula, "load_subjects", side_effect=lambda *a: order.append(len(conn.calls)) or 5) as load:
            result = fiap.load_page(conn, 7, ([("s",)], descriptions))
        return conn, load, order, result

    def test_codes_are_the_course_path_plus_the_name(self):
        conn, *_ = self.load([("Web", "d1"), ("Data", "d2")])
        upserts = [c for c in conn.calls if c[0].startswith("insert into public.disciplines")]
        self.assertEqual(
            [c[1] for c in upserts],
            [("graduacao/tecnologo/inteligencia-artificial#Web", "Web", ["d1"], 7, 852), ("graduacao/tecnologo/inteligencia-artificial#Data", "Data", ["d2"], 7, 852)],
        )
        self.assertEqual(conn.calls[1][1], (7, ["graduacao/tecnologo/inteligencia-artificial#Web", "graduacao/tecnologo/inteligencia-artificial#Data"]))

    def test_delete_first_then_upserts_then_load_subjects_last(self):
        conn, load, order, result = self.load([("Web", "d1"), ("Data", "d2")])
        sqls = [c[0] for c in conn.calls]
        self.assertTrue(sqls[0].startswith("select url from sources"))
        self.assertTrue(sqls[1].startswith("delete from public.disciplines where source_id"))
        self.assertTrue(all(q.startswith("insert into public.disciplines") for q in sqls[2:]))
        self.assertEqual(len(sqls), 4)
        self.assertEqual(order, [4])  # load_subjects ran after all four executes
        load.assert_called_once_with(conn, 7, [("s",)])
        self.assertEqual(result, 1 + 2 + 5)  # delete + upserts (FakeConn rowcount 1 each) + load_subjects

    def test_the_module_wires_parse_and_load(self):
        self.assertIs(fiap.curriculum.parse, fiap.parse_page)
        self.assertIs(fiap.curriculum.load, fiap.load_page)


class LoadPageLocalDbTest(unittest.TestCase):
    URL = BASE + "tecnologo/inteligencia-artificial/"

    def setUp(self):
        try:
            self.conn = psycopg.connect(LOCAL_DB, connect_timeout=2)
        except psycopg.OperationalError as error:
            self.skipTest(f"local Supabase is not reachable: {error}")
        self.addCleanup(self.conn.close)  # never committed: closing rolls everything back
        run = self.conn.execute
        base = run("insert into sources (adapter, url, label, last_fetched_at) values ('inep_census', 'https://example.test/fiap-census', 'c', now()) returning id").fetchone()[0]
        run("""insert into institutions (inep_code, name, kind, source_id) values (852, 'FIAP', 'private', %s)
               on conflict (inep_code) do nothing""", (base,))
        run("""insert into courses (inep_code, institution_id, name, degree, shift, duration_years, city, source_id)
               select 9990021, id, 'Inteligência Artificial', 'tecnologico', 'noturno', 2, 'São Paulo', %s
               from institutions where inep_code = 852""", (base,))
        fiap.courses.load(self.conn, 0, [(self.URL, "Inteligência Artificial", None, "São Paulo")])
        self.source = run("select id from sources where url = %s", (self.URL,)).fetchone()[0]

    def disciplines(self):
        return dict(self.conn.execute("select code, topics from public.disciplines where source_id = %s", (self.source,)).fetchall())

    def unlinked(self, year):
        return self.conn.execute(
            "select count(*) from public.curriculum_subjects where source_id = %s and year = %s and discipline_id is null",
            (self.source, year)).fetchone()[0]

    def test_load_creates_the_disciplines_links_every_subject_and_a_rerun_changes_nothing(self):
        parsed = fiap.parse_page(doc(AI))
        fiap.curriculum.load(self.conn, self.source, parsed)
        found = self.disciplines()
        self.assertEqual(len(found), 19)
        code = "graduacao/tecnologo/inteligencia-artificial#Machine Learning & Modelling"
        self.assertEqual(found[code], [dict(parsed[1])["Machine Learning & Modelling"]])
        year_one = self.conn.execute(
            "select count(*) from public.curriculum_subjects where source_id = %s and year = 1", (self.source,)).fetchone()[0]
        self.assertEqual(year_one, 10)
        self.assertEqual((self.unlinked(1), self.unlinked(2)), (0, 0))
        self.assertEqual(fiap.curriculum.load(self.conn, self.source, parsed), 0)

    def test_a_subject_renamed_on_the_page_loses_its_old_discipline(self):
        fiap.curriculum.load(self.conn, self.source, fiap.parse_page(doc(AI)))
        renamed = AI.replace("Machine Learning &amp; Modelling", "Machine Learning Renamed")
        fiap.curriculum.load(self.conn, self.source, fiap.parse_page(doc(renamed)))
        codes = set(self.disciplines())
        prefix = "graduacao/tecnologo/inteligencia-artificial#"
        self.assertNotIn(prefix + "Machine Learning & Modelling", codes)
        self.assertIn(prefix + "Machine Learning Renamed", codes)
        self.assertEqual(len(codes), 19)
        self.assertEqual(self.unlinked(1), 0)


class LoadCoursesTest(unittest.TestCase):
    def test_load_passes_every_unit_true(self):
        with mock.patch.object(fiap.curricula, "load_courses") as load_courses:
            fiap.courses.load("conn", 1, [])
        self.assertIs(load_courses.call_args.kwargs.get("every_unit"), True)


if __name__ == "__main__":
    unittest.main()
