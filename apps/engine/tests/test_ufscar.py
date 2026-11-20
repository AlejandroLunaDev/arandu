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

    def test_pdf_without_text_goes_through_the_transcription(self):
        rows = [(1, "Lógica Digital", 90, False)]
        with mock.patch.object(ufscar, "_transcribed", return_value=rows) as transcribed:
            self.assertEqual(ufscar.parse_curriculum(pdf("ufscar_outlined.pdf")), [(1, 1, "Lógica Digital", 90, False)])
        transcribed.assert_called_once()

    def test_text_pdf_without_subjects_raises(self):
        with mock.patch.object(ufscar, "_transcribed", side_effect=ValueError("none")):
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
        with mock.patch.object(ufscar, "_transcribed", side_effect=ValueError("none")):
            with self.assertRaisesRegex(ValueError, r"image with only \d+ characters of text; transcribed: none"):
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
        with mock.patch.object(ufscar, "_matriz_rows", return_value=[]),                 mock.patch.object(ufscar, "_table_rows", return_value=rows),                 mock.patch.object(ufscar, "_transcribed", side_effect=ValueError("none")),                 mock.patch.object(ufscar.pdfplumber, "open") as opened:
            opened.return_value.__enter__.return_value.pages = [mock.Mock(chars=["x"])]
            return ufscar.parse_curriculum(io.BytesIO(b""))

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


class SpacedTest(unittest.TestCase):
    def test_puts_back_dropped_spaces(self):
        for name, expected in [("Antropologia dasSaúde", "Antropologia das Saúde"),
                               ("Máquinas Térmicas1", "Máquinas Térmicas 1"),
                               ("do PensamentoPedagógico", "do Pensamento Pedagógico")]:
            self.assertEqual(ufscar._spaced(name), expected)

    def test_leaves_intended_names_alone(self):
        for name in ("DevOps", "ACIEPE - MedBE", "iPhone"):
            self.assertEqual(ufscar._spaced(name), name)


class MatrizPagesTest(unittest.TestCase):
    def test_a_short_pdf_gives_every_page(self):
        self.assertEqual(ufscar._matriz_pages(["x"] * 12), list(range(12)))

    def test_a_long_pdf_gives_each_matriz_page_and_the_next(self):
        texts = ["texto"] * 20
        texts[5] = texts[6] = "Matriz Curricular Perfil 1"
        self.assertEqual(ufscar._matriz_pages(texts), [5, 6, 7])

    def test_a_table_of_contents_is_skipped(self):
        texts = ["texto"] * 20
        texts[1] = "Matriz Curricular ..... 12"
        texts[9] = "Matriz Curricular"
        self.assertEqual(ufscar._matriz_pages(texts), [9, 10])

    def test_no_matriz_page_raises(self):
        with self.assertRaises(ValueError):
            ufscar._matriz_pages(["texto"] * 20)


def reading(text):
    return ufscar.ocr.tokens(text)


class HeldTest(unittest.TestCase):
    def held(self, name, text, slips=None):
        return ufscar._held(name, reading(text), slips or {})

    def test_a_name_inside_a_longer_word_is_rejected(self):
        self.assertEqual(self.held("Química", "Bioquímica 60"), [])

    def test_a_one_letter_difference_is_rejected(self):
        self.assertEqual(self.held("Estética", "Estática 60"), [])

    def test_a_short_last_word_must_follow_at_once(self):
        self.assertEqual(self.held("Cálculo Diferencial e Integral 2", "Cálculo Diferencial e Integral 1 90"), [])

    def test_a_last_letter_must_match(self):
        self.assertEqual(self.held("Física Experimental B", "Física Experimental A 30"), [])

    def test_glued_words_are_accepted(self):
        self.assertTrue(self.held("Estrutura e Funcionamento", "EstruturaeFuncionamento 60"))

    def test_a_word_split_by_a_line_break_hyphen_is_accepted(self):
        self.assertTrue(self.held("Introdução ao Pensamento Algorítmico",
                                  "Introdução ao Pensamento Algorít- DC obrigatório 30 30 mico"))

    def test_a_word_with_a_trailing_hyphen_still_matches(self):
        self.assertTrue(self.held("Prática Profissional 1", "Prática Profissional 1- Saúde"))


class TermsAndPlacedTest(unittest.TestCase):
    TEXT = "1º Semestre Cálculo 1 60 2º Semestre Física Geral 60 3º Semestre Química Geral 60"

    def placed(self, name, term, text=TEXT, slips=None):
        return ufscar._placed(name, term, reading(text), slips or {})

    def test_a_unit_under_its_heading_is_placed(self):
        self.assertTrue(self.placed("Física Geral", 2))
        self.assertTrue(self.placed("Química Geral", 3))  # the last semester runs to the end

    def test_the_same_name_under_another_semester_is_not_placed(self):
        self.assertFalse(self.placed("Física Geral", 1))
        self.assertFalse(self.placed("Física Geral", 3))

    def test_a_semester_with_no_heading_places_nothing(self):
        self.assertFalse(self.placed("Física Geral", 4))

    def test_a_reading_with_no_headings_places_nothing(self):
        self.assertEqual(ufscar._terms(reading("Cálculo 1 60 Física Geral 60"), {}), [])
        self.assertFalse(self.placed("Cálculo 1", 1, "Cálculo 1 60 Física Geral 60"))

    def test_perfil_and_periodo_headings_count(self):
        self.assertEqual(len(ufscar._terms(reading("Perfil 1 Cálculo Perfil 2 Física 3º período Química"), {})), 3)

    def test_a_year_is_not_a_heading(self):
        self.assertEqual(ufscar._terms(reading("1º ano Cálculo 1 2º ano Física"), {}), [])

    def test_a_bare_ordinal_is_not_a_heading(self):
        self.assertEqual(ufscar._terms(reading("1º Cálculo 2º Física"), {}), [])

    def test_headings_must_run_in_order(self):
        self.assertEqual(len(ufscar._terms(reading("2º Semestre A 1º Semestre B"), {})), 1)

    def test_an_ocr_slip_in_the_heading_counts_with_slips(self):
        text = reading("lº Semestre Cálculo 1 60 2º Semestre Física Geral 60").translate(ufscar.ocr.SLIPS)
        self.assertEqual(len(ufscar._terms(text, ufscar.ocr.SLIPS)), 2)
        self.assertEqual(ufscar._terms("|io|semestre|calculo|", ufscar.ocr.SLIPS), [0])
        self.assertEqual(ufscar._terms("|io|semestre|calculo|", {}), [])


class TranscribedTest(unittest.TestCase):
    """The PDF's text layer is the second reading; pypdfium2, rendering and vision.read_json are faked, so no network."""

    LAYER = "1º Semestre Lógica Digital 90 Cálculo Diferencial e Integral 1 60 2º Semestre Física Geral 60 " + "x " * 100

    def run_with(self, units, layer=LAYER):
        page = mock.Mock()
        page.get_textpage.return_value.get_text_range.return_value = layer
        with mock.patch.object(ufscar.pypdfium2, "PdfDocument", return_value=[page]),                 mock.patch.object(ufscar.ocr, "render", return_value=[object()]),                 mock.patch.object(ufscar.vision, "read_json", return_value={"units": units}):
            return ufscar._transcribed(b"")

    def unit(self, name, term=1, elective=False):
        return {"term": term, "name": name, "elective": elective}

    def test_placed_units_come_back_with_no_hours(self):
        self.assertEqual(self.run_with([self.unit("Lógica Digital"), self.unit("Física Geral", term=2)]),
                         [(1, "Lógica Digital", None, False), (2, "Física Geral", None, False)])

    def test_a_unit_in_the_wrong_semester_fails_the_matriz(self):
        with self.assertRaisesRegex(ValueError, r"does not confirm 1 units: \['Física Geral \(1\)'\]"):
            self.run_with([self.unit("Lógica Digital"), self.unit("Física Geral", term=1)])

    def test_an_invented_name_fails(self):
        with self.assertRaisesRegex(ValueError, "does not confirm 1 units"):
            self.run_with([self.unit("Lógica Digital"), self.unit("Astrologia Quântica")])

    def test_a_question_mark_fails(self):
        with self.assertRaisesRegex(ValueError, "does not confirm"):
            self.run_with([self.unit("Lógica Digit?l")])

    def test_a_matriz_with_no_headings_fails(self):
        with self.assertRaisesRegex(ValueError, "does not confirm"):
            self.run_with([self.unit("Lógica Digital")], layer="Lógica Digital 90 " + "x " * 100)

    def test_an_elective_without_a_term_is_dropped(self):
        self.assertEqual(self.run_with([self.unit("Lógica Digital"), self.unit("Astrologia", term=None, elective=True)]),
                         [(1, "Lógica Digital", None, False)])

    def test_a_non_elective_without_a_term_raises(self):
        with self.assertRaisesRegex(ValueError, "no semester"):
            self.run_with([self.unit("Lógica Digital", term=None)])


class FallbackTest(unittest.TestCase):
    def parse(self, transcribed):
        with mock.patch.object(ufscar, "_read", side_effect=ValueError("layout")),                 mock.patch.object(ufscar, "_transcribed", **transcribed):
            return ufscar.parse_curriculum(io.BytesIO(b""))

    def test_the_transcription_is_used(self):
        self.assertEqual(self.parse({"return_value": [(1, "Cálculo 1", 60, False), (2, "Física 1", 60, False)]}),
                         [(1, 1, "Cálculo 1", 60, False), (2, 1, "Física 1", 60, False)])

    def test_both_failures_are_in_the_message(self):
        with self.assertRaisesRegex(ValueError, "layout; transcribed: second"):
            self.parse({"side_effect": ValueError("second")})

    def test_a_non_value_error_from_the_transcription_keeps_both_reasons(self):
        with self.assertRaisesRegex(ValueError, "layout; transcribed: .*units"):
            self.parse({"side_effect": KeyError("units")})

    def test_zero_hours_become_none(self):
        self.assertEqual(self.parse({"return_value": [(1, "Projeto integrador 1", 0, False)]}),
                         [(1, 1, "Projeto integrador 1", None, False)])


if __name__ == "__main__":
    unittest.main()
