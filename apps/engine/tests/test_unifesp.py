import io
import unittest
from pathlib import Path

from engine import unifesp

FIXTURES = Path(__file__).parent / "fixtures" / "unifesp"
LIST = (FIXTURES / "unifesp_campus_1_courses.html").read_text(encoding="utf-8")
MATRIX = (FIXTURES / "unifesp_matrix_1671.html").read_text(encoding="utf-8")
URL = "https://cursos.siiu.unifesp.br/graduacao/curso/matriz-curricular/"


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


class ParseCoursesTest(unittest.TestCase):
    def test_active_matrix_url_name_shift_and_city_exact(self):
        self.assertEqual(
            unifesp.parse_courses(doc(LIST)),
            [
                (URL + "eyJjdXJzb19pZF9jdXJzbyI6IjIyMDciLCJjb2QiOiI0In0=/detalhes", "BIOMEDICINA", "INTEGRAL", "SÃO PAULO"),
                (URL + "eyJjdXJzb19pZF9jdXJzbyI6IjIwNjAiLCJjb2QiOiIyIn0=/detalhes", "CURSO SUPERIOR DE TECNOLOGIA EM RADIOLOGIA", "INTEGRAL", "SÃO PAULO"),
                (URL + "eyJjdXJzb19pZF9jdXJzbyI6IjUiLCJjb2QiOiIzIn0=/detalhes", "ENFERMAGEM - BACHAREL", "INTEGRAL", "SÃO PAULO"),
            ],
        )

    def test_course_without_a_single_active_matrix_is_skipped(self):
        no_active = LIST.replace("000004 - ATIVA", "000004 - INATIVA")
        self.assertEqual([c[1] for c in unifesp.parse_courses(doc(no_active))][0], "CURSO SUPERIOR DE TECNOLOGIA EM RADIOLOGIA")

    def test_two_active_matrices_are_ambiguous_and_skipped(self):
        two = LIST.replace("000001 - INATIVA", "000001 - ATIVA", 1)
        self.assertNotIn("BIOMEDICINA", [c[1] for c in unifesp.parse_courses(doc(two))])

    def test_regional_campus_names_become_their_city(self):
        for campus, city in (("BAIXADA SANTISTA", "Santos"), ("ZONA LESTE", "São Paulo"), ("OSASCO", "OSASCO")):
            with self.subTest(campus):
                got = unifesp.parse_courses(doc(LIST.replace("</strong>SÃO PAULO</p>", f"</strong>{campus}</p>")))
                self.assertEqual({c[3] for c in got}, {city})

    def test_name_without_a_shift_keeps_shift_none(self):
        # real rows without a trailing shift exist, e.g. 'CURSO SUPERIOR DE TECNOLOGIA EM DESIGN EDUCACIONAL'
        got = unifesp.parse_courses(doc(LIST.replace("BIOMEDICINA - INTEGRAL", "BIOMEDICINA")))
        self.assertEqual(got[0][1:3], ("BIOMEDICINA", None))

    def test_list_without_an_active_course_raises(self):
        with self.assertRaisesRegex(ValueError, "no course"):
            unifesp.parse_courses(doc(LIST.replace("ATIVA", "INATIVA").replace("ININATIVA", "INATIVA")))


class ParseCurriculumTest(unittest.TestCase):
    def setUp(self):
        self.subjects = unifesp.parse_curriculum(doc(MATRIX))

    def test_subjects_per_termo_with_hours_and_exact_tuples(self):
        self.assertEqual(
            [s for s in self.subjects if s[0] == 2],
            [(2, None, "ALGORITMOS E ESTRUTURAS DE DADOS I", 72, None), (2, None, "ANATOMIA", 36, None)],
        )
        self.assertEqual([s[0] for s in self.subjects], [1, 1, 1, 2, 2, 3, 3])

    def test_year_and_is_elective_are_none(self):
        self.assertTrue(all(s[1] is None and s[4] is None for s in self.subjects))

    def test_hidden_equivalence_rows_are_not_subjects(self):
        names = [s[2] for s in self.subjects]
        self.assertIn("CÁLCULO EM UMA VARIÁVEL", names)
        self.assertNotIn("CÁLCULO DIFERENCIAL E INTEGRAL I", names)

    def test_criteria_section_is_not_read(self):
        extra = '<tr><td>9</td><td>X</td><td>1</td><td>1</td><td>2</td><td>-</td><td></td></tr>'
        head, sep, tail = MATRIX.partition("Critérios de integralização</strong></h5>")
        self.assertEqual(len(unifesp.parse_curriculum(doc(head + sep + extra + tail))), len(self.subjects))

    def test_zero_total_hours_become_none(self):
        zero = MATRIX.replace('data-th="Carga Horária">36<', 'data-th="Carga Horária">0<', 1)
        self.assertIsNone(unifesp.parse_curriculum(doc(zero))[1][3])

    def test_non_numeric_hours_raise(self):
        bad = MATRIX.replace('data-th="Carga Horária">36<', 'data-th="Carga Horária">-<', 1)
        with self.assertRaisesRegex(ValueError, "unexpected hours"):
            unifesp.parse_curriculum(doc(bad))

    def test_matrix_without_units_raises(self):
        with self.assertRaisesRegex(ValueError, "no curricular unit"):
            unifesp.parse_curriculum(doc("<html>Critérios de integralização</strong></h5></html>"))



class UnpublishedStructureTest(unittest.TestCase):
    def test_a_matriz_with_no_structure_raises(self):
        page = (FIXTURES / "unifesp_no_structure.html").read_text(encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "publishes no curricular structure"):
            unifesp.parse_curriculum(doc(page))

    def test_a_complementar_pool_without_a_termo_raises(self):
        page = (FIXTURES / "unifesp_abi_complementar.html").read_text(encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "only a 'Formação complementar' pool, with no termo"):
            unifesp.parse_curriculum(doc(page))

if __name__ == "__main__":
    unittest.main()
