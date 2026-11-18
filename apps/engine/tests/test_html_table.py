import unittest

from engine.html_table import rows


class RowsTest(unittest.TestCase):
    def test_cells_text_and_first_href(self):
        html = '<table><tr><td> a  b </td><td><a href="/x">one</a> <a href="/y">two</a></td><td>n</td></tr></table>'
        self.assertEqual(rows(html), [[("a b", None), ("one two", "/x"), ("n", None)]])

    def test_decodes_entities(self):
        self.assertEqual(rows("<tr><td>Cr&eacute;d. &amp; Aula&nbsp;1</td></tr>"), [[("Créd. & Aula 1", None)]])

    def test_nested_table_rows_come_before_the_row_holding_them(self):
        html = "<table><tr><td>outer<table><tr><td>inner</td></tr></table></td><td>next</td></tr></table>"
        self.assertEqual(rows(html), [[("inner", None)], [("outer", None), ("next", None)]])


if __name__ == "__main__":
    unittest.main()
