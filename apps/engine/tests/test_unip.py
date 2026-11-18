import io
import json
import unittest
from pathlib import Path

from engine import unip
from tests.fakes import FakeConn

FIXTURES = Path(__file__).parent / "fixtures" / "unip"
COURSES = (FIXTURES / "unip_course_list.json").read_bytes()
UNITS = (FIXTURES / "unip_localidades_all.json").read_bytes()
GRADE = (FIXTURES / "unip_grade_presencial.html").read_text(encoding="utf-8")
SITE = "https://www.unip.br/cursos/graduacao/"


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


class ParseCoursesTest(unittest.TestCase):
    def test_keeps_presencial_in_any_case_and_drops_digital_and_flex(self):
        self.assertEqual(
            unip.parse_courses(io.BytesIO(COURSES)),
            [
                (s, SITE + p, n) for s, p, n in (
                    ("administracao", "tradicionais/administracao.aspx", "Administração"),
                    ("analise-e-desenvolvimento-de-sistemas", "tecnologicos/analise_desenvolvimento_sistemas.aspx", "Análise e Desenvolvimento de Sistemas"),
                    ("biomedicina", "tradicionais/biomedicina.aspx", "Biomedicina"),
                    ("ciencia-da-computacao", "tradicionais/ciencia_computacao.aspx", "Ciência da Computação"),
                )
            ] + [("medicina", "https://unip.br/cursos/graduacao/tradicionais/medicina.aspx", "Medicina")],  # 'Presencial', not 'PRESENCIAL'
        )

    def test_a_course_in_two_modalities_is_one_entry(self):
        slugs = [c[0] for c in unip.parse_courses(io.BytesIO(COURSES))]
        self.assertEqual(len(slugs), len(set(slugs)))

    def test_no_presencial_course_raises(self):
        digital = json.dumps({"cursos": [{"slugNomeCurso": "x", "urlPaginaCurso": "u", "nomeFormatado": "X", "modalidade": "DIGITAL"}]})
        with self.assertRaisesRegex(ValueError, "no in-person"):
            unip.parse_courses(doc(digital))


class ParseUnitsTest(unittest.TestCase):
    def test_distinct_sp_cities_with_presencial_only(self):
        # fixture: two SÃO PAULO units, CAMPINAS, SANTOS, BAURU (SP, EAD only), BRASÍLIA (DF) and GOIÂNIA (GO) in person
        self.assertEqual(unip.parse_units(io.BytesIO(UNITS)), ["CAMPINAS", "SANTOS", "SÃO PAULO"])

    def test_empty_unit_list_raises(self):
        with self.assertRaisesRegex(ValueError, "no unit"):
            unip.parse_units(doc("[]"))

    def test_only_ead_or_non_sp_units_give_no_city(self):
        units = json.dumps([{"cidade": "BAURU", "uf": "SP", "ensino": "EAD"}, {"cidade": "MANAUS", "uf": "AM", "ensino": "PRESENCIAL; EAD"}])
        self.assertEqual(unip.parse_units(doc(units)), [])


class ParseCurriculumTest(unittest.TestCase):
    def setUp(self):
        self.subjects = unip.parse_curriculum(doc(GRADE))

    def test_subjects_have_only_name_and_elective_flag(self):
        self.assertEqual(len(self.subjects), 37)
        self.assertEqual(self.subjects[0], (None, None, "Análise e Projetos de Sistemas", None, False))
        self.assertTrue(all(s[:2] == (None, None) and s[3] is None for s in self.subjects))

    def test_optativa_suffix_marks_electives_and_stays_in_the_name(self):
        self.assertEqual(
            [s[2:] for s in self.subjects if s[4]],
            [("Desenvolvimento Mobile com Javascript (Optativa)", None, True), ("Desenvolvimento Webassembly (Optativa)", None, True)],
        )

    def test_entities_are_decoded_and_the_header_row_is_skipped(self):
        names = [s[2] for s in self.subjects]
        self.assertIn("Engenharia de Software Ágil", names)
        self.assertNotIn("DISCIPLINAS", names)

    def test_page_without_the_presencial_grade_raises(self):
        with self.assertRaisesRegex(ValueError, "no in-person grade"):
            unip.parse_curriculum(doc(GRADE.replace("pills-gradepresencial", "x")))

    def test_grade_without_rows_raises(self):
        with self.assertRaisesRegex(ValueError, "no subject"):
            unip.parse_curriculum(doc('<div id="pills-gradepresencial"><table></table></div>'))


class LoadTest(unittest.TestCase):
    def test_load_courses_registers_units_and_page_sources_per_course(self):
        conn = FakeConn()
        written = unip.load_courses(conn, 1, [("medicina", "https://unip.br/m.aspx", "Medicina")])
        self.assertEqual(written, 2)
        self.assertEqual(
            [c[1] for c in conn.calls],
            [
                ("unip_units", f"{unip.API}/localidades/medicina/undefined/undefined/UnidadesProximaslatlong/1000", "UNIP, unidades do curso: Medicina"),
                ("unip_curriculum", "https://unip.br/m.aspx", "UNIP, grade curricular: Medicina"),
            ],
        )

    def test_load_units_stages_the_page_once_per_city_for_every_unit(self):
        conn = FakeConn([("UNIP, unidades do curso: Medicina",), ("https://unip.br/m.aspx",), (7,), (7,)])
        unip.units.load(conn, 1, ["CAMPINAS", "SANTOS"])
        staged = [c[1] for c in conn.calls if "staging.curriculum_courses" in c[0]]
        self.assertEqual([p[2:] for p in staged], [("Medicina", "CAMPINAS", None, True, None), ("Medicina", "SANTOS", None, True, None)])
        self.assertEqual({p[1] for p in staged}, {unip.INEP_CODE})

    def test_load_units_without_a_registered_page_raises(self):
        conn = FakeConn([("UNIP, unidades do curso: Medicina",), None])
        with self.assertRaisesRegex(LookupError, "run unip_courses first"):
            unip.units.load(conn, 1, ["SANTOS"])


if __name__ == "__main__":
    unittest.main()
