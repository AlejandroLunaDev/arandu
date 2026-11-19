import base64
import datetime
import hashlib
import io
import json
import re
import unittest
import urllib.error
import zipfile
from pathlib import Path
from unittest import mock

import psycopg

from engine import unifesp

FIXTURES = Path(__file__).parent / "fixtures" / "unifesp"
LIST = (FIXTURES / "unifesp_campus_1_courses.html").read_text(encoding="utf-8")
MATRIX = (FIXTURES / "unifesp_matrix_1671.html").read_text(encoding="utf-8")
UNIT = (FIXTURES / "unifesp_conteudo_programatico.html").read_text(encoding="utf-8")  # real: DANÇA E EXPRESSÃO CORPORAL (9750)
URL = "https://cursos.siiu.unifesp.br/graduacao/curso/matriz-curricular/"
LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
MATRIZ_URL = "https://cursos.siiu.unifesp.br/graduacao/curso/matriz-curricular/abc/detalhes"
LIST_URL = "https://cursos.siiu.unifesp.br/graduacao/lista-unidades-curriculares?filter_campi=5&filter_curso=1671"
THIS_YEAR = datetime.date.today().year
FIRST = "CÁLCULO EM UMA VARIÁVEL"  # a real first-termo name of the 1671 matriz fixture
SECOND_TERM = next(n for t, _, n, _, _ in unifesp.parse_curriculum(io.BytesIO(MATRIX.encode())) if t == 2)
LONG = "Estudo dos limites, derivadas e integrais de funções reais de uma variável, com aplicações."


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


class ParseCoursesTest(unittest.TestCase):
    def test_active_matrix_url_name_shift_and_city_exact(self):
        self.assertEqual(
            unifesp.parse_courses(doc(LIST)),
            [
                (URL + "eyJjdXJzb19pZF9jdXJzbyI6IjIyMDciLCJjb2QiOiI0In0=/detalhes", "BIOMEDICINA", "INTEGRAL", "SÃO PAULO"),
                (URL + "eyJjdXJzb19pZF9jdXJzbyI6IjIwNjAiLCJjb2QiOiIyIn0=/detalhes", "CURSO SUPERIOR DE TECNOLOGIA EM RADIOLOGIA", "INTEGRAL", "SÃO PAULO"),
                (URL + "eyJjdXJzb19pZF9jdXJzbyI6IjUiLCJjb2QiOiIzIn0=/detalhes", "ENFERMAGEM - BACHAREL", "INTEGRAL", "SÃO PAULO"),
            ],
        )

    def test_course_without_a_single_active_matrix_is_skipped(self):
        no_active = LIST.replace("000004 - ATIVA", "000004 - INATIVA")
        self.assertEqual([c[1] for c in unifesp.parse_courses(doc(no_active))][0], "CURSO SUPERIOR DE TECNOLOGIA EM RADIOLOGIA")

    def test_two_active_matrices_are_ambiguous_and_skipped(self):
        two = LIST.replace("000001 - INATIVA", "000001 - ATIVA", 1)
        self.assertNotIn("BIOMEDICINA", [c[1] for c in unifesp.parse_courses(doc(two))])

    def test_regional_campus_names_become_their_city(self):
        for campus, city in (("BAIXADA SANTISTA", "Santos"), ("ZONA LESTE", "São Paulo"), ("OSASCO", "OSASCO")):
            with self.subTest(campus):
                got = unifesp.parse_courses(doc(LIST.replace("</strong>SÃO PAULO</p>", f"</strong>{campus}</p>")))
                self.assertEqual({c[3] for c in got}, {city})

    def test_name_without_a_shift_keeps_shift_none(self):
        # real rows without a trailing shift exist, e.g. 'CURSO SUPERIOR DE TECNOLOGIA EM DESIGN EDUCACIONAL'
        got = unifesp.parse_courses(doc(LIST.replace("BIOMEDICINA - INTEGRAL", "BIOMEDICINA")))
        self.assertEqual(got[0][1:3], ("BIOMEDICINA", None))

    def test_list_without_an_active_course_raises(self):
        with self.assertRaisesRegex(ValueError, "no course"):
            unifesp.parse_courses(doc(LIST.replace("ATIVA", "INATIVA").replace("ININATIVA", "INATIVA")))


class ParseCurriculumTest(unittest.TestCase):
    def setUp(self):
        self.subjects = unifesp.parse_curriculum(doc(MATRIX))

    def test_subjects_per_termo_with_hours_and_exact_tuples(self):
        self.assertEqual(
            [s for s in self.subjects if s[0] == 2],
            [(2, None, "ALGORITMOS E ESTRUTURAS DE DADOS I", 72, None), (2, None, "ANATOMIA", 36, None)],
        )
        self.assertEqual([s[0] for s in self.subjects], [1, 1, 1, 2, 2, 3, 3])

    def test_year_and_is_elective_are_none(self):
        self.assertTrue(all(s[1] is None and s[4] is None for s in self.subjects))

    def test_hidden_equivalence_rows_are_not_subjects(self):
        names = [s[2] for s in self.subjects]
        self.assertIn("CÁLCULO EM UMA VARIÁVEL", names)
        self.assertNotIn("CÁLCULO DIFERENCIAL E INTEGRAL I", names)

    def test_criteria_section_is_not_read(self):
        extra = '<tr><td>9</td><td>X</td><td>1</td><td>1</td><td>2</td><td>-</td><td></td></tr>'
        head, sep, tail = MATRIX.partition("Critérios de integralização</strong></h5>")
        self.assertEqual(len(unifesp.parse_curriculum(doc(head + sep + extra + tail))), len(self.subjects))

    def test_zero_total_hours_become_none(self):
        zero = MATRIX.replace('data-th="Carga Horária">36<', 'data-th="Carga Horária">0<', 1)
        self.assertIsNone(unifesp.parse_curriculum(doc(zero))[1][3])

    def test_non_numeric_hours_raise(self):
        bad = MATRIX.replace('data-th="Carga Horária">36<', 'data-th="Carga Horária">-<', 1)
        with self.assertRaisesRegex(ValueError, "unexpected hours"):
            unifesp.parse_curriculum(doc(bad))

    def test_matrix_without_units_raises(self):
        with self.assertRaisesRegex(ValueError, "no curricular unit"):
            unifesp.parse_curriculum(doc("<html>Critérios de integralização</strong></h5></html>"))



class UnpublishedStructureTest(unittest.TestCase):
    def test_a_matriz_with_no_structure_raises(self):
        page = (FIXTURES / "unifesp_no_structure.html").read_text(encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "publishes no curricular structure"):
            unifesp.parse_curriculum(doc(page))

    def test_a_complementar_pool_without_a_termo_raises(self):
        page = (FIXTURES / "unifesp_abi_complementar.html").read_text(encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "only a 'Formação complementar' pool, with no termo"):
            unifesp.parse_curriculum(doc(page))


def offer(mater, turno="I", pad=True):
    key = base64.b64encode(json.dumps({"mater_id_mater": str(mater), "turno": turno}).encode()).decode()
    return f"{unifesp.BASE}/graduacao/oferta/{key if pad else key.rstrip('=')}/conteudo-programatico"


def listing(*urls):
    return "".join(f'<button data-url="{u}">x</button>' for u in urls)


def unit_page(name, ementa=LONG, code=1):
    page = UNIT.replace("DANÇA E EXPRESSÃO CORPORAL (9750)", f"{name} ({code})")
    tag = '<p class="card-text quebra-texto mb-0">'
    start = page.index(tag, page.index("<strong>Ementa</strong>")) + len(tag)
    return page[:start] + ementa + page[page.index("</p>", start):]


def bundle(matriz, *units):
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as z:
        z.writestr("page.html", matriz)
        for n, unit in enumerate(units):
            z.writestr(f"{n}.html", unit)
    out.seek(0)
    return out


class UnitKeyTest(unittest.TestCase):
    def test_padded_and_unpadded_base64_give_the_same_matter_id(self):
        for mater in (9750, 97500, 1):
            with self.subTest(mater):
                padded, bare = offer(mater).split("/")[-2], offer(mater, pad=False).split("/")[-2]
                self.assertEqual(unifesp._unit(padded), str(mater))
                self.assertEqual(unifesp._unit(bare), str(mater))

    def test_the_real_offer_key_without_padding_is_read(self):
        key = "eyJtYXRlcl9pZF9tYXRlciI6Ijk3NTAiLCJzZXJpZV9hbm9fbGV0aXZvIjoiMjAyNiIsInNlcmllX3NlcmllIjoiMSIsInNlcmllX3NlbWVzdHJlIjoiMSIsInNlcmllX2N1cnNvX2lkX2N1cnNvIjoiNzgwIiwidHVybm8iOiJJIn0"
        self.assertEqual(unifesp._unit(key), "9750")


DANCE_PROGRAM = [  # the real unit's Conteúdo Programático card: one line per <br>, blank lines dropped
    "- Arte e poéticas do corpo;",
    "- A dança como linguagem: a prosa e a poética;",
    "- As motivações da dança: social, étnica e artística;",
    "- Os estudos do movimento a partir das teorias modernas da dança;",
    "- O movimento humano: esforços, dinâmicas, planos, espaços;",
    "- Os sentidos e das relações do corpo com o espaço;",
    "- Educação somática: a dança e a saúde;",
    "- Percepção rítmica e apreciação musical;",
    "- O ritmo e a musicalidade;",
    "- Propriedades do som e da música;",
    "- Ritmo, melodia e harmonia;",
    "- Compasso musical;",
    "- Educação rítmica.",
    "Metodologias de ensino:",
    "1) Vivências presenciais de dança;",
    "2) Aulas práticas acerca das pedagogias dança;",
    "3) Trabalhos práticos em grupo;",
    "4) Apresentações coletivas.",
    "Em caso de suspensão parcial ou total de encontros presenciais:",
    "1) envio de videoaulas;",
    "2) atividades a serem realizadas à distância pelos estudantes;",
    "3) encontros virtuais síncronos via Google Meet para discussão.",
    "Os encontros síncronos também serão gravados e disponibilizados via email da turma e/ou Google Classroom.",
]
PROGRAM = "\n".join(DANCE_PROGRAM)  # unit_page keeps the fixture's card, so every built page carries it


class ParsePageTest(unittest.TestCase):
    def triples(self, *units, matriz=MATRIX):
        return unifesp.parse_page(bundle(matriz, *units))

    def test_first_termo_name_keeps_its_ementa_and_program_and_the_subjects_are_the_matriz(self):
        subjects, triples = self.triples(unit_page(FIRST))
        self.assertEqual(subjects, unifesp.parse_curriculum(doc(MATRIX)))
        self.assertEqual(triples, [(FIRST, LONG, PROGRAM)])

    def test_the_real_page_gives_its_exact_ementa_and_program_lines(self):
        matriz = MATRIX.replace(FIRST, "DANÇA E EXPRESSÃO CORPORAL")
        _, triples = self.triples(UNIT, matriz=matriz)
        self.assertEqual(triples, [("DANÇA E EXPRESSÃO CORPORAL", "Estudo da dança como tema da cultura corporal contemporânea; Estudo do ritmo e suas relações com a expressão do movimento humano. Reconhecimento da dança como prática de atuação para o profissional da Educação Física e Saúde.", PROGRAM)])
        self.assertEqual(len(triples[0][2].split("\n")), 23)

    def test_a_unit_without_a_conteudo_card_has_program_none(self):
        no_content = unit_page(FIRST).replace("<strong>Conteúdo Programático</strong>", "<strong>Outro</strong>")
        self.assertEqual(self.triples(no_content)[1], [(FIRST, LONG, None)])

    def test_a_unit_of_a_later_termo_is_ignored(self):
        self.assertEqual(self.triples(unit_page(SECOND_TERM))[1], [])

    def test_a_name_missing_from_the_matriz_is_ignored(self):
        self.assertEqual(self.triples(unit_page("OUTRA COISA"))[1], [])

    def test_two_different_ementas_for_one_name_are_dropped(self):
        self.assertEqual(self.triples(unit_page(FIRST), unit_page(FIRST, LONG + " Outra."))[1], [])

    def test_two_different_programs_for_one_name_are_dropped(self):
        other = unit_page(FIRST).replace("- Educação rítmica.", "- Outra coisa.")
        self.assertEqual(self.triples(unit_page(FIRST), other)[1], [])

    def test_the_same_ementa_and_program_twice_is_kept_once(self):
        self.assertEqual(self.triples(unit_page(FIRST), unit_page(FIRST))[1], [(FIRST, LONG, PROGRAM)])

    def test_a_short_ementa_is_dropped_and_thirty_chars_is_kept(self):
        self.assertEqual(self.triples(unit_page(FIRST, "x" * 29))[1], [])
        self.assertEqual(self.triples(unit_page(FIRST, "x" * 30))[1], [(FIRST, "x" * 30, PROGRAM)])

    def test_inverted_question_mark_becomes_a_dash_and_entities_and_tags_are_cleaned(self):
        _, triples = self.triples(unit_page(FIRST, "Limites ¿ derivadas &amp; <b>integrais</b>   de funções reais."))
        self.assertEqual(triples, [(FIRST, "Limites – derivadas & integrais de funções reais.", PROGRAM)])

    def test_a_page_without_name_or_ementa_is_skipped(self):
        self.assertEqual(self.triples("<html></html>", unit_page(FIRST).replace("Ementa", "Outro"))[1], [])

    def test_only_page_html_gives_the_subjects_and_no_triples(self):
        subjects, triples = self.triples()
        self.assertEqual((subjects, triples), (unifesp.parse_curriculum(doc(MATRIX)), []))

    def test_triples_are_sorted_by_name(self):
        other = next(n for t, _, n, _, _ in unifesp.parse_curriculum(doc(MATRIX)) if t == 1 and n != FIRST)
        names = [n for n, *_ in self.triples(unit_page(FIRST), unit_page(other))[1]]
        self.assertEqual(names, sorted([FIRST, other]))

    def test_a_matriz_without_structure_still_raises(self):
        with self.assertRaises(ValueError):
            self.triples(matriz=(FIXTURES / "unifesp_no_structure.html").read_text(encoding="utf-8"))


class CardTest(unittest.TestCase):
    def card(self, html):
        return unifesp._card(re.search("(.*)", html, re.S))

    def test_no_match_is_empty(self):
        self.assertEqual(unifesp._card(None), "")

    def test_the_inverted_question_marks_become_dashes_and_quotes_and_a_lone_one_stays(self):
        html = "¿ Concepções:<br />O Módulo ¿dos tecidos aos sistemas¿, eixo ¿O Ser¿<br/>L¿Hôpital ¿ x"
        self.assertEqual(self.card(html), "– Concepções:\nO Módulo “dos tecidos aos sistemas”, eixo “O Ser”\nL¿Hôpital – x")

    def test_one_line_per_br_with_tags_entities_and_whitespace_cleaned_and_empty_lines_dropped(self):
        self.assertEqual(self.card("a  <b>b</b> &amp; c<br>\n<br />\t<BR/>d"), "a b & c\nd")


def query(year, semester):
    return f"&filter_anoLetivo={year}&filter_semestre={semester}&filter_termo=1"


class DownloadMatrizTest(unittest.TestCase):
    MATRIZ = f'<a href="{LIST_URL.replace("&", "&amp;")}">unidades</a>'

    def run_download(self, matriz, bodies, errors=None):
        """bodies maps a url or a url suffix to its text; every url fetched is recorded."""
        seen = []

        def fake(url, dest, **kw):
            seen.append(url)
            if errors and url in errors:
                raise errors[url]
            body = (matriz if url == MATRIZ_URL else next(b for k, b in bodies.items() if url.endswith(k))).encode()
            dest.seek(0)
            dest.truncate()
            dest.write(body)
            return hashlib.sha256(body).hexdigest()

        dest = io.BytesIO()
        with mock.patch.object(unifesp.fetch, "download", side_effect=fake):
            digest = unifesp.download_matriz(MATRIZ_URL, dest)
        return digest, zipfile.ZipFile(io.BytesIO(dest.getvalue())), seen

    def test_first_semester_with_offers_stops_there(self):
        a = offer(1)
        _, z, seen = self.run_download(self.MATRIZ, {query(THIS_YEAR, 1): listing(a), a: "unit a"})
        self.assertEqual(seen, [MATRIZ_URL, LIST_URL + query(THIS_YEAR, 1), a])
        self.assertEqual(z.namelist(), ["page.html", "0.html"])
        self.assertEqual(z.read("0.html"), b"unit a")
        self.assertEqual(z.read("page.html"), self.MATRIZ.encode())

    def test_empty_semester_1_falls_back_to_semester_0(self):
        a = offer(2)
        _, z, seen = self.run_download(self.MATRIZ, {query(THIS_YEAR, 1): "none", query(THIS_YEAR, 0): listing(a), a: "unit"})
        self.assertEqual(seen, [MATRIZ_URL, LIST_URL + query(THIS_YEAR, 1), LIST_URL + query(THIS_YEAR, 0), a])
        self.assertEqual(z.namelist(), ["page.html", "0.html"])

    def test_falls_back_to_last_year_in_order_when_this_year_is_empty(self):
        a = offer(3)
        order = [query(THIS_YEAR, 1), query(THIS_YEAR, 0), query(THIS_YEAR - 1, 1), query(THIS_YEAR - 1, 0)]
        for n in (3, 4):
            with self.subTest(n):
                bodies = {q: "none" for q in order[:n - 1]} | {order[n - 1]: listing(a), a: "u"}
                _, z, seen = self.run_download(self.MATRIZ, bodies)
                self.assertEqual(seen[1:-1], [LIST_URL + q for q in order[:n]])
                self.assertEqual(len(z.namelist()), 2)

    def test_no_offer_under_any_filter_gives_only_page_html(self):
        order = [query(THIS_YEAR, 1), query(THIS_YEAR, 0), query(THIS_YEAR - 1, 1), query(THIS_YEAR - 1, 0)]
        _, z, seen = self.run_download(self.MATRIZ, {q: "none" for q in order})
        self.assertEqual(z.namelist(), ["page.html"])
        self.assertEqual(len(seen), 5)

    def test_one_unit_across_two_classes_is_fetched_once(self):
        a1, a2, b = offer(10, "I"), offer(10, "N", pad=False), offer(11)
        self.assertNotEqual(a1, a2)
        _, z, seen = self.run_download(self.MATRIZ, {query(THIS_YEAR, 1): listing(a1, a2, b), a1: "a", b: "b"})
        self.assertEqual(seen[2:], [a1, b])
        self.assertEqual([z.read(n) for n in z.namelist()[1:]], [b"a", b"b"])

    def test_a_page_without_a_list_link_gives_only_page_html_and_one_fetch(self):
        digest, z, seen = self.run_download("<html></html>", {})
        self.assertEqual((z.namelist(), seen), (["page.html"], [MATRIZ_URL]))
        self.assertEqual(digest, hashlib.sha256(hashlib.sha256(b"<html></html>").hexdigest().encode()).hexdigest())

    def test_the_digest_changes_when_a_unit_page_changes_and_not_otherwise(self):
        a = offer(1)
        bodies = {query(THIS_YEAR, 1): listing(a), a: "v1"}
        self.assertEqual(self.run_download(self.MATRIZ, bodies)[0], self.run_download(self.MATRIZ, bodies)[0])
        self.assertNotEqual(self.run_download(self.MATRIZ, bodies)[0], self.run_download(self.MATRIZ, bodies | {a: "v2"})[0])

    def test_the_digest_changes_when_the_matriz_page_changes(self):
        empty = {"&filter_termo=1": "none"}
        self.assertNotEqual(self.run_download(self.MATRIZ + " ", empty)[0], self.run_download(self.MATRIZ, empty)[0])

    def test_an_error_fetching_a_unit_page_propagates(self):
        a = offer(1)
        err = urllib.error.HTTPError(a, 500, "boom", {}, None)
        with self.assertRaises(urllib.error.HTTPError):
            self.run_download(self.MATRIZ, {query(THIS_YEAR, 1): listing(a)}, errors={a: err})

    def test_an_error_fetching_the_listing_propagates(self):
        url = LIST_URL + query(THIS_YEAR, 1)
        with self.assertRaises(urllib.error.HTTPError):
            self.run_download(self.MATRIZ, {}, errors={url: urllib.error.HTTPError(url, 503, "x", {}, None)})

    def test_dest_is_rewritten_from_scratch(self):
        dest = io.BytesIO(b"stale bytes that must go" * 50)
        with mock.patch.object(unifesp.fetch, "download", side_effect=lambda u, d, **k: (d.write(b"<html></html>"), "h")[1]):
            unifesp.download_matriz(MATRIZ_URL, dest)
        self.assertEqual(zipfile.ZipFile(io.BytesIO(dest.getvalue())).namelist(), ["page.html"])


class CurriculumLocalDbTest(unittest.TestCase):
    def setUp(self):
        try:
            self.conn = psycopg.connect(LOCAL_DB, connect_timeout=2)
        except psycopg.OperationalError as error:
            self.skipTest(f"local Supabase is not reachable: {error}")
        self.addCleanup(self.conn.close)  # never committed: closing rolls everything back
        run = self.conn.execute
        base = run("insert into sources (adapter, url, label, last_fetched_at) values ('inep_census', 'https://example.test/unifesp-census', 'c', now()) returning id").fetchone()[0]
        run("""insert into institutions (inep_code, name, kind, source_id) values (591, 'Unifesp', 'public', %s)
               on conflict (inep_code) do nothing""", (base,))
        run("""insert into courses (inep_code, institution_id, name, degree, shift, duration_years, city, source_id)
               select 9990591, id, 'Teste', 'bacharelado', 'integral', 4, 'São Paulo', %s
               from institutions where inep_code = 591""", (base,))
        unifesp.courses.load(self.conn, 0, [(MATRIZ_URL, "Teste", "INTEGRAL", "São Paulo")])
        self.source = run("select id from sources where url = %s", (MATRIZ_URL,)).fetchone()[0]
        self.parsed = unifesp.parse_page(bundle(MATRIX, unit_page(FIRST)))

    def test_load_stores_unifesp_disciplines_links_the_matching_subject_and_a_rerun_changes_nothing(self):
        unifesp.curriculum.load(self.conn, self.source, self.parsed)
        found = {code: (topics, program) for code, topics, program in self.conn.execute(
            "select d.code, d.topics, d.program from public.disciplines d join public.institutions i on i.id = d.institution_id "
            "where d.source_id = %s and i.inep_code = 591", (self.source,)).fetchall()}
        self.assertEqual(found, {f"graduacao/curso/matriz-curricular/abc/detalhes#{FIRST}": ([LONG], PROGRAM)})
        linked = self.conn.execute(
            "select name from public.curriculum_subjects where source_id = %s and discipline_id is not null", (self.source,)).fetchall()
        self.assertEqual(linked, [(FIRST,)])
        self.assertEqual(unifesp.curriculum.load(self.conn, self.source, self.parsed), 0)

    def test_a_changed_program_rewrites_one_row_and_a_program_less_unit_stores_null(self):
        unifesp.curriculum.load(self.conn, self.source, self.parsed)
        subjects, (name, ementa, program) = self.parsed[0], self.parsed[1][0]
        changed = program + chr(10) + '- Nova linha.'
        self.assertEqual(unifesp.curriculum.load(self.conn, self.source, (subjects, [(name, ementa, changed)])), 1)
        stored = lambda: self.conn.execute('select program from public.disciplines where source_id = %s', (self.source,)).fetchone()[0]
        self.assertEqual(stored(), changed)
        self.assertEqual(unifesp.curriculum.load(self.conn, self.source, (subjects, [(name, ementa, None)])), 1)
        self.assertIsNone(stored())


class WiringTest(unittest.TestCase):
    def test_curriculum_adapter_wires_download_parse_and_a_described_load(self):
        self.assertIs(unifesp.curriculum.download, unifesp.download_matriz)
        self.assertIs(unifesp.curriculum.parse, unifesp.parse_page)
        with mock.patch.object(unifesp.curricula, "load_described", return_value=3) as load:
            self.assertEqual(unifesp.curriculum.load("conn", 9, "parsed"), 3)
        load.assert_called_once_with("conn", 9, "parsed", 591, unifesp.BASE)


if __name__ == "__main__":
    unittest.main()
