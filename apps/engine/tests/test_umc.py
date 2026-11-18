import io
import unittest
from pathlib import Path

from engine import umc

FIXTURES = Path(__file__).parent / "fixtures" / "umc"
SITEMAP = (FIXTURES / "umc_page_sitemap.xml").read_bytes()
GRADE = (FIXTURES / "umc_grade_sistemas_de_informacao.html").read_text(encoding="utf-8")


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


class ParseSitemapTest(unittest.TestCase):
    def test_only_grade_curricular_pages_with_a_slug_label(self):
        self.assertEqual(
            umc.parse_sitemap(io.BytesIO(SITEMAP)),
            [
                ("https://www.umc.br/grade-curricular-odontologia/", "UMC, grade curricular: odontologia"),
                ("https://www.umc.br/grade-curricular-psicologia/", "UMC, grade curricular: psicologia"),
                ("https://www.umc.br/grade-curricular-educacao-fisica/", "UMC, grade curricular: educacao-fisica"),
            ],
        )

    def test_sitemap_without_grade_pages_raises(self):
        with self.assertRaisesRegex(ValueError, "no grade curricular"):
            umc.parse_sitemap(doc("<loc>https://www.umc.br/</loc>"))


class ParseCurriculumTest(unittest.TestCase):
    def setUp(self):
        self.name, self.city, self.subjects = umc.parse_curriculum(doc(GRADE))

    def test_course_and_the_sede_city(self):
        self.assertEqual((self.name, self.city), ("Sistemas de Informação", "MOGI DAS CRUZES"))

    def test_units_in_page_order_with_every_other_field_none(self):
        names = [s[2] for s in self.subjects]
        self.assertEqual(len(self.subjects), 19)
        self.assertEqual(names[:4], ["UNIDADE CURRICULAR DE FORMAÇÃO GERAL", "Software Básico", "Redes e Segurança", "Banco de Dados"])
        self.assertEqual(names[-2:], ["ESTÁGIO SUPERVISIONADO", "PROJETO FINAL DE CURSO"])
        self.assertTrue(all(s[:2] == (None, None) and s[3:] == (None, None) for s in self.subjects))

    def test_cc_rows_are_not_subjects(self):
        names = {s[2] for s in self.subjects}
        self.assertTrue(names.isdisjoint({"ATIVIDADES COMPLEMENTARES", "VIDA & PROFISSÃO", "EXTENSÃO (10%)"}))

    def test_page_without_the_sede_raises(self):
        with self.assertRaisesRegex(ValueError, "no course title or campus"):
            umc.parse_curriculum(doc(GRADE.replace("Campus  SEDE", "Campus")))

    def test_page_without_units_raises(self):
        with self.assertRaisesRegex(ValueError, "no unit"):
            umc.parse_curriculum(doc(GRADE.replace(">UCA<", ">XXX<").replace(">UCF<", ">XXX<").replace(">UCP<", ">XXX<").replace(">PFC<", ">XXX<")))


if __name__ == "__main__":
    unittest.main()
