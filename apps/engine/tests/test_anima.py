import io
import json
import unittest
from pathlib import Path

from engine import anima
from tests.fakes import FakeConn

FIXTURES = Path(__file__).parent / "fixtures" / "anima"
USJT = (FIXTURES / "anima_usjt_administracao.html").read_text(encoding="utf-8")
ANHEMBI = (FIXTURES / "anima_anhembi_psicologia.html").read_text(encoding="utf-8")
ANHEMBI_COMEX = (FIXTURES / "anima_anhembi_comercio_exterior.html").read_text(encoding="utf-8")
USJT_PSICOLOGIA = (FIXTURES / "anima_usjt_psicologia.html").read_text(encoding="utf-8")
PDF = FIXTURES / "anima_usjt_administracao_butanta_presencial.pdf"
MEDIAS = "https://estaticos.animaeducacao.com.br/medias/"


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


def usjt_with(*matrices):
    """The USJT administração page (presencial offers: Paulista, Butantã, Guarulhos, Mooca) with only these
    (unit or None, modality, pdf name) matrices."""
    head, _ = USJT.split('[65, 69, 73, 77]')
    n = 64 + 1 + 4 * len(matrices)  # the curriculums list, then four nodes per matrix
    nodes = [[64 + 1 + 4 * i for i in range(len(matrices))]]
    for i, (unit, modality, pdf) in enumerate(matrices):
        base = 65 + 4 * i
        nodes += [{"unit": base + 1 if unit else 2, "modality": base + 2, "curriculum_file": base + 3},
                  unit, modality, MEDIAS + pdf + ".pdf"]
    nodes += [["Reactive", 3], {"state": 1}]
    head = head.replace('"$sbreadcrumb-course": 81', f'"$sbreadcrumb-course": {n}').replace('["Reactive", 82]', f'["Reactive", {n + 1}]')
    tail = json.dumps(nodes, ensure_ascii=False)[1:]  # the node list continues the head's
    return head.rstrip().rstrip(",") + ", " + tail + "</script></body></html>"


class ParseSitemapTest(unittest.TestCase):
    def test_course_pages_only_without_home_or_transfer_variants(self):
        self.assertEqual(
            anima.parse_sitemap(io.BytesIO((FIXTURES / "anima_usjt_sitemap.xml").read_bytes())),
            [
                "https://www.usjt.br/cursos/graduacao/administracao-bacharelado/",
                "https://www.usjt.br/cursos/graduacao/analise-e-desenvolvimento-de-sistemas-graduacao-tecnologica/",
            ],
        )

    def test_anhembi_host_is_known(self):
        urls = anima.parse_sitemap(io.BytesIO((FIXTURES / "anima_anhembi_sitemap.xml").read_bytes()))
        self.assertTrue(all(u.startswith("https://portal.anhembi.br/cursos/graduacao/") for u in urls))

    def test_unknown_host_raises(self):
        with self.assertRaisesRegex(ValueError, "unknown hosts"):
            anima.parse_sitemap(doc("<loc>https://other.example/cursos/graduacao/x/</loc>"))

    def test_no_course_page_raises(self):
        with self.assertRaisesRegex(ValueError, "no course page"):
            anima.parse_sitemap(doc("<loc>https://www.usjt.br/</loc>"))

    def test_load_pages_labels_each_page_with_its_institution_and_slug(self):
        conn = FakeConn()
        anima.sitemap.load(conn, 1, ["https://portal.anhembi.br/cursos/graduacao/psicologia-bacharelado/"])
        self.assertEqual(
            conn.calls[0][1],
            ("anima_course", "https://portal.anhembi.br/cursos/graduacao/psicologia-bacharelado/",
             "Anhembi Morumbi, página do curso psicologia-bacharelado"),
        )


class ParseCourseTest(unittest.TestCase):
    def test_only_presencial_units_with_their_own_matrix_one_row_each(self):
        # page lists presencial offers at Paulista, Butantã, Guarulhos and Mooca; only Butantã has a Presencial matrix
        self.assertEqual(
            anima.parse_course(doc(USJT)),
            ((203, "São Judas"), [(MEDIAS + "d56a94d7-6660-46da-80f8-6b7a240fc443.pdf", "administração - Bacharelado", "Noite", "SÃO PAULO", ["Butantã"])]),
        )

    def test_shifts_of_a_unit_are_joined_sorted(self):
        self.assertEqual(
            anima.parse_course(doc(ANHEMBI)),
            ((466, "Anhembi Morumbi"), [(MEDIAS + "6f89ba32-03ad-443a-9a7f-2eb769537173.pdf", "psicologia - Bacharelado", "Manhã, Noite", "SÃO PAULO", ["Mooca"])]),
        )

    def test_ead_semipresencial_and_default_matrices_are_not_returned(self):
        urls = [c[0] for c in anima.parse_course(doc(USJT))[1]]
        self.assertFalse(any("padrao" in u or "ead" in u or "semi" in u for u in urls))

    def test_unit_without_a_city_is_skipped(self):
        got = anima.parse_course(doc(USJT.replace('"SÃO PAULO"', '"  "', 3)))
        self.assertEqual(got[1], [])

    def test_unknown_canonical_host_raises(self):
        with self.assertRaisesRegex(ValueError, "unknown canonical host"):
            anima.parse_course(doc(USJT.replace("www.usjt.br", "www.other.br")))

    def test_licenciatura_keeps_the_degree_suffix_other_degrees_do_not(self):
        self.assertEqual(anima.parse_course(doc(USJT.replace('"Bacharelado"', '"Licenciatura"')))[1][0][1], "administração - Licenciatura")
        self.assertEqual(anima.parse_course(doc(USJT.replace('"Bacharelado"', '"Tecnólogo"')))[1][0][1], "administração")

    def test_the_general_presencial_matrix_covers_the_uncovered_units_grouped_per_city(self):
        got = anima.parse_course(doc(usjt_with((None, "Presencial", "geral"), (None, "EAD", "ead"))))[1]
        self.assertEqual(sorted(got), [
            (MEDIAS + "geral.pdf", "administração - Bacharelado", "Manhã, Noite", "SÃO PAULO", ["Butantã", "Mooca", "Paulista"]),
            (MEDIAS + "geral.pdf", "administração - Bacharelado", "Noite", "GUARULHOS", ["Guarulhos"]),
        ])

    def test_a_unit_with_its_own_matrix_keeps_it_and_the_general_one_serves_the_rest(self):
        got = anima.parse_course(doc(usjt_with((None, "Presencial", "geral"), ("Butantã", "Presencial", "butanta"))))[1]
        self.assertEqual(sorted(got), [
            (MEDIAS + "butanta.pdf", "administração - Bacharelado", "Noite", "SÃO PAULO", ["Butantã"]),
            (MEDIAS + "geral.pdf", "administração - Bacharelado", "Manhã, Noite", "SÃO PAULO", ["Mooca", "Paulista"]),
            (MEDIAS + "geral.pdf", "administração - Bacharelado", "Noite", "GUARULHOS", ["Guarulhos"]),
        ])

    def test_two_general_presencial_matrices_leave_the_uncovered_units_out(self):
        got = anima.parse_course(doc(usjt_with((None, "Presencial", "a"), (None, "Presencial", "b"), ("Butantã", "Presencial", "butanta"))))[1]
        self.assertEqual(got, [(MEDIAS + "butanta.pdf", "administração - Bacharelado", "Noite", "SÃO PAULO", ["Butantã"])])

    def test_real_anhembi_page_with_a_general_matrix_serves_each_city(self):
        pdf = MEDIAS + "9b5693ef-6aab-4ce8-a004-970a6ae1a853.pdf"
        self.assertEqual(anima.parse_course(doc(ANHEMBI_COMEX))[1], [
            (pdf, "comércio exterior", "Noite", "SOROCABA", ["Sorocaba"]),
            (pdf, "comércio exterior", "Noite", "SÃO PAULO", ["Paulista"]),
        ])

    def test_real_usjt_page_with_only_a_unit_matrix_returns_only_that_unit(self):
        self.assertEqual(anima.parse_course(doc(USJT_PSICOLOGIA))[1], [
            (MEDIAS + "152cbbcc-d198-4fbd-993d-08e87059f3d5.pdf", "psicologia - Bacharelado", "Manhã, Noite", "SÃO PAULO", ["Butantã"]),
        ])

    def test_a_page_that_redirects_to_404_raises(self):
        gone = '<html><head><meta http-equiv="refresh" content="0; url=/404/"></head></html>'
        with self.assertRaisesRegex(ValueError, "gone: it redirects to /404/"):
            anima.parse_course(doc(gone))

    def test_the_payload_fields_read_exclude_coordinators(self):
        self.assertNotIn("coordinator", USJT.lower())


class ParseCurriculumTest(unittest.TestCase):
    def test_components_per_block_with_term_range_and_hours(self):
        subjects = anima.parse_curriculum(io.BytesIO(PDF.read_bytes()))
        self.assertEqual(len(subjects), 9)
        self.assertEqual(subjects[0], (1, None, "Teorias Organizacionais e Novos Paradigmas Gerenciais", 160, None, 3))
        self.assertEqual([s[0] for s in subjects], [1] * 3 + [3] * 3 + [7] * 3)
        self.assertEqual({s[5] for s in subjects}, {3, 6, 8})

    def test_year_only_when_the_range_sits_in_one_year(self):
        by_term = {s[0]: s[1] for s in anima.parse_curriculum(io.BytesIO(PDF.read_bytes()))}
        self.assertEqual(by_term, {1: None, 3: None, 7: 4})  # semesters 7-8 are year 4; 1-3 and 3-6 span years

    def test_is_elective_stays_none_and_summary_table_is_ignored(self):
        subjects = anima.parse_curriculum(io.BytesIO(PDF.read_bytes()))
        self.assertTrue(all(s[4] is None for s in subjects))
        self.assertNotIn("UNIDADES CURRICULARES", [s[2] for s in subjects])

    def test_a_last_block_with_one_semester_has_no_range_and_its_year(self):
        subjects = anima.parse_curriculum(io.BytesIO((FIXTURES / "anima_estetica_semestre_unico.pdf").read_bytes()))
        self.assertEqual(len(subjects), 19)
        self.assertEqual(subjects[-2:], [(7, 4, "Estágio curricular supervisionado", 230, None, None),
                                         (7, 4, "Trabalho de Conclusão de Curso", 80, None, None)])

    def test_block_without_a_semestres_label_raises(self):
        with self.assertRaisesRegex(ValueError, "no 'Semestres' label"):
            anima.parse_curriculum(io.BytesIO((FIXTURES / "anima_sem_label.pdf").read_bytes()))

    def test_pdf_without_a_matrix_table_raises(self):
        with self.assertRaisesRegex(ValueError, "no component"):
            anima.parse_curriculum(io.BytesIO((FIXTURES / "anima_padrao.pdf").read_bytes()))


if __name__ == "__main__":
    unittest.main()
