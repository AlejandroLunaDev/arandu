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


class LoadDescribedTest(unittest.TestCase):
    URL = "https://example.test/base/a/b/"

    def load(self, descriptions, inep=22):
        conn = FakeConn([(self.URL,)])
        order = []
        with mock.patch.object(curricula, "load_subjects", side_effect=lambda *a: order.append(len(conn.calls)) or 5) as load:
            result = curricula.load_described(conn, 7, ([("s",)], descriptions), inep, "https://example.test/base")
        return conn, load, order, result

    def test_codes_are_the_page_path_after_base_plus_the_name_and_inep_is_passed(self):
        conn, *_ = self.load([("Web", "Redes"), ("Data", "Dados")])
        upserts = [c for c in conn.calls if c[0].startswith("insert into public.disciplines")]
        self.assertEqual([c[1] for c in upserts], [("a/b#Web", "Web", ["Redes"], None, 7, 22), ("a/b#Data", "Data", ["Dados"], None, 7, 22)])
        self.assertEqual(conn.calls[1][1], (7, ["a/b#Web", "a/b#Data"]))

    def test_a_third_item_is_the_program_and_a_missing_one_is_none(self):
        conn, *_ = self.load([("Web", "d1", "p1\np2"), ("Data", "d2", None), ("Ops", "d3", ""), ("Pair", "d4")])
        upserts = [c[1] for c in conn.calls if c[0].startswith("insert into public.disciplines")]
        self.assertEqual([u[3] for u in upserts], ["p1\np2", None, None, None])

    def test_the_upsert_updates_program_and_its_changed_row_guard_covers_it(self):
        conn, *_ = self.load([("Web", "d1", "p")])
        sql = next(c[0] for c in conn.calls if c[0].startswith("insert into public.disciplines"))
        self.assertIn("program = excluded.program", sql)
        self.assertIn("disciplines.program", sql.split("where", 1)[1])

    def test_delete_first_then_upserts_then_load_subjects_last(self):
        conn, load, order, result = self.load([("Web", "Redes"), ("Data", "Dados")])
        sqls = [c[0] for c in conn.calls]
        self.assertTrue(sqls[0].startswith("select url from sources"))
        self.assertTrue(sqls[1].startswith("delete from public.disciplines where source_id"))
        self.assertTrue(all(q.startswith("insert into public.disciplines") for q in sqls[2:]))
        self.assertEqual(order, [4])
        load.assert_called_once_with(conn, 7, [("s",)])
        self.assertEqual(result, 1 + 2 + 5)

    def test_no_descriptions_still_deletes_the_pages_stale_disciplines_and_loads_the_subjects(self):
        conn, load, _, result = self.load([])
        self.assertEqual(conn.calls[1][1], (7, []))
        self.assertEqual(len(conn.calls), 2)
        load.assert_called_once_with(conn, 7, [("s",)])
        self.assertEqual(result, 1 + 5)


class InCityTest(unittest.TestCase):
    def test_sao_paulo_in_any_spelling_is_in_the_city(self):
        for city in ("SÃO PAULO", "São Paulo", " sao paulo "):
            self.assertTrue(curricula.in_city(city), city)

    def test_other_cities_are_not(self):
        for city in ("Campinas", "Santo André", "São Paulo do Potengi"):
            self.assertFalse(curricula.in_city(city), city)


class LoadCoursesTest(unittest.TestCase):
    def staged(self, conn):
        return [c[1] for c in conn.calls if "insert into staging.curriculum_courses" in c[0]]

    def test_the_same_url_with_two_cities_stages_one_source_in_both(self):
        conn = FakeConn([(42,), (0,), (42,), (0,)])  # source id, normalize count, per course
        curricula.load_courses(conn, "x_curriculum", 322, "UNIP", [("u", "Medicina", None, "SÃO PAULO"), ("u", "Medicina", None, "São Paulo")])
        self.assertEqual(self.staged(conn), [(42, 322, "Medicina", "SÃO PAULO", None, False, None), (42, 322, "Medicina", "São Paulo", None, False, None)])

    def test_a_course_page_outside_sao_paulo_is_neither_registered_nor_staged(self):
        conn = FakeConn([(42,), (0,)])
        written = curricula.load_courses(
            conn, "x", 1, "P", [("far", "N", None, "Santo André"), ("near", "N", None, "São Paulo")]
        )
        self.assertEqual([c[1][1] for c in conn.calls if c[0].startswith("insert into sources")], ["near"])
        self.assertEqual(self.staged(conn), [(42, 1, "N", "São Paulo", None, False, None)])
        self.assertEqual(written, 1 + 1)

    def test_every_unit_and_the_shift_are_passed_through_and_the_label_has_the_shift(self):
        conn = FakeConn([(42,), (0,)])
        curricula.load_courses(conn, "x", 1, "P", [("u", "N", "Noite", "São Paulo")], every_unit=True)
        self.assertEqual(self.staged(conn), [(42, 1, "N", "São Paulo", "Noite", True, None)])
        self.assertEqual(conn.calls[0][1], ("x", "u", "P: N (Noite)"))

    def test_units_are_staged_when_given_and_none_when_absent(self):
        conn = FakeConn([(42,), (0,), (43,), (0,)])
        curricula.load_courses(conn, "x", 1, "P", [("u", "N", None, "São Paulo", ["Butantã", "Mooca"]), ("v", "N", None, "São Paulo")])
        self.assertEqual(self.staged(conn), [(42, 1, "N", "São Paulo", None, False, ["Butantã", "Mooca"]), (43, 1, "N", "São Paulo", None, False, None)])

    def test_a_changed_course_renormalizes_its_page_and_adds_both_counts(self):
        conn = FakeConn([(42,), (5,)])
        written = curricula.load_courses(conn, "x", 1, "P", [("u", "N", None, "São Paulo")])
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
        self.assertEqual(curricula.load_courses(conn, "x", 1, "P", [("u", "N", None, "São Paulo")]), 1)
        self.assertFalse(any("normalize_curriculum" in c[0] for c in conn.calls))


class SplitTopicsTest(unittest.TestCase):
    def test_sentences_and_semicolons_are_topics_in_order(self):
        self.assertEqual(curricula.split_topics("Derivadas. Integral definida; métodos de integração. Limites."),
                         ["Derivadas", "Integral definida", "métodos de integração", "Limites"])

    def test_a_period_before_lowercase_or_after_an_ordinal_ends_no_topic(self):
        self.assertEqual(curricula.split_topics("Equações do 1o. e 2o. Graus. Noções de cálculo, ex. limites."),
                         ["Equações do 1o. e 2o. Graus", "Noções de cálculo, ex. limites"])

    def test_animas_spaced_bullets_split(self):
        self.assertEqual(curricula.split_topics(". Posse: Conceito . Propriedade .Garantias Reais"),
                         ["Posse: Conceito", "Propriedade", "Garantias Reais"])

    def test_numbered_items_split_at_their_numbers_only_and_keep_sub_items(self):
        text = "1 - Breve história. Origens; 2 - Noções de programas; 3 - Linguagens; 3.1 Entrada e saída"
        self.assertEqual(curricula.split_topics(text),
                         ["Breve história. Origens", "Noções de programas", "Linguagens; 3.1 Entrada e saída"])

    def test_one_numbered_item_is_prose(self):
        self.assertEqual(curricula.split_topics("7- Direitos Transversais. Responsabilidade social"),
                         ["7- Direitos Transversais", "Responsabilidade social"])

    def test_page_furniture_is_cut_out_and_the_sentence_joined(self):
        text = ("Conceitos da área de atuação Projeto Pedagógico do CST em Comércio Exterior Fatec Zona Leste - R-04 6. "
                "do curso. Ementário Pág. 34 Ênfase na oralidade.  Leitura")
        self.assertEqual(curricula.split_topics(text),
                         ["Conceitos da área de atuação do curso", "Ênfase na oralidade", "Leitura"])

    def test_pieces_that_are_no_topic_are_dropped(self):
        text = ("Redes. Veja https://example.test. Departamento de Física - 4 créditos. Prova final. "
                "Apresentação da disciplina e do plano. Assinado com senha por FULANO. 2. ;")
        self.assertEqual(curricula.split_topics(text), ["Redes"])


if __name__ == "__main__":
    unittest.main()
