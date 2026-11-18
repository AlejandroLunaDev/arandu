import unittest
from unittest import mock

from engine import curricula
from tests.fakes import FakeConn


class CopyConn(FakeConn):
    """FakeConn that also records the rows copied into staging.curriculum_subjects."""

    def __init__(self, answers):
        super().__init__(answers)
        self.rows = []

    def cursor(self):
        copy = mock.MagicMock()
        copy.__enter__.return_value.write_row = self.rows.append
        cur = mock.MagicMock()
        cur.__enter__.return_value.copy.return_value = copy
        return cur


class LoadSubjectsTest(unittest.TestCase):
    def test_five_and_six_tuples_are_both_accepted_and_term_to_defaults_to_none(self):
        conn = CopyConn([(0,), (9,)])
        curricula.load_subjects(conn, 7, [(1, 1, "A", 60, False), (3, None, "B", 90, None, 6), (None, None, "C", None, True)])
        self.assertEqual(conn.rows, [(7, 1, 1, "A", 60, False, None), (7, 3, None, "B", 90, None, 6), (7, None, None, "C", None, True, None)])

    def test_returns_the_normalize_count(self):
        self.assertEqual(curricula.load_subjects(CopyConn([(0,), (5,)]), 7, [(1, 1, "A", 1, False)]), 5)

    def test_far_fewer_subjects_than_the_last_load_raise_before_deleting(self):
        conn = CopyConn([(10,)])
        with self.assertRaisesRegex(ValueError, "has 2 subjects, the last load had 10"):
            curricula.load_subjects(conn, 7, [(1, 1, "A", 1, False), (1, 1, "B", 1, False)])
        self.assertFalse(any(c[0].startswith("delete") for c in conn.calls))


class LoadCoursesTest(unittest.TestCase):
    def staged(self, conn):
        return [c[1] for c in conn.calls if "insert into staging.curriculum_courses" in c[0]]

    def test_the_same_url_with_two_cities_stages_one_source_in_both(self):
        conn = FakeConn([(42,), (0,), (42,), (0,)])  # source id, normalize count, per course
        curricula.load_courses(conn, "x_curriculum", 322, "UNIP", [("u", "Medicina", None, "SANTOS"), ("u", "Medicina", None, "CAMPINAS")])
        self.assertEqual(self.staged(conn), [(42, 322, "Medicina", "SANTOS", False), (42, 322, "Medicina", "CAMPINAS", False)])

    def test_every_unit_is_passed_through_and_the_label_has_the_shift(self):
        conn = FakeConn([(42,), (0,)])
        curricula.load_courses(conn, "x", 1, "P", [("u", "N", "Noite", "C")], every_unit=True)
        self.assertEqual(self.staged(conn), [(42, 1, "N", "C", True)])
        self.assertEqual(conn.calls[0][1], ("x", "u", "P: N (Noite)"))

    def test_a_changed_course_renormalizes_its_page_and_adds_both_counts(self):
        conn = FakeConn([(42,), (5,)])
        written = curricula.load_courses(conn, "x", 1, "P", [("u", "N", None, "C")])
        self.assertEqual(written, 1 + 1 + 5)  # source insert + course upsert + subjects relinked
        self.assertEqual(conn.calls[-1], ("select staging.normalize_curriculum(%s)", (42,)))

    def test_an_unchanged_course_does_not_renormalize(self):
        class Unchanged(FakeConn):
            def execute(self, sql, params=()):
                result = super().execute(sql, params)
                if "insert into staging.curriculum_courses" in sql:
                    result.rowcount = 0
                return result

        conn = Unchanged([(42,)])
        self.assertEqual(curricula.load_courses(conn, "x", 1, "P", [("u", "N", None, "C")]), 1)
        self.assertFalse(any("normalize_curriculum" in c[0] for c in conn.calls))


if __name__ == "__main__":
    unittest.main()
