import unittest

from engine import ocr


class KeyTest(unittest.TestCase):
    def test_accents_case_and_punctuation_are_ignored(self):
        self.assertEqual(ocr.key("Lógica,"), ocr.key("LOGICA"))

    def test_rn_compares_as_m(self):
        self.assertEqual(ocr.key("Inforrnação"), ocr.key("Informação"))


class TokensTest(unittest.TestCase):
    def test_words_are_keyed_between_bars(self):
        self.assertEqual(ocr.tokens("Cálculo 1,"), "|calculo|1|")

    def test_a_trailing_hyphen_is_kept(self):
        self.assertEqual(ocr.tokens("Algorít- mico"), "|algorit-|mico|")

    def test_a_word_of_punctuation_only_is_dropped(self):
        self.assertEqual(ocr.tokens("a . b"), "|a|b|")


if __name__ == "__main__":
    unittest.main()
