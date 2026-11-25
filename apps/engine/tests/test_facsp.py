import io
import unittest
from pathlib import Path

from engine import facsp

LOGISTICA = Path(__file__).parent / "fixtures" / "facsp" / "logistica.pdf"


class ParseCurriculumTest(unittest.TestCase):
    def test_pdf_gives_title_cased_name_city_and_subjects_with_total_hours(self):
        name, city, subjects = facsp.parse_curriculum(io.BytesIO(LOGISTICA.read_bytes()))
        self.assertEqual((name, city), ("Curso Superior De Tecnologia Em Logística", "São Paulo"))
        first = [s for s in subjects if s[0] == 1]
        self.assertEqual(first[0], (1, None, "Comunicação em Português", 80, False))
        self.assertEqual([s[3] for s in first], [80, 80, 80, 80, 40, 80])

    def test_optativa_is_an_elective_with_its_hours(self):
        subjects = facsp.parse_curriculum(io.BytesIO(LOGISTICA.read_bytes()))[2]
        self.assertEqual([s for s in subjects if s[4]], [(4, None, "Optativa", 40, True)])


if __name__ == "__main__":
    unittest.main()
