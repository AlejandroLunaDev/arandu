import io
import unittest
from pathlib import Path

from engine import anima
from tests.fakes import FakeConn

FIXTURES = Path(__file__).parent / "fixtures" / "anima"
USJT = (FIXTURES / "anima_usjt_administracao.html").read_text(encoding="utf-8")
ANHEMBI = (FIXTURES / "anima_anhembi_psicologia.html").read_text(encoding="utf-8")
PDF = FIXTURES / "anima_usjt_administracao_butanta_presencial.pdf"
MEDIAS = "https://estaticos.animaeducacao.com.br/medias/"


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


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
            ((203, "São Judas"), [(MEDIAS + "d56a94d7-6660-46da-80f8-6b7a240fc443.pdf", "administração - Bacharelado", "Noite", "SÃO PAULO")]),
        )

    def test_shifts_of_a_unit_are_joined_sorted(self):
        self.assertEqual(
            anima.parse_course(doc(ANHEMBI)),
            ((466, "Anhembi Morumbi"), [(MEDIAS + "6f89ba32-03ad-443a-9a7f-2eb769537173.pdf", "psicologia - Bacharelado", "Manhã, Noite", "SÃO PAULO")]),
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

    def test_block_without_a_semestres_label_raises(self):
        with self.assertRaisesRegex(ValueError, "no 'Semestres' label"):
            anima.parse_curriculum(io.BytesIO((FIXTURES / "anima_sem_label.pdf").read_bytes()))

    def test_pdf_without_a_matrix_table_raises(self):
        with self.assertRaisesRegex(ValueError, "no component"):
            anima.parse_curriculum(io.BytesIO((FIXTURES / "anima_padrao.pdf").read_bytes()))


if __name__ == "__main__":
    unittest.main()
