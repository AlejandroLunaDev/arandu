import hashlib
import io
import unittest
import urllib.error
import zipfile
from pathlib import Path
from unittest import mock

import psycopg

from engine import mackenzie

FIXTURES = Path(__file__).parent / "fixtures" / "mackenzie"
LIST = (FIXTURES / "mackenzie_course_list.html").read_text(encoding="utf-8")
MATRIZ = (FIXTURES / "mackenzie_ciencia_da_computacao_matriz.html").read_text(encoding="utf-8")
DESIGN = (FIXTURES / "mack_design.html").read_text(encoding="utf-8")
FARMACIA = (FIXTURES / "mack_farmacia.html").read_text(encoding="utf-8")
CIVIL = (FIXTURES / "engenharia_civil_matriz.html").read_text(encoding="utf-8")
DIREITO = (FIXTURES / "direito_matriz.html").read_text(encoding="utf-8")
DIREITO_PDF = (FIXTURES / "direito_1_etapa.pdf").read_bytes()
BASE = "https://www.mackenzie.br/graduacao/"
LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
TAB_2026 = '<a class="nav-link active" href="#tab-content-14874"'
TAB_2018 = '<a class="nav-link " href="#tab-content-380043"'


def doc(text):
    return io.BytesIO(text.encode("utf-8"))


class ParseCoursesTest(unittest.TestCase):
    def test_sp_region_courses_get_matriz_url_and_campus_city_exact(self):
        self.assertEqual(
            mackenzie.parse_courses(doc(LIST)),
            [
                (BASE + "sao-paulo-higienopolis/administracao/matriz-curricular", "Administração", None, "São Paulo"),
                (BASE + "sao-paulo-higienopolis/ciencia-da-computacao/matriz-curricular", "Ciência da Computação", None, "São Paulo"),
                (BASE + "alphaville-tambore/administracao/matriz-curricular", "Administração", None, "Barueri"),
                (BASE + "campinas/administracao/matriz-curricular", "Administração", None, "Campinas"),
            ],
        )

    def test_a_course_listed_twice_appears_once(self):
        urls = [c[0] for c in mackenzie.parse_courses(doc(LIST))]
        self.assertEqual(len(urls), len(set(urls)))

    def test_slugs_without_a_published_address_are_left_out(self):
        urls = " ".join(c[0] for c in mackenzie.parse_courses(doc(LIST)))
        for slug in ("ead", "universidade-campus-alphaville", "brasilia"):
            self.assertNotIn(f"/graduacao/{slug}/", urls)

    def test_a_non_sp_address_does_not_make_its_slug_a_campus(self):
        self.assertIn(">DF<", LIST)  # the fixture keeps the real Brasília address
        self.assertNotIn("Brasília", {c[3] for c in mackenzie.parse_courses(doc(LIST))})

    def test_a_campus_losing_its_address_loses_its_courses(self):
        start = LIST.rindex("<address", 0, LIST.index("universidade/campinas/"))
        no_campinas = LIST[:start] + LIST[LIST.index("</address>", start) + len("</address>"):]
        self.assertNotIn("Campinas", {c[3] for c in mackenzie.parse_courses(doc(no_campinas))})

    def test_entities_in_course_names_are_unescaped(self):
        html = LIST.replace("<span>Administração</span>", "<span>Administra&ccedil;&atilde;o &amp; Gest&atilde;o</span>", 1)
        self.assertEqual(mackenzie.parse_courses(doc(html))[0][1], "Administração & Gestão")

    def test_no_sp_address_raises(self):
        with self.assertRaisesRegex(ValueError, "no SP campus"):
            mackenzie.parse_courses(doc(LIST.replace(">SP<", ">XX<")))

    def test_no_address_at_all_raises(self):
        with self.assertRaisesRegex(ValueError, "no SP campus"):
            mackenzie.parse_courses(doc("<html></html>"))

    def test_no_course_links_raise(self):
        with self.assertRaisesRegex(ValueError, "no course"):
            mackenzie.parse_courses(doc(LIST.replace('href="/graduacao/', 'href="/x/')))


class ParseCurriculumTest(unittest.TestCase):
    def setUp(self):
        self.subjects = mackenzie.parse_curriculum(doc(MATRIZ))

    def test_first_etapa_of_the_active_2026_version_exact(self):
        self.assertEqual(
            [s for s in self.subjects if s[0] == 1],
            [(1, 1, n, None, False) for n in (
                "ALGORITMOS E PROGRAMAÇÃO I",
                "CIÊNCIA, TECNOLOGIA E SOCIEDADE NA COMPUTAÇÃO",
                "CIRCUITOS ELÉTRICOS E ELETRÔNICOS",
                "CÁLCULO PARA CIÊNCIA DA COMPUTAÇÃO",
                "MATEMÁTICA DISCRETA I",
                "ÉTICA E CIDADANIA",
            )],
        )

    def test_second_etapa_is_also_year_one(self):
        second = [(y, n) for t, y, n, h, e in self.subjects if t == 2]
        self.assertEqual(len(second), 6)
        self.assertEqual({y for y, _ in second}, {1})
        self.assertIn((1, "BANCO DE DADOS I"), second)

    def test_the_2018_version_is_excluded(self):
        names = {n for t, y, n, h, e in self.subjects}
        self.assertNotIn("FUNDAMENTOS DE CIÊNCIA DA COMPUTAÇÃO", names)  # 2018 etapa 1
        self.assertFalse(any(n.startswith("OPTATIVA") for n in names))
        self.assertEqual({t for t, *_ in self.subjects}, {1, 2})

    def test_hours_are_none_and_nothing_is_elective(self):
        self.assertTrue(all(h is None and e is False for t, y, n, h, e in self.subjects))

    def test_2026_is_picked_because_its_version_tab_is_active(self):
        self.assertIn(TAB_2026, MATRIZ)  # both versions' etapa-1 panes are 'active in'; only the tab tells them apart
        self.assertIn("ÉTICA E CIDADANIA", {n for t, y, n, h, e in self.subjects})

    def test_only_optativa_names_are_electives_when_the_2018_tab_is_active(self):
        html = MATRIZ.replace(TAB_2026, TAB_2026.replace("nav-link active", "nav-link ")).replace(TAB_2018, TAB_2018.replace("nav-link ", "nav-link active"))
        subjects = mackenzie.parse_curriculum(doc(html))
        self.assertEqual({t for t, *_ in subjects}, {1, 2, 8})
        self.assertEqual([n for t, y, n, h, e in subjects if e], ["OPTATIVA I", "OPTATIVA II", "OPTATIVA III"])
        self.assertEqual([(t, y, h) for t, y, n, h, e in subjects if n == "ESTÁGIO OBRIGATÓRIO"], [(8, 4, None)])
        self.assertIn("FUNDAMENTOS DE CIÊNCIA DA COMPUTAÇÃO", {n for t, y, n, h, e in subjects})
        self.assertNotIn("BANCO DE DADOS I", {n for t, y, n, h, e in subjects})

    def single_version_page(self):
        # The 2018 section without its version tab: the etapa nav and the etapa panes, as a one-version page has them.
        nav = MATRIZ.rindex("<ul", 0, MATRIZ.index('href="#tab-content-1a_etapa380039"'))
        return MATRIZ[nav:]

    def test_a_single_version_page_without_tabs_works(self):
        subjects = mackenzie.parse_curriculum(doc(self.single_version_page()))
        self.assertEqual(len(subjects), 15)  # the 2018 panes hold 6 + 5 + 4 subjects
        self.assertEqual({t for t, *_ in subjects}, {1, 2, 8})

    def test_an_optativas_tab_after_the_etapas_is_not_a_version_and_its_subjects_are_left_out(self):
        pane = '<div id="tab-content-optativa380039" class="tab-pane fade"><div class="mc-MatrizCurricular"><table><tbody><tr><th>ROBOTICA</th><th>40</th></tr></tbody></table></div></div>'
        html = self.single_version_page().replace("</div></body></html>", pane + "</div></body></html>")
        self.assertIn("ROBOTICA", html)
        subjects = mackenzie.parse_curriculum(doc(html))
        self.assertEqual(len(subjects), 15)
        self.assertNotIn("ROBOTICA", {n for t, y, n, h, e in subjects})

    def test_entities_in_subject_names_are_unescaped(self):
        html = MATRIZ.replace("ÉTICA E CIDADANIA", "&Eacute;TICA &amp; CIDADANIA", 1)
        self.assertIn("ÉTICA & CIDADANIA", {n for t, y, n, h, e in mackenzie.parse_curriculum(doc(html))})

    def test_two_versions_and_no_active_tab_raise(self):
        with self.assertRaisesRegex(ValueError, "no active curriculum"):
            mackenzie.parse_curriculum(doc(MATRIZ.replace("nav-link active", "nav-link")))

    def test_active_version_without_subjects_raises(self):
        html = '<div id="tab-content-1a_etapa1" class="tab-pane fade active in"><table><tr><th>Disciplina</th><th>Carga</th></tr></table></div>'
        with self.assertRaisesRegex(ValueError, "no subject"):
            mackenzie.parse_curriculum(doc(html))


class ParseParagraphCurriculumTest(unittest.TestCase):
    """Layout with version tabs ('2018', '2014 - 2017') whose etapas list subjects as paragraphs."""

    def setUp(self):
        self.subjects = mackenzie.parse_curriculum(doc(CIVIL))

    def test_only_the_active_2018_version_comes_through(self):
        self.assertEqual({t for t, *_ in self.subjects}, {1, 2})
        self.assertEqual(len(self.subjects), 18)

    def test_first_etapa_runs_from_ciencia_tecnologia_to_eletiva_universal(self):
        etapa_1 = [name for term, _, name, _, _ in self.subjects if term == 1]
        self.assertEqual(etapa_1, [
            "Ciência, Tecnologia e Sociedade nas Engenharias", "Ciências do Ambiente", "Ética e Cidadania",
            "Física Geral e Experimental I", "Fundamentos de Matemática", "Linguagem de Programação",
            "Química Geral", "Projetos Integradores I", "Eletiva Universal"])

    def test_eletiva_universal_is_the_only_elective(self):
        self.assertEqual([(t, n) for t, _, n, _, e in self.subjects if e],
                         [(1, "Eletiva Universal"), (2, "Eletiva Universal")])

    def test_second_etapa_is_year_one(self):
        self.assertEqual({y for t, y, *_ in self.subjects if t == 2}, {1})

    def test_no_subject_of_the_2014_2017_version_appears(self):
        names = {name for _, _, name, _, _ in self.subjects}
        for old in ("Álgebra Linear", "Topografia I", "Geometria Descritiva", "Computação, Algoritmos e Programação I"):
            self.assertNotIn(old, names)
        self.assertNotIn("", names)


class ParsePageLayoutsTest(unittest.TestCase):
    """Trimmed real pages: nav tabs plus the 1st etapa pane of the chosen version and of another one."""

    def test_active_version_tab_without_a_pane_reads_the_etapas_ending_with_its_id(self):
        subjects = mackenzie.parse_curriculum(doc(DESIGN))
        self.assertEqual(
            subjects,
            [(1, 1, n, None, False) for n in (
                "Ciência Tecnologia e Sociedade na Arquitetura e Design",
                "Ferramentas Materiais e Processos do Design I",
                "Fundamentos Matemáticos e Físicos do Design I",
                "Histórias e Teorias do Design I",
                "Projeto I",
            )],
        )
        self.assertNotIn("PROJETO I", {s[2] for s in subjects})  # the 2023 version's pane is upper case

    def test_active_tab_that_is_not_a_curriculum_reads_the_version_of_the_latest_year(self):
        subjects = mackenzie.parse_curriculum(doc(FARMACIA))
        self.assertEqual(len(subjects), 9)
        self.assertEqual(subjects[0], (1, 1, "Anatomia Humana", None, False))
        self.assertNotIn("Anatomia", {s[2] for s in subjects})  # the 2014-2017 version's pane

    def test_active_tab_that_is_not_a_curriculum_and_versions_without_a_year_raise(self):
        html = FARMACIA.replace("Currículo 2026", "Currículo novo").replace("Currículo 2014-2017", "Currículo antigo")
        with self.assertRaisesRegex(ValueError, "no version names a year"):
            mackenzie.parse_curriculum(doc(html))


class ComponenteCurricularHeaderTest(unittest.TestCase):
    def test_a_componente_curricular_header_row_is_not_a_subject(self):
        html = ('<a href="#tab-content-1a_etapa1">1ª Etapa</a><div id="tab-content-1a_etapa1" class="tab-pane fade active in"><table>'
                '<tr><th>Componente Curricular</th><th>Carga</th></tr>'
                '<tr><th>Cálculo</th><th>4</th></tr></table></div>')
        self.assertEqual(mackenzie.parse_curriculum(doc(html)), [(1, 1, "Cálculo", None, False)])


class SidebarTest(unittest.TestCase):
    def test_the_last_etapa_ends_at_the_page_sidebar(self):
        html = ('<a href="#tab-content-1a_etapa1">1ª Etapa</a><div id="tab-content-1a_etapa1" class="tab-pane fade active in">'
                '<p>Cálculo</p><p>Física</p></div></div>'
                '<aside class="col-md-4"><p><b>Tipo:</b></p><p>Graduação</p><p><b>Modalidade:</b></p><p>Presencial</p>'
                '<p><b>Duração:</b></p><p>10 semestres</p><p>Prof. Maria Silva</p>'
                '<p>A mensalidade é de R$ 3.000,00</p></aside>')
        self.assertEqual([s[2] for s in mackenzie.parse_curriculum(doc(html))], ["Cálculo", "Física"])


def links(*hrefs):
    return "".join(f'<a href="{h}">x</a>' for h in hrefs)


class EmentaPdfsTest(unittest.TestCase):
    def test_first_etapa_file_names_are_found_absolute_and_deduplicated(self):
        names = ("1__Etapa.pdf", "1a_etapa2017-2A.pdf", "ETAPA_1.pdf", "Ementas_1_Etapa_-_ADM.pdf")
        html = links(*(f"/fileadmin/x/{n}" for n in names)) + links("/fileadmin/x/1__Etapa.pdf")
        self.assertEqual(mackenzie.ementa_pdfs(html), [f"https://www.mackenzie.br/fileadmin/x/{n}" for n in names])

    def test_other_etapas_and_non_ementa_links_are_left_out(self):
        html = links("/a/2_Etapa.pdf", "/a/11_Etapa.pdf", "/a/biblioteca_1_etapa.pdf", "/a/codigo_1_etapa.pdf",
                     "/a/regulamento_1_etapa.pdf", "/a/manual_1_etapa.pdf", "/a/calendario_1_etapa.pdf",
                     "/a/ebook_1_etapa.pdf", "/a/1__Etapa.pdf")
        self.assertEqual(mackenzie.ementa_pdfs(html), ["https://www.mackenzie.br/a/1__Etapa.pdf"])

    def test_without_a_first_etapa_link_it_falls_back_to_ementa_ppc_plano(self):
        html = links("/a/2_Etapa.pdf", "/a/Ementario.pdf", "/a/ementa-curso.pdf", "/a/PPC.pdf", "/a/plano.pdf",
                     "/a/ementa_biblioteca.pdf", "/a/outro.pdf")
        self.assertEqual(mackenzie.ementa_pdfs(html), [f"https://www.mackenzie.br/a/{n}" for n in
                                                       ("Ementario.pdf", "ementa-curso.pdf", "PPC.pdf", "plano.pdf")])

    def test_no_pdf_links_give_none(self):
        self.assertEqual(mackenzie.ementa_pdfs("<a href='/x.html'>x</a>"), [])


class DownloadPageTest(unittest.TestCase):
    def run_download(self, page, bodies):
        def fake(url, dest, **kw):
            body = page if url.endswith("matriz") else bodies[url]
            dest.seek(0)
            dest.truncate()
            dest.write(body)
            return hashlib.sha256(body).hexdigest()
        dest = io.BytesIO()
        with mock.patch.object(mackenzie.fetch, "download", side_effect=fake) as download:
            digest = mackenzie.download_page("https://www.mackenzie.br/x/matriz", dest)
        return digest, zipfile.ZipFile(io.BytesIO(dest.getvalue())), download

    def test_zip_holds_the_page_and_one_pdf_per_link_and_the_digest_covers_all(self):
        page = links("/a/1__Etapa.pdf", "/a/ETAPA_1.pdf").encode()
        bodies = {"https://www.mackenzie.br/a/1__Etapa.pdf": b"%PDF-one", "https://www.mackenzie.br/a/ETAPA_1.pdf": b"%PDF-two"}
        digest, bundle, download = self.run_download(page, bodies)
        self.assertEqual(bundle.namelist(), ["page.html", "0.pdf", "1.pdf"])
        self.assertEqual((bundle.read("page.html"), bundle.read("0.pdf"), bundle.read("1.pdf")), (page, b"%PDF-one", b"%PDF-two"))
        self.assertEqual(download.call_count, 3)
        expected = hashlib.sha256(hashlib.sha256(page).hexdigest().encode())
        for body in (b"%PDF-one", b"%PDF-two"):
            expected.update(hashlib.sha256(body).hexdigest().encode())
        self.assertEqual(digest, expected.hexdigest())

    def test_a_changed_pdf_changes_the_digest(self):
        page = links("/a/1__Etapa.pdf").encode()
        url = "https://www.mackenzie.br/a/1__Etapa.pdf"
        self.assertNotEqual(self.run_download(page, {url: b"%PDF-a"})[0], self.run_download(page, {url: b"%PDF-b"})[0])

    def test_a_page_without_pdfs_zips_only_the_page(self):
        digest, bundle, _ = self.run_download(b"<html></html>", {})
        self.assertEqual(bundle.namelist(), ["page.html"])

    def run_with_errors(self, errors):
        """Two PDF links; `errors` maps a url to the exception its download raises."""
        a, b = "https://www.mackenzie.br/a/1__Etapa.pdf", "https://www.mackenzie.br/a/ETAPA_1.pdf"
        page = links("/a/1__Etapa.pdf", "/a/ETAPA_1.pdf").encode()

        def fake(url, dest, **kw):
            if url in errors:
                raise errors[url]
            body = page if url.endswith("matriz") else b"%PDF-" + url[-6:].encode()
            dest.seek(0)
            dest.truncate()
            dest.write(body)
            return hashlib.sha256(body).hexdigest()
        dest = io.BytesIO()
        with mock.patch.object(mackenzie.fetch, "download", side_effect=fake):
            digest = mackenzie.download_page("https://www.mackenzie.br/x/matriz", dest)
        return digest, zipfile.ZipFile(io.BytesIO(dest.getvalue())), a, b

    def test_a_pdf_gone_404_is_skipped_and_the_digest_changes(self):
        gone = urllib.error.HTTPError("u", 404, "Not Found", {}, None)
        whole = self.run_with_errors({})[0]
        digest, bundle, *_ = self.run_with_errors({"https://www.mackenzie.br/a/1__Etapa.pdf": gone})
        self.assertEqual(bundle.namelist(), ["page.html", "1.pdf"])
        self.assertNotEqual(digest, whole)

    def test_a_pdf_answering_500_raises(self):
        down = urllib.error.HTTPError("u", 500, "Server Error", {}, None)
        with self.assertRaises(urllib.error.HTTPError):
            self.run_with_errors({"https://www.mackenzie.br/a/1__Etapa.pdf": down})

    def test_a_pdf_refused_by_robots_is_skipped_and_the_digest_changes(self):
        whole = self.run_with_errors({})[0]
        digest, bundle, *_ = self.run_with_errors({"https://www.mackenzie.br/a/ETAPA_1.pdf": PermissionError("robots")})
        self.assertEqual(bundle.namelist(), ["page.html", "0.pdf"])
        self.assertNotEqual(digest, whole)

    def test_the_page_itself_failing_still_raises(self):
        with mock.patch.object(mackenzie.fetch, "download", side_effect=urllib.error.HTTPError("u", 404, "x", {}, None)):
            with self.assertRaises(urllib.error.HTTPError):
                mackenzie.download_page("https://www.mackenzie.br/x/matriz", io.BytesIO())


EMENTA = "Estudo dos fundamentos da conduta etica e da cidadania na vida profissional."


class EmentasTest(unittest.TestCase):
    def run_ementas(self, lines, *names):
        return list(mackenzie._ementas(lines, {mackenzie._key(n).replace(" ", ""): n for n in names}))

    def test_heading_before_the_label_names_the_subject(self):
        lines = ["Componente Curricular", "Ética e Cidadania", "Ementa", EMENTA, "Objetivos", "ignored"]
        self.assertEqual(self.run_ementas(lines, "Ética e Cidadania"), [("eticaecidadania", EMENTA)])

    def test_inline_ementa_text_and_trailing_objetivos_are_cut(self):
        lines = ["Disciplina: Ética e Cidadania", "Ementa: " + EMENTA + " Objetivos conhecer tudo", "Bibliografia"]
        self.assertEqual(self.run_ementas(lines, "Ética e Cidadania"), [("eticaecidadania", EMENTA)])

    def test_body_runs_over_lines_until_a_heading_line(self):
        lines = ["Ética e Cidadania", "Ementa", "Estudo dos fundamentos da conduta", "etica e da cidadania na vida.",
                 "Conteúdo programático", "x"]
        self.assertEqual(self.run_ementas(lines, "Ética e Cidadania"),
                         [("eticaecidadania", "Estudo dos fundamentos da conduta etica e da cidadania na vida.")])

    def test_spaced_letters_in_headings_still_match(self):
        text = "Análise da especificidade da abordagem antropológica do direito."
        lines = ["Componente Curricular", "A NTROPOLOGIA JURÍDICA", "Ementa", text, "Objetivo"]
        self.assertEqual(self.run_ementas(lines, "Antropologia Jurídica"), [("antropologiajuridica", text)])

    def test_a_name_inside_a_longer_named_one_yields_to_it(self):
        lines = ["Disciplina", "Ética e Cidadania I", "Ementa", EMENTA, "Objetivo"]
        self.assertEqual(self.run_ementas(lines, "Ética e Cidadania", "Ética e Cidadania I"),
                         [("eticaecidadaniai", EMENTA)])

    def test_two_unrelated_names_in_one_heading_yield_nothing(self):
        lines = ["Disciplina", "Cálculo Física", "Ementa", EMENTA, "Objetivo"]
        self.assertEqual(self.run_ementas(lines, "Cálculo", "Física"), [])

    def test_the_two_readings_naming_different_subjects_yield_nothing(self):
        # the last 10 lines name Física only; the 4 lines from the last label, further back, name Cálculo only
        lines = ["Disciplina", "Cálculo"] + ["x"] * 10 + ["Física", "Ementa", EMENTA, "Objetivo"]
        self.assertEqual(self.run_ementas(lines, "Cálculo", "Física"), [])

    def test_the_label_reading_alone_can_name_the_subject(self):
        lines = ["Disciplina", "Cálculo"] + ["x"] * 12 + ["Ementa", EMENTA, "Objetivo"]
        self.assertEqual(self.run_ementas(lines, "Cálculo"), [("calculo", EMENTA)])

    def test_length_bounds_30_to_1500(self):
        head = ["Disciplina", "Cálculo", "Ementa"]
        self.assertEqual(self.run_ementas(head + ["a" * 29], "Cálculo"), [])
        self.assertEqual(len(self.run_ementas(head + ["a" * 30], "Cálculo")), 1)
        self.assertEqual(len(self.run_ementas(head + ["a" * 1500], "Cálculo")), 1)
        self.assertEqual(self.run_ementas(head + ["a" * 1501], "Cálculo"), [])

    def test_an_unknown_subject_is_ignored(self):
        self.assertEqual(self.run_ementas(["Disciplina", "Química", "Ementa", EMENTA], "Cálculo"), [])

    def test_a_second_block_does_not_read_the_first_blocks_heading(self):
        lines = ["Disciplina", "Cálculo", "Ementa", EMENTA, "Objetivo",
                 "Disciplina", "Física", "Ementa", EMENTA + " dois", "Objetivo"]
        self.assertEqual(self.run_ementas(lines, "Cálculo", "Física"),
                         [("calculo", EMENTA), ("fisica", EMENTA + " dois")])


def bundle_of(page, *pdfs):
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as z:
        z.writestr("page.html", page)
        for n, data in enumerate(pdfs):
            z.writestr(f"{n}.pdf", data)
    out.seek(0)
    return out


class ParsePageTest(unittest.TestCase):
    def setUp(self):
        self.subjects, self.ementas = mackenzie.parse_page(bundle_of(DIREITO, DIREITO_PDF))

    def test_the_real_direito_pdf_gives_one_ementa_per_first_etapa_subject(self):
        first = sorted(n for t, _, n, _, e in self.subjects if t == 1 and not e)
        self.assertEqual(len(first), 10)
        self.assertEqual([n for n, _ in self.ementas], first)
        self.assertTrue(all(30 <= len(e) <= 1500 for _, e in self.ementas))
        self.assertTrue(dict(self.ementas)["ANTROPOLOGIA JURÍDICA"].startswith(
            "Análise da especificidade da abordagem antropológica do direito."))

    def test_subjects_are_the_curriculum_of_the_page(self):
        self.assertEqual(self.subjects, mackenzie.parse_curriculum(doc(DIREITO)))

    def test_a_non_pdf_entry_is_skipped(self):
        subjects, ementas = mackenzie.parse_page(bundle_of(DIREITO, b"<html>not found</html>"))
        self.assertEqual((subjects, ementas), (self.subjects, []))

    def test_the_same_text_in_two_pdfs_counts_once(self):
        self.assertEqual(mackenzie.parse_page(bundle_of(DIREITO, DIREITO_PDF, DIREITO_PDF))[1], self.ementas)

    def test_a_name_with_two_different_texts_gets_none(self):
        texts = iter(["um texto de ementa bem longo para passar do minimo.", "outro texto de ementa bem longo para passar."])
        with mock.patch.object(mackenzie, "_ementas", side_effect=lambda lines, names: [("antropologiajuridica", next(texts))]):
            _, ementas = mackenzie.parse_page(bundle_of(DIREITO, DIREITO_PDF, DIREITO_PDF))
        self.assertEqual(ementas, [])

    def test_electives_and_later_terms_are_matched_but_never_described(self):
        found = [("eticaecidadania", EMENTA), ("eletivauniversal", EMENTA), ("calculonumerico", EMENTA)]
        with mock.patch.object(mackenzie, "_ementas", return_value=found) as called:
            _, ementas = mackenzie.parse_page(bundle_of(CIVIL, DIREITO_PDF))
        names = called.call_args.args[1]  # every subject is offered, so a later one can claim its own heading
        self.assertIn("eletivauniversal", names)
        self.assertIn("calculonumerico", names)
        self.assertEqual([n for n, _ in ementas], [names["eticaecidadania"]])

    def test_a_later_etapas_heading_is_not_credited_to_the_first_etapa_name_it_contains(self):
        subjects = [(1, 1, "Cálculo I", None, False), (2, 1, "Cálculo II", None, False),
                    (1, 1, "Filosofia", None, False), (3, 2, "Filosofia do Direito", None, False)]
        lines = ["Disciplina", "Cálculo II", "Ementa", EMENTA, "Objetivo",
                 "Disciplina", "Filosofia do Direito", "Ementa", EMENTA + " dois", "Objetivo"]
        pdf = mock.MagicMock()
        pdf.__enter__.return_value.pages = [mock.Mock(extract_text=lambda: "\n".join(lines))]
        with mock.patch.object(mackenzie, "parse_curriculum", return_value=subjects),                 mock.patch.object(mackenzie.pdfplumber, "open", return_value=pdf):
            _, ementas = mackenzie.parse_page(bundle_of("<html></html>", b"%PDF-x"))
        self.assertEqual(ementas, [])

    def test_a_first_etapa_heading_still_gets_its_ementa_beside_a_later_etapa_name_it_is_inside(self):
        subjects = [(1, 1, "Cálculo I", None, False), (2, 1, "Cálculo II", None, False)]
        pdf = mock.MagicMock()
        pdf.__enter__.return_value.pages = [mock.Mock(extract_text=lambda: "\n".join(
            ["Disciplina", "Cálculo I", "Ementa", EMENTA, "Objetivo"]))]
        with mock.patch.object(mackenzie, "parse_curriculum", return_value=subjects),                 mock.patch.object(mackenzie.pdfplumber, "open", return_value=pdf):
            _, ementas = mackenzie.parse_page(bundle_of("<html></html>", b"%PDF-x"))
        self.assertEqual(ementas, [("Cálculo I", EMENTA)])


class LoadDescribedLocalDbTest(unittest.TestCase):
    URL = BASE + "sao-paulo-higienopolis/direito/matriz-curricular"

    def setUp(self):
        try:
            self.conn = psycopg.connect(LOCAL_DB, connect_timeout=2)
        except psycopg.OperationalError as error:
            self.skipTest(f"local Supabase is not reachable: {error}")
        self.addCleanup(self.conn.close)  # never committed: closing rolls everything back
        run = self.conn.execute
        base = run("insert into sources (adapter, url, label, last_fetched_at) values ('inep_census', 'https://example.test/mack-census', 'c', now()) returning id").fetchone()[0]
        run("""insert into institutions (inep_code, name, kind, source_id) values (22, 'Mackenzie', 'private', %s)
               on conflict (inep_code) do nothing""", (base,))
        run("""insert into courses (inep_code, institution_id, name, degree, shift, duration_years, city, source_id)
               select 9990022, id, 'Direito', 'bacharelado', 'noturno', 5, 'São Paulo', %s
               from institutions where inep_code = 22""", (base,))
        mackenzie.courses.load(self.conn, 0, [(self.URL, "Direito", None, "São Paulo")])
        self.source = run("select id from sources where url = %s", (self.URL,)).fetchone()[0]
        self.parsed = mackenzie.parse_page(bundle_of(DIREITO, DIREITO_PDF))

    def disciplines(self):
        return dict(self.conn.execute("select code, topics from public.disciplines where source_id = %s", (self.source,)).fetchall())

    def test_load_stores_each_ementa_links_the_first_etapa_subjects_and_a_rerun_changes_nothing(self):
        mackenzie.curriculum.load(self.conn, self.source, self.parsed)
        found = self.disciplines()
        self.assertEqual(len(found), 10)
        code = "graduacao/sao-paulo-higienopolis/direito/matriz-curricular#ANTROPOLOGIA JURÍDICA"
        self.assertEqual(found[code], [dict(self.parsed[1])["ANTROPOLOGIA JURÍDICA"]])
        linked = self.conn.execute(
            "select count(*) from public.curriculum_subjects where source_id = %s and term = 1 and discipline_id is not null",
            (self.source,)).fetchone()[0]
        self.assertEqual(linked, 10)
        self.assertEqual(mackenzie.curriculum.load(self.conn, self.source, self.parsed), 0)


class WiringTest(unittest.TestCase):
    def test_curriculum_adapter_wires_download_parse_and_a_described_load(self):
        self.assertIs(mackenzie.curriculum.download, mackenzie.download_page)
        self.assertIs(mackenzie.curriculum.parse, mackenzie.parse_page)
        with mock.patch.object(mackenzie.curricula, "load_described", return_value=3) as load:
            self.assertEqual(mackenzie.curriculum.load("conn", 9, "parsed"), 3)
        load.assert_called_once_with("conn", 9, "parsed", 22, mackenzie.BASE)


if __name__ == "__main__":
    unittest.main()
