import io
import unittest
from pathlib import Path

from engine import ufscar
from tests.fakes import FakeConn

FIXTURES = Path(__file__).parent / "fixtures" / "ufscar"
BASE = "https://www.prograd.ufscar.br/pt-br/cursos/cursos-oferecidos/"
ASSETS = "https://www.prograd.ufscar.br/pt-br/assets/arquivos/cursos/cursos-oferecidos/ciencias-da-computacao/"


def read(name):
    return (FIXTURES / name).read_text(encoding="utf-8")


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


def pdf(name):
    return io.BytesIO((FIXTURES / name).read_bytes())


class ParseListAndCourseTest(unittest.TestCase):
    def test_list_yields_each_course_page_with_a_label_and_ignores_other_links(self):
        self.assertEqual(
            ufscar.parse_list(doc(read("ufscar_course_list.html"))),
            [
                (BASE + "administracao/administracao", "UFSCar, curso: Administração"),
                (BASE + "agroecologia/agroecologia", "UFSCar, curso: Agroecologia"),
                (BASE + "ciencia-da-computacao/ciencia-da-computacao", "UFSCar, curso: Ciência da Computação"),
            ],
        )

    def test_empty_list_raises(self):
        with self.assertRaisesRegex(ValueError, "no course found"):
            ufscar.parse_list(doc("<ul></ul>"))

    def test_course_page_lists_each_campus_page(self):
        self.assertEqual(
            ufscar.parse_course(doc(read("ufscar_ciencia_da_computacao.html"))),
            [
                (BASE + "ciencia-da-computacao/sao-carlos", "UFSCar, campus: Ciência da Computação - São Carlos"),
                (BASE + "ciencia-da-computacao/sorocaba", "UFSCar, campus: Ciência da Computação - Sorocaba"),
            ],
        )

    def test_course_without_campus_links_raises(self):
        with self.assertRaisesRegex(ValueError, "no campus link"):
            ufscar.parse_course(doc('<h1 class="documentFirstHeading">X</h1>'))

    def test_register_writes_one_source_per_page_of_the_adapter(self):
        conn = FakeConn()
        ufscar.courses.load(conn, 1, [(BASE + "a/a", "UFSCar, curso: A")])
        self.assertEqual(conn.calls[0][1], ("ufscar_course", BASE + "a/a", "UFSCar, curso: A"))


class ParseCampusTest(unittest.TestCase):
    def test_newest_matriz_degree_suffix_shift_and_city_from_the_heading(self):
        self.assertEqual(
            ufscar.parse_campus(doc(read("ufscar_ciencia_da_computacao_sao_carlos.html"))),
            [(ASSETS + "matriz_curricular_bacharelado_ciencia-da-computacao_2025.pdf", "Ciência da Computação - Bacharelado",
              "Integral - Matutino e Vespertino", "São Carlos")],
        )

    def test_other_tipo_leaves_the_name_without_a_suffix_and_no_turno_is_none(self):
        html = read("ufscar_ciencia_da_computacao_sao_carlos.html").replace("Bacharelado</li>", "Tecnólogo</li>")
        html = html.replace("<strong>Turno:</strong>", "<strong>Outro:</strong>")
        self.assertEqual(ufscar.parse_campus(doc(html))[0][1:], ("Ciência da Computação", None, "São Carlos"))

    def test_heading_without_a_campus_raises(self):
        with self.assertRaisesRegex(ValueError, "no campus in the heading"):
            ufscar.parse_campus(doc(read("ufscar_ciencia_da_computacao_sao_carlos.html").replace(" - São Carlos", "")))

    def test_page_without_a_matriz_pdf_raises(self):
        with self.assertRaisesRegex(ValueError, "no matriz curricular PDF"):
            ufscar.parse_campus(doc(read("ufscar_ciencia_da_computacao_sao_carlos.html").replace("Matriz Curricular", "Outro")))


class ParseCurriculumTest(unittest.TestCase):
    """Approach: a tiny PDF drawn with reportlab (a one-off, not a test dependency), each word at the x/y of the real matriz."""

    def test_first_semester_exact_and_year(self):
        subjects = ufscar.parse_curriculum(pdf("ufscar_matriz.pdf"))
        self.assertEqual(
            [s for s in subjects if s[0] == 1],
            [
                (1, 1, "Cálculo Diferencial e Integral 1", 90, False),
                (1, 1, "Introdução ao Pensamento Algorítmico", 30, False),
                (1, 1, "Construção de Algoritmos e Programação", 120, False),
                (1, 1, "Lógica Digital", 90, False),
            ],
        )
        self.assertEqual({s[0]: s[1] for s in subjects}, {1: 1, 2: 1, 3: 2})

    def test_wrapped_cells_join_into_one_name_and_requisites_stay_out(self):
        names = [s[2] for s in ufscar.parse_curriculum(pdf("ufscar_matriz.pdf"))]
        self.assertIn("Disciplina Optativa de Humanas e Complementares", names)  # name wrapped over two lines
        self.assertIn("Algoritmos e Estruturas de Dados 1", names)  # its requisite is 'Construção de Algoritmos e Programação'
        self.assertEqual(len(names), 16)

    def test_optativo_is_elective_obrigatorio_is_not(self):
        subjects = ufscar.parse_curriculum(pdf("ufscar_matriz.pdf"))
        self.assertEqual([s[2] for s in subjects if s[4]], ["Disciplina Optativa de Humanas e Complementares"])

    def test_pdf_without_text_returns_no_subject_until_ocr_exists(self):
        self.assertEqual(ufscar.parse_curriculum(pdf("ufscar_outlined.pdf")), [])

    def test_text_pdf_without_subjects_raises(self):
        with self.assertRaisesRegex(ValueError, "no subject found"):
            ufscar.parse_curriculum(pdf("ufscar_no_subject.pdf"))


if __name__ == "__main__":
    unittest.main()
