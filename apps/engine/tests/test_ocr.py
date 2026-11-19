import unittest

from engine import ocr


class KeyTest(unittest.TestCase):
    def test_accents_case_and_punctuation_are_ignored(self):
        self.assertEqual(ocr.key("Lógica,"), ocr.key("LOGICA"))

    def test_rn_compares_as_m(self):
        self.assertEqual(ocr.key("Inforrnação"), ocr.key("Informação"))


class ConfirmedTest(unittest.TestCase):
    def test_exact_key_match(self):
        self.assertTrue(ocr.confirmed("logica", {"logica"}))

    def test_a_roman_numeral_is_confirmed_by_il1_marks_of_its_length(self):
        self.assertTrue(ocr.confirmed("iii", {"l1i"}))
        self.assertFalse(ocr.confirmed("iii", {"ii"}))

    def test_one_edit_off_confirms_a_word_of_six_or_more_characters(self):
        self.assertTrue(ocr.confirmed("calculo", {"calcule"}))
        self.assertFalse(ocr.confirmed("fisic", {"fisia"}))  # 5 characters: too short to tolerate an edit

    def test_two_edits_off_does_not_confirm(self):
        self.assertFalse(ocr.confirmed("calculo", {"calcixo"}))


if __name__ == "__main__":
    unittest.main()
