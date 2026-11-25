import io
import unittest
from pathlib import Path

from engine import belas_artes

FIXTURES = Path(__file__).parent / "fixtures" / "belas_artes"


def page(name):
    """A real course page trimmed to its title, modalidade/campus/duração cards and matriz curricular."""
    return io.BytesIO((FIXTURES / name).read_bytes())


def inline(campus="Votorantim", semesters=1):
    block = ("<table><tr><th>DISCIPLINAS</th><th>HORAS</th></tr>"
             "<tr><td>HISTÓRIA</td><td>60</td></tr><tr><th>SUBTOTAL</th><th>60</th></tr></table>")
    html = (f"<h1>Curso</h1><h3>Campus</h3><p>{campus}</p><h3>Duração</h3><p>{semesters} Semestres</p>"
            f"<h5>MATRIZ CURRICULAR</h5>{block * semesters}")
    return io.BytesIO(html.encode())


class ParseCurriculumTest(unittest.TestCase):
    def test_in_person_page_gives_name_city_and_terms_from_the_blocks(self):
        name, city, subjects = belas_artes.parse_curriculum(page("design_de_produto.html"))
        self.assertEqual((name, city), ("Design de Produto", "São Paulo"))
        self.assertEqual(subjects[0], (1, None, "DESENHO GEOMÉTRICO", 60, False))
        self.assertEqual({term for term, *_ in subjects}, set(range(1, 9)))
        self.assertTrue(any(elective for *_, elective in subjects))  # OPTATIVAS
        self.assertFalse(any("ATIVIDADES COMPLEMENTARES" in s[2] for s in subjects))

    def test_ead_page_belongs_to_sao_paulo_and_has_no_tipo_column(self):
        name, city, subjects = belas_artes.parse_curriculum(page("eventos_ead.html"))
        self.assertEqual((name, city), ("Eventos", "São Paulo"))
        self.assertEqual({term for term, *_ in subjects}, {1, 2, 3, 4})

    def test_blocks_that_do_not_match_the_stated_semesters_are_rejected(self):
        doc = page("design_de_produto.html").read().decode().replace("8 Semestres", "9 Semestres")
        with self.assertRaisesRegex(ValueError, "8 blocks for 9 semesters"):
            belas_artes.parse_curriculum(io.BytesIO(doc.encode()))

    def test_campus_maps_to_its_city(self):
        self.assertEqual(belas_artes.parse_curriculum(inline("Votorantim"))[1], "Votorantim")
        self.assertEqual(belas_artes.parse_curriculum(inline("Paraíso"))[1], "São Paulo")


if __name__ == "__main__":
    unittest.main()
