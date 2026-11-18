import io
import unittest
from pathlib import Path

from engine import ifsp

FIXTURES = Path(__file__).parent / "fixtures" / "ifsp"
BCC = (FIXTURES / "ifsp_salto_bcc.html").read_text(encoding="utf-8")
ECA = (FIXTURES / "ifsp_salto_eca.html").read_text(encoding="utf-8")
SHARE = "https://nextcloud.slt.ifsp.edu.br/nextcloud/index.php/s/"


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


def pdf(name):
    return io.BytesIO((FIXTURES / name).read_bytes())


class ParseCoursesTest(unittest.TestCase):
    def test_newest_year_link_wins_and_the_url_is_https_download(self):
        self.assertEqual(
            ifsp.parse_courses(doc(BCC)),
            [(SHARE + "XpgrEfDNwWxeAqW/download", "Bacharelado em Ciência da Computação", None, "Salto")],
        )

    def test_grade_curricular_wording_and_campus_suffix_are_handled(self):
        self.assertEqual(
            ifsp.parse_courses(doc(ECA)),
            [(SHARE + "k7adRi7iR2kqXNr/download", "Bacharelado em Engenharia de Controle e Automação", None, "Salto")],
        )

    def test_page_with_no_nextcloud_curriculum_gives_no_course(self):
        google_only = BCC.replace("nextcloud.slt.ifsp.edu.br", "drive.google.com")
        self.assertEqual(ifsp.parse_courses(doc(google_only)), [])

    def test_unverified_campus_host_raises(self):
        with self.assertRaisesRegex(ValueError, "no verified city for campus xyz.ifsp.edu.br"):
            ifsp.parse_courses(doc(BCC.replace('base href="https://slt.', 'base href="https://xyz.')))

    def test_page_without_a_heading_raises(self):
        with self.assertRaisesRegex(ValueError, "no course heading"):
            ifsp.parse_courses(doc(BCC.replace("documentFirstHeading", "other")))


class ParseCurriculumTest(unittest.TestCase):
    """Approach: tiny PDFs drawn with reportlab (a one-off, not a test dependency) from the real text lines of the Salto PDFs."""

    def test_mandatory_subjects_carry_their_semester_year_and_total_hours(self):
        subjects = ifsp.parse_curriculum(pdf("ifsp_salto_bcc.pdf"))
        self.assertEqual(subjects[0], (1, 1, "FUNDAMENTOS DE MATEMÁTICA", 63.3, False))
        self.assertEqual(subjects[8], (2, 1, "CÁLCULO 1", 95.0, False))
        self.assertEqual([s[0] for s in subjects if not s[4]], [1] * 8 + [2] * 8)

    def test_electives_without_a_semester_have_term_and_year_none(self):
        electives = [s for s in ifsp.parse_curriculum(pdf("ifsp_salto_bcc.pdf")) if s[4]]
        self.assertEqual([s[2] for s in electives], ["LIBRAS", "EMPREENDEDORISMO DIGITAL", "TÓPICOS ESPECIAIS EM COMPUTAÇÃO 1"])
        self.assertTrue(all(s[:2] == (None, None) and s[3] == 31.7 for s in electives))

    def test_elective_row_starting_with_its_semester(self):
        self.assertEqual(ifsp.parse_curriculum(pdf("ifsp_salto_eca.pdf"))[-1], (8, 4, "LIBRAS", 31.7, True))

    def test_a_name_wrapped_over_two_lines_is_rejoined(self):
        names = [s[2] for s in ifsp.parse_curriculum(pdf("ifsp_salto_eca.pdf"))]
        self.assertIn("INTRODUÇÃO À ENGENHARIA DE CONTROLE E AUTOMAÇÃO", names)

    def test_semester_hours_not_matching_the_subtotal_raise(self):
        with self.assertRaisesRegex(ValueError, "semester 1 subjects add up to 380.0 hours, its subtotal says 999,0"):
            ifsp.parse_curriculum(pdf("ifsp_bad_subtotal.pdf"))

    def test_subject_row_before_a_table_header_raises(self):
        with self.assertRaisesRegex(ValueError, "before any table header"):
            ifsp.parse_curriculum(pdf("ifsp_no_header.pdf"))

    def test_pdf_without_subjects_raises(self):
        with self.assertRaisesRegex(ValueError, "no subject found"):
            ifsp.parse_curriculum(pdf("ifsp_empty.pdf"))


if __name__ == "__main__":
    unittest.main()
