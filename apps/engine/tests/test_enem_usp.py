import unittest
from pathlib import Path
from unittest import mock

from engine import enem_usp

FIXTURES = Path(__file__).parent / "fixtures" / "enem_usp"


def fake_pdf(text):
    page = mock.Mock(extract_text=lambda: text)
    pdf = mock.MagicMock()
    pdf.__enter__.return_value.pages = [page]
    return mock.patch.object(enem_usp.pdfplumber, "open", return_value=pdf)


class ParseTest(unittest.TestCase):
    def test_2026_layout_first_block_reads_every_modality_and_skips_the_dash(self):
        rows = enem_usp.parse(FIXTURES / "enem_usp_2026_p1.pdf")
        self.assertEqual(len(rows), 45)
        self.assertEqual(rows[:4], [(11090, 0, 2026, 1, "AC", 790.88), (11090, 0, 2026, 1, "EP-L1", 728.2),
                                    (11090, 0, 2026, 1, "EP-L3", 754.8), (11090, 0, 2026, 1, "PPI-L4", 724.81)])
        self.assertNotIn((11090, 0, 2026, 1, "PPI-L2"), [r[:5] for r in rows])  # '-': nobody called

    def test_2024_layout_with_capitals_and_unicode_minus_first_block(self):
        rows = enem_usp.parse(FIXTURES / "enem_usp_2024_p1.pdf")
        self.assertEqual(len(rows), 106)
        self.assertEqual(rows[:4], [(11090, 0, 2024, 1, "AC", 767.3), (11090, 0, 2024, 1, "EP-L1", 715.46),
                                    (11090, 0, 2024, 1, "EP-L3", 759.36), (11090, 0, 2024, 1, "PPI-L4", 671.62)])
        self.assertEqual({r[2] for r in rows}, {2024})

    def test_more_scores_than_modalities_raises(self):
        text = "ENEM-USP 2026\n1ª chamada\nmodalidade AC EP-L1\ncódigo USP: 11090/0\nPontos finais 790,88 728,20 700,00"
        with fake_pdf(text), self.assertRaisesRegex(ValueError, "11090/0.*differ"):
            enem_usp.parse("x.pdf")

    def test_block_with_no_scores_line_raises(self):
        with fake_pdf("ENEM-USP 2026\n1ª chamada\ncódigo USP: 11090/0"), self.assertRaisesRegex(ValueError, "differ"):
            enem_usp.parse("x.pdf")

    def test_no_title_raises(self):
        with fake_pdf("Lista de aprovados\nmodalidade AC\ncódigo USP: 1/0\nPontos finais 700,00"), \
                self.assertRaisesRegex(ValueError, "no 'ENEM-USP"):
            enem_usp.parse("x.pdf")

    def test_no_block_raises(self):
        with fake_pdf("ENEM-USP 2026\n1ª chamada\nnada"), self.assertRaisesRegex(ValueError, "no course block"):
            enem_usp.parse("x.pdf")


class LoadTest(unittest.TestCase):
    def test_load_replaces_staged_rows_copies_them_and_returns_the_normalize_count(self):
        conn = mock.MagicMock()
        conn.execute.return_value.fetchone.return_value = (3,)
        rows = [(11090, 0, 2026, 1, "AC", 790.88), (11090, 0, 2026, 1, "EP-L1", 728.2)]
        self.assertEqual(enem_usp.load(conn, 7, rows), 3)
        (delete, _), (normalize, args) = (c.args for c in conn.execute.call_args_list)
        self.assertIn("delete from staging.usp_cutoffs", delete)
        self.assertEqual((normalize, args), ("select staging.normalize_usp_cutoffs(%s)", (7,)))
        copy = conn.cursor.return_value.__enter__.return_value.copy.return_value.__enter__.return_value
        self.assertEqual([c.args[0] for c in copy.write_row.call_args_list], [(7, *r) for r in rows])


if __name__ == "__main__":
    unittest.main()
