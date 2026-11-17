import io
import unittest
from pathlib import Path

from engine import mackenzie

FIXTURES = Path(__file__).parent / "fixtures" / "mackenzie"
LIST = (FIXTURES / "mackenzie_course_list.html").read_text(encoding="utf-8")
MATRIZ = (FIXTURES / "mackenzie_ciencia_da_computacao_matriz.html").read_text(encoding="utf-8")
BASE = "https://www.mackenzie.br/graduacao/"
TAB_2026 = '<a class="nav-link active" href="#tab-content-14874"'
TAB_2018 = '<a class="nav-link " href="#tab-content-380043"'


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


class ParseCoursesTest(unittest.TestCase):
    def test_sp_region_courses_get_matriz_url_and_campus_city_exact(self):
        self.assertEqual(
            mackenzie.parse_courses(doc(LIST)),
            [
                (BASE + "sao-paulo-higienopolis/administracao/matriz-curricular", "Administração", None, "São Paulo"),
                (BASE + "sao-paulo-higienopolis/ciencia-da-computacao/matriz-curricular", "Ciência da Computação", None, "São Paulo"),
                (BASE + "alphaville-tambore/administracao/matriz-curricular", "Administração", None, "Barueri"),
                (BASE + "campinas/administracao/matriz-curricular", "Administração", None, "Campinas"),
            ],
        )

    def test_a_course_listed_twice_appears_once(self):
        urls = [c[0] for c in mackenzie.parse_courses(doc(LIST))]
        self.assertEqual(len(urls), len(set(urls)))

    def test_slugs_without_a_published_address_are_left_out(self):
        urls = " ".join(c[0] for c in mackenzie.parse_courses(doc(LIST)))
        for slug in ("ead", "universidade-campus-alphaville", "brasilia"):
            self.assertNotIn(f"/graduacao/{slug}/", urls)

    def test_a_non_sp_address_does_not_make_its_slug_a_campus(self):
        self.assertIn(">DF<", LIST)  # the fixture keeps the real Brasília address
        self.assertNotIn("Brasília", {c[3] for c in mackenzie.parse_courses(doc(LIST))})

    def test_a_campus_losing_its_address_loses_its_courses(self):
        start = LIST.rindex("<address", 0, LIST.index("universidade/campinas/"))
        no_campinas = LIST[:start] + LIST[LIST.index("</address>", start) + len("</address>"):]
        self.assertNotIn("Campinas", {c[3] for c in mackenzie.parse_courses(doc(no_campinas))})

    def test_entities_in_course_names_are_unescaped(self):
        html = LIST.replace("<span>Administração</span>", "<span>Administra&ccedil;&atilde;o &amp; Gest&atilde;o</span>", 1)
        self.assertEqual(mackenzie.parse_courses(doc(html))[0][1], "Administração & Gestão")

    def test_no_sp_address_raises(self):
        with self.assertRaisesRegex(ValueError, "no SP campus"):
            mackenzie.parse_courses(doc(LIST.replace(">SP<", ">XX<")))

    def test_no_address_at_all_raises(self):
        with self.assertRaisesRegex(ValueError, "no SP campus"):
            mackenzie.parse_courses(doc("<html></html>"))

    def test_no_course_links_raise(self):
        with self.assertRaisesRegex(ValueError, "no course"):
            mackenzie.parse_courses(doc(LIST.replace('href="/graduacao/', 'href="/x/')))


class ParseCurriculumTest(unittest.TestCase):
    def setUp(self):
        self.subjects = mackenzie.parse_curriculum(doc(MATRIZ))

    def test_first_etapa_of_the_active_2026_version_exact(self):
        self.assertEqual(
            [s for s in self.subjects if s[0] == 1],
            [(1, 1, n, None, False) for n in (
                "ALGORITMOS E PROGRAMAÇÃO I",
                "CIÊNCIA, TECNOLOGIA E SOCIEDADE NA COMPUTAÇÃO",
                "CIRCUITOS ELÉTRICOS E ELETRÔNICOS",
                "CÁLCULO PARA CIÊNCIA DA COMPUTAÇÃO",
                "MATEMÁTICA DISCRETA I",
                "ÉTICA E CIDADANIA",
            )],
        )

    def test_second_etapa_is_also_year_one(self):
        second = [(y, n) for t, y, n, h, e in self.subjects if t == 2]
        self.assertEqual(len(second), 6)
        self.assertEqual({y for y, _ in second}, {1})
        self.assertIn((1, "BANCO DE DADOS I"), second)

    def test_the_2018_version_is_excluded(self):
        names = {n for t, y, n, h, e in self.subjects}
        self.assertNotIn("FUNDAMENTOS DE CIÊNCIA DA COMPUTAÇÃO", names)  # 2018 etapa 1
        self.assertFalse(any(n.startswith("OPTATIVA") for n in names))
        self.assertEqual({t for t, *_ in self.subjects}, {1, 2})

    def test_hours_are_none_and_nothing_is_elective(self):
        self.assertTrue(all(h is None and e is False for t, y, n, h, e in self.subjects))

    def test_2026_is_picked_because_its_version_tab_is_active(self):
        self.assertIn(TAB_2026, MATRIZ)  # both versions' etapa-1 panes are 'active in'; only the tab tells them apart
        self.assertIn("ÉTICA E CIDADANIA", {n for t, y, n, h, e in self.subjects})

    def test_only_optativa_names_are_electives_when_the_2018_tab_is_active(self):
        html = MATRIZ.replace(TAB_2026, TAB_2026.replace("nav-link active", "nav-link ")).replace(TAB_2018, TAB_2018.replace("nav-link ", "nav-link active"))
        subjects = mackenzie.parse_curriculum(doc(html))
        self.assertEqual({t for t, *_ in subjects}, {1, 2, 8})
        self.assertEqual([n for t, y, n, h, e in subjects if e], ["OPTATIVA I", "OPTATIVA II", "OPTATIVA III"])
        self.assertEqual([(t, y, h) for t, y, n, h, e in subjects if n == "ESTÁGIO OBRIGATÓRIO"], [(8, 4, None)])
        self.assertIn("FUNDAMENTOS DE CIÊNCIA DA COMPUTAÇÃO", {n for t, y, n, h, e in subjects})
        self.assertNotIn("BANCO DE DADOS I", {n for t, y, n, h, e in subjects})

    def test_a_single_version_page_without_tabs_works(self):
        html = MATRIZ[MATRIZ.index('<div id="tab-content-1a_etapa51295"'):MATRIZ.index('<div id="tab-content-1a_etapa380039"')]
        self.assertEqual(len(mackenzie.parse_curriculum(doc(html))), 12)

    def test_entities_in_subject_names_are_unescaped(self):
        html = MATRIZ.replace("ÉTICA E CIDADANIA", "&Eacute;TICA &amp; CIDADANIA", 1)
        self.assertIn("ÉTICA & CIDADANIA", {n for t, y, n, h, e in mackenzie.parse_curriculum(doc(html))})

    def test_two_versions_and_no_active_tab_raise(self):
        with self.assertRaisesRegex(ValueError, "no active curriculum"):
            mackenzie.parse_curriculum(doc(MATRIZ.replace("nav-link active", "nav-link")))

    def test_active_version_without_subjects_raises(self):
        html = '<div id="tab-content-1a_etapa1" class="tab-pane fade active in"><table><tr><th>Disciplina</th><th>Carga</th></tr></table></div>'
        with self.assertRaisesRegex(ValueError, "no subject"):
            mackenzie.parse_curriculum(doc(html))


if __name__ == "__main__":
    unittest.main()
