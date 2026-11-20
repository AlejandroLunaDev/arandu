import io
import unittest
from pathlib import Path
from unittest import mock

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

    def test_one_campus_page_returns_its_own_matriz(self):
        self.assertEqual(
            ufscar.parse_course(doc(read("ufscar_economicas.html"))),
            [("https://www.prograd.ufscar.br/pt-br/assets/arquivos/cursos/cursos-oferecidos/ciencias-economicas/"
              "matriz-curricular-do-curso-de-ciencias-economicas-2026.pdf", "Ciências Econômicas - Bacharelado",
              "Integral - Matutino e Vespertino", "Sorocaba")],
        )

    def test_page_without_campus_links_and_campus_field_raises(self):
        html = read("ufscar_economicas.html").replace("<strong>Campus: </strong>", "<strong>Outro: </strong>")
        with self.assertRaisesRegex(ValueError, "no campus link and no campus field"):
            ufscar.parse_course(doc(html))

    def test_course_load_registers_campus_links_and_loads_matriz_tuples(self):
        conn = FakeConn()
        with mock.patch.object(ufscar, "_register", return_value=2) as register,                 mock.patch.object(ufscar.curricula, "load_courses", return_value=1) as load_courses:
            links = [(BASE + "a/sorocaba", "UFSCar, campus: A - Sorocaba")]
            self.assertEqual(ufscar.course.load(conn, 1, links), 2)
            register.assert_called_once_with(conn, "ufscar_campus", links)
            load_courses.assert_not_called()
            matriz = [("https://x/m.pdf", "A - Bacharelado", None, "Sorocaba")]
            self.assertEqual(ufscar.course.load(conn, 1, matriz), 1)
            load_courses.assert_called_once_with(conn, "ufscar_curriculum", 7, "UFSCar, matriz curricular", matriz)
            register.assert_called_once()

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

    def test_lagoa_do_sino_is_the_city_of_buri(self):
        html = read("ufscar_ciencia_da_computacao_sao_carlos.html").replace(" - São Carlos", " - Lagoa do Sino")
        self.assertEqual(ufscar.parse_campus(doc(html))[0][3], "Buri")

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


class TableMatrizTest(unittest.TestCase):
    """Ruled matrices, page 1 of the real PDFs (outlines, structure tree and images stripped)."""

    def first(self, name):
        return [s[2] for s in ufscar.parse_curriculum(pdf(name)) if s[0] == 1]

    def test_semester_in_a_one_cell_row(self):
        self.assertEqual(self.first("ufscar_pedagogia_sao_carlos_p1.pdf"), [
            "Filosofia da Educação I", "História da Educação I", "Sociologia Sociedade e Educação",
            "Metodologia de Pesquisa Científica", "Didáticas e Educação das Relações Étnicos Raciais"])

    def test_semester_in_a_perfil_heading_above_the_table(self):
        self.assertEqual(self.first("ufscar_quimica_sao_carlos_p1.pdf"), [
            "Química Geral", "Química Experimental Geral", "Química Analítica Geral",
            "Geometria Analítica", "Cálculo 1", "Física 1"])

    def test_semester_in_a_primeiro_periodo_heading(self):
        self.assertEqual(self.first("ufscar_fisica_sao_carlos_p1.pdf"), [
            "Geometria Analítica", "Cálculo Diferencial e Integral 1", "Introdução à Física",
            "Métodos de Física Experimental", "Introdução à Prática de Ensino de Física"])

    def test_p_and_cht_headers_are_the_period_and_hours_columns(self):
        subjects = ufscar.parse_curriculum(pdf("ufscar_economicas_p_cht.pdf"))
        self.assertEqual(len(subjects), 74)
        self.assertEqual(subjects[0], (1, 1, "CONTABILIDADE E ANÁLISE FINANCEIRA", 30, False))
        self.assertEqual({s[0] for s in subjects}, set(range(1, 9)))

    def test_total_da_disciplina_heads_hours_not_names(self):
        subjects = ufscar.parse_curriculum(pdf("ufscar_ambiental_total_da_disciplina.pdf"))
        self.assertEqual(len(subjects), 74)
        names = {s[2] for s in subjects}
        for name in ("Metodologia científica", "Educação ambiental", "Economia e finanças", "Resíduos sólidos"):
            self.assertIn(name, names)
        self.assertEqual([s[2] for s in subjects if s[0] == 1], [
            "Introdução à Engenharia Ambiental", "Desenvolvimento sustentável", "Tópicos de Matemática elementar",
            "Biologia geral", "Ecologia geral e de populações", "Química geral",
            "Desenho técnico assistido por computador"])

    def test_a_matriz_that_is_an_image_raises_needing_ocr(self):
        with self.assertRaisesRegex(ValueError, "image with only \d+ characters of text: it needs OCR"):
            ufscar.parse_curriculum(pdf("ufscar_bia_image.pdf"))

    def test_year_is_two_semesters(self):
        years = {s[0]: s[1] for s in ufscar.parse_curriculum(pdf("ufscar_quimica_sao_carlos_p1.pdf"))}
        self.assertEqual(years, {1: 1, 2: 1, 3: 2})


class MatrixJunkRowsTest(unittest.TestCase):
    """Whole real matrices (UFSCar Fisioterapia and Pedagogia Sorocaba), downloaded as published."""

    def names(self, name, term=None):
        return [s[2] for s in ufscar.parse_curriculum(pdf(name)) if term in (None, s[0])]

    def test_shifted_name_cells_are_read_in_fisioterapias_first_semester(self):
        # 'Introdução a Psicologia' is drawn as 'I' | 'ntrodução a Psicologia'; others sit wholly in the headless column.
        self.assertEqual(self.names("ufscar_fisioterapia_matriz.pdf", 1), [
            "Citologia, Histologia e Embriologia", "Filosofia da Ciência", "Fundamentos de Fisioterapia",
            "Observação Clínica em Fisioterapia", "Genética", "Introdução a Psicologia",
            "Introdução à Sociologia Geral", "Noções de Saúde Pública"])

    def test_a_wrapped_shifted_name_is_joined_with_its_tail(self):
        names = self.names("ufscar_fisioterapia_matriz.pdf")
        self.assertIn("Estágio Fisioterapia em Ginecologia e Obstetrícia", names)
        self.assertIn("Estágio Prevenção de Lesões Musculoesqueléticas no Trabalho", names)
        self.assertIn("Prevenção de Lesões Musculoesqueléticas", self.names("ufscar_fisioterapia_matriz.pdf", 4))
        self.assertNotIn("Obstetrícia", names)

    def test_fisioterapia_has_no_one_letter_or_total_subject(self):
        names = self.names("ufscar_fisioterapia_matriz.pdf")
        self.assertNotIn("I", names)
        self.assertFalse([n for n in names if n.startswith("Perfis")])  # a note row, not a subject
        self.assertFalse([n for n in names if len(n) < 3 or n.lower().startswith(("sub-total", "carga"))])

    def test_pedagogia_sorocaba_has_no_total_or_workload_row(self):
        names = self.names("ufscar_pedagogia_sorocaba.pdf")
        self.assertNotIn("Sub-Total", names)
        self.assertNotIn("Carga-horária do Período", names)
        self.assertEqual(len(names), 57)

    def test_total_label_and_ordinal_only_rows_are_not_subjects(self):
        for junk in ("Sub-Total", "Subtotal", "Total", "Carga-horária do Período", "Carga horária", "2°", "3º", "10 º"):
            self.assertTrue(ufscar.NOT_A_SUBJECT.match(junk), junk)
        for subject in ("Introdução a Psicologia", "Estágio Supervisionado I", "Cálculo 1"):
            self.assertFalse(ufscar.NOT_A_SUBJECT.match(subject), subject)


class TermMarkAndValidationTest(unittest.TestCase):
    def test_term_mark_reads_each_heading_style(self):
        for text, term in [("1º Perfil", 1), ("Perfil 1", 1), ("2° Período", 2), ("3ª Etapa", 3), ("PRIMEIRO PERÍODO", 1),
                           ("10º Semestre", 10), ("Segundo Semestre", 2)]:
            self.assertEqual(ufscar._term_mark(text), term, text)

    def test_term_mark_ignores_other_text(self):
        for text in ("Disciplina", "Total de horas", "Cálculo 1"):
            self.assertIsNone(ufscar._term_mark(text), text)

    def parse_with(self, rows):
        with mock.patch.object(ufscar, "_matriz_rows", return_value=[]),                 mock.patch.object(ufscar, "_table_rows", return_value=rows),                 mock.patch.object(ufscar.pdfplumber, "open") as opened:
            opened.return_value.__enter__.return_value.pages = [mock.Mock(chars=["x"])]
            return ufscar.parse_curriculum(None)

    def test_semesters_with_a_gap_raise(self):
        with self.assertRaisesRegex(ValueError, "not 1..n"):
            self.parse_with([(1, "Cálculo 1", 60, False), (8, "Física 1", 60, False)])

    def test_a_subject_without_a_semester_raises(self):
        with self.assertRaisesRegex(ValueError, "not 1..n"):
            self.parse_with([(None, "Cálculo 1", 60, False)])

    def test_glued_words_raise(self):
        with self.assertRaisesRegex(ValueError, "glued words"):
            self.parse_with([(1, "CálculoDiferencial", 60, False)])

    def test_valid_rows_get_a_year(self):
        self.assertEqual(self.parse_with([(1, "Cálculo 1", 60, False), (2, "Optativa", None, True)]),
                         [(1, 1, "Cálculo 1", 60, False), (2, 1, "Optativa", None, True)])


if __name__ == "__main__":
    unittest.main()
