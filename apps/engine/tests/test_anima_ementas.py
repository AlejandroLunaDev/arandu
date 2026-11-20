import hashlib
import io
import unittest
import urllib.error
import zipfile
from pathlib import Path
from unittest import mock

import psycopg

from engine import __main__ as cli
from engine import anima

FIXTURE = (Path(__file__).parent / "fixtures" / "anima" / "anima_usjt_ementario_cc.pdf").read_bytes()
LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DOCS = "https://www.usjt.br/sobre/documentos-institucionais/"
STATIC = "https://estaticos.animaeducacao.com.br/"
TEXT = "Estudo dos fundamentos da teoria da computacao e das suas aplicacoes praticas."


def pdf(lines, links=()):
    """A one-page PDF with one text line per entry and one URI link annotation per link."""
    content = "BT /F1 9 Tf 12 1980 Td 12 TL " + " ".join(
        "(%s) Tj T*" % line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines) + " ET"
    annots = " ".join(f"{6 + i} 0 R" for i in range(len(links)))
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 2000] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> /Annots [{annots}] >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ] + [f"<< /Type /Annot /Subtype /Link /Rect [10 10 200 30] /Border [0 0 0] /A << /S /URI /URI ({uri}) >> >>"
         for uri in links]
    out, offsets = b"%PDF-1.4\n", []
    for n, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{n} 0 obj\n{body}\nendobj\n".encode("latin-1")
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    out += "".join(f"{o:010d} 00000 n \n" for o in offsets).encode()
    return out + f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()


def block(name, text=TEXT):
    return [f"UNIDADE CURRICULAR: {name}", f"EMENTA: {text}", "BIBLIOGRAFIA BASICA", "Fulano. Livro. 2020."]


def bundle(*items):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for n, data in enumerate(items):
            z.writestr(f"{n}.pdf", data)
    buf.seek(0)
    return buf


class UnitsTest(unittest.TestCase):
    def units(self, *lines):
        return list(anima._units(lines))

    def test_a_normal_block(self):
        self.assertEqual(self.units(*block("Calculo I")), [("Calculo I", TEXT)])

    def test_text_before_the_first_block_and_between_blocks_is_ignored(self):
        lines = ["Cabecalho", *block("A"), "rodape", *block("B", TEXT + " B")]
        self.assertEqual(self.units(*lines), [("A", TEXT), ("B", TEXT + " B")])

    def test_a_name_wrapped_over_lines_is_joined_until_ementa(self):
        lines = ["UNIDADE CURRICULAR: Laboratorio de", "  programacao e algoritmos  ", f"EMENTA: {TEXT}", "BIBLIOGRAFIA"]
        self.assertEqual(self.units(*lines), [("Laboratorio de programacao e algoritmos", TEXT)])

    def test_ementa_text_on_following_lines_is_joined_and_spaces_collapsed(self):
        lines = ["UNIDADE CURRICULAR: A", "EMENTA:", "Estudo dos fundamentos   da teoria", "da computacao e das suas aplicacoes.", "BIBLIOGRAFIA"]
        self.assertEqual(self.units(*lines), [("A", "Estudo dos fundamentos da teoria da computacao e das suas aplicacoes.")])

    def test_a_block_without_bibliography_at_eof_is_not_yielded(self):
        self.assertEqual(self.units("UNIDADE CURRICULAR: A", f"EMENTA: {TEXT}"), [])

    def test_an_unfinished_block_is_replaced_by_the_next_unit_line(self):
        self.assertEqual(self.units("UNIDADE CURRICULAR: A", f"EMENTA: {TEXT}", *block("B")), [("B", TEXT)])

    def test_text_too_short_or_too_long_is_dropped_and_the_limits_are_kept(self):
        self.assertEqual(self.units(*block("Curta", "x" * 29)), [])
        self.assertEqual(self.units(*block("Longa", "x" * 1501)), [])
        self.assertEqual(self.units(*block("Min", "x" * 30)), [("Min", "x" * 30)])
        self.assertEqual(self.units(*block("Max", "x" * 1500)), [("Max", "x" * 1500)])

    def test_a_name_over_150_chars_is_dropped_and_150_is_kept(self):
        self.assertEqual(self.units(*block("n" * 151)), [])
        self.assertEqual(self.units(*block("n" * 150)), [("n" * 150, TEXT)])

    def test_a_dropped_block_does_not_swallow_the_next(self):
        self.assertEqual(self.units(*block("Curta", "x"), *block("Boa")), [("Boa", TEXT)])


class ParseEmentasTest(unittest.TestCase):
    def test_the_real_cc_ementario_yields_its_units(self):
        units = anima.parse_ementas(bundle(FIXTURE))
        self.assertGreater(len(units), 10)
        self.assertEqual(units, sorted(units))
        self.assertTrue(all(name and 30 <= len(text) <= 1500 for name, text in units))
        self.assertIn("Academia de Futuros Profissionais", [n for n, _ in units])

    def test_generated_pdf_gives_its_units_sorted(self):
        units = anima.parse_ementas(bundle(pdf(block("Banco de dados") + block("Algoritmos"))))
        self.assertEqual(units, [("Algoritmos", TEXT), ("Banco de dados", TEXT)])

    def test_two_pdfs_with_different_texts_for_a_name_drop_it_and_the_same_text_keeps_it(self):
        first = pdf(block("Conflito", TEXT) + block("Igual") + block("So aqui"))
        second = pdf(block("conflito", TEXT + " Outra.") + block("IGUAL"))
        units = anima.parse_ementas(bundle(first, second))
        self.assertEqual(units, [("Igual", TEXT), ("So aqui", TEXT)])

    def test_a_name_only_differing_in_case_still_conflicts_when_its_text_differs(self):
        with self.assertRaisesRegex(ValueError, "no ementa found"):
            anima.parse_ementas(bundle(pdf(block("Calculo")), pdf(block("CALCULO", TEXT + " Dois."))))

    def test_a_non_pdf_entry_is_skipped(self):
        self.assertEqual(anima.parse_ementas(bundle(b"<html>UNIDADE CURRICULAR: X</html>", pdf(block("A")))), [("A", TEXT)])

    def test_nothing_found_raises(self):
        for items in ((), (b"<html></html>",), (pdf(["nada aqui"]),)):
            with self.subTest(items=len(items)), self.assertRaisesRegex(ValueError, "no ementa found"):
                anima.parse_ementas(bundle(*items))


class DownloadEmentasTest(unittest.TestCase):
    PPC1, PPC2, PPC_EAD = STATIC + "a/PPC_PRES_CC.pdf", STATIC + "a/PPC_PRES_ADM.pdf", STATIC + "a/PPC_EAD_X.pdf"
    EM1, EM2 = STATIC + "e/cc.pdf", STATIC + "e/adm.pdf"

    def setUp(self):
        links = "".join(f'<a href="{u}">x</a>' for u in (self.PPC1, self.PPC2, self.PPC_EAD, self.PPC1))
        self.pages = {
            DOCS: links.encode(),
            self.PPC1: pdf(["PPC"], [self.EM1, "https://example.test/site"]),
            self.PPC2: pdf(["PPC"], [self.EM2]),
            self.EM1: b"%PDF-em1",
            self.EM2: b"%PDF-em2",
        }

    def run_download(self, pages=None, errors=None):
        pages, errors, urls = pages or self.pages, errors or {}, []

        def fake(url, dest, **kw):
            urls.append(url)
            if url in errors:
                raise errors[url]
            dest.seek(0)
            dest.truncate()
            dest.write(pages[url])
            return hashlib.sha256(pages[url]).hexdigest()
        dest = io.BytesIO(b"stale")
        with mock.patch.object(anima.fetch, "download", side_effect=fake):
            digest = anima.download_ementas(DOCS, dest)
        return digest, zipfile.ZipFile(io.BytesIO(dest.getvalue())), urls

    def test_zip_holds_each_linked_ementario_and_only_pres_ppcs_are_fetched(self):
        digest, z, urls = self.run_download()
        self.assertEqual(z.namelist(), ["0.pdf", "1.pdf"])
        self.assertEqual((z.read("0.pdf"), z.read("1.pdf")), (b"%PDF-em1", b"%PDF-em2"))
        self.assertEqual(urls, [DOCS, self.PPC1, self.PPC2, self.EM1, self.EM2])  # no EAD PPC, PPC1 once, no non-pdf link

    def test_the_digest_covers_every_file_in_fetch_order(self):
        digest, *_ = self.run_download()
        expected = hashlib.sha256(hashlib.sha256(self.pages[DOCS]).hexdigest().encode())
        for url in (self.PPC1, self.PPC2, self.EM1, self.EM2):
            expected.update(hashlib.sha256(self.pages[url]).hexdigest().encode())
        self.assertEqual(digest, expected.hexdigest())

    def test_a_changed_ementario_changes_the_digest(self):
        self.assertNotEqual(self.run_download()[0], self.run_download({**self.pages, self.EM2: b"%PDF-em2b"})[0])

    def test_a_ppc_gone_is_skipped_with_its_link_and_the_digest_changes(self):
        for code in (403, 404, 410):
            with self.subTest(code=code):
                digest, z, urls = self.run_download(errors={self.PPC1: urllib.error.HTTPError("u", code, "x", {}, None)})
                self.assertEqual(z.namelist(), ["0.pdf"])
                self.assertEqual(z.read("0.pdf"), b"%PDF-em2")
                self.assertNotIn(self.EM1, urls)
                self.assertNotEqual(digest, self.run_download()[0])

    def test_a_ppc_that_is_not_a_pdf_links_nothing(self):
        digest, z, _ = self.run_download({**self.pages, self.PPC1: b"<html></html>"})
        self.assertEqual(z.namelist(), ["0.pdf"])

    def test_an_ementario_gone_is_skipped(self):
        digest, z, _ = self.run_download(errors={self.EM1: urllib.error.HTTPError("u", 404, "x", {}, None)})
        self.assertEqual(z.namelist(), ["1.pdf"])  # the numbering is the link's, so a dead one leaves a gap
        self.assertEqual(z.read("1.pdf"), b"%PDF-em2")

    def test_an_ementario_answering_500_raises(self):
        with self.assertRaises(urllib.error.HTTPError):
            self.run_download(errors={self.EM1: urllib.error.HTTPError("u", 500, "x", {}, None)})

    def test_a_ppc_answering_500_raises(self):
        with self.assertRaises(urllib.error.HTTPError):
            self.run_download(errors={self.PPC2: urllib.error.HTTPError("u", 500, "x", {}, None)})

    def test_robots_refusing_a_ppc_or_an_ementario_skips_it_and_changes_the_digest(self):
        whole = self.run_download()[0]
        for url in (self.PPC1, self.EM2):
            with self.subTest(url=url):
                digest, z, _ = self.run_download(errors={url: PermissionError("robots")})
                self.assertEqual(z.namelist(), ["0.pdf"])
                self.assertNotEqual(digest, whole)

    def test_every_ppc_dead_gives_an_empty_zip(self):
        gone = urllib.error.HTTPError("u", 404, "x", {}, None)
        digest, z, _ = self.run_download(errors={self.PPC1: gone, self.PPC2: gone})
        self.assertEqual(z.namelist(), [])

    def test_a_page_without_a_pres_ppc_raises(self):
        with self.assertRaisesRegex(ValueError, "no presencial PPC"):
            self.run_download({DOCS: f'<a href="{self.PPC_EAD}">x</a>'.encode()})

    def test_the_documents_page_failing_raises(self):
        with self.assertRaises(urllib.error.HTTPError):
            self.run_download(errors={DOCS: urllib.error.HTTPError("u", 404, "x", {}, None)})


class LoadEmentasLocalDbTest(unittest.TestCase):
    def setUp(self):
        try:
            self.conn = psycopg.connect(LOCAL_DB, connect_timeout=2)
        except psycopg.OperationalError as error:
            self.skipTest(f"local Supabase is not reachable: {error}")
        self.addCleanup(self.conn.close)  # never committed: closing rolls everything back
        run = self.conn.execute
        census = run("insert into sources (adapter, url, label, last_fetched_at) values ('inep_census', 'https://example.test/anima-census', 'c', now()) returning id").fetchone()[0]
        for inep, name in ((203, "São Judas"), (466, "Anhembi Morumbi")):
            run("insert into institutions (inep_code, name, kind, source_id) values (%s, %s, 'private', %s) on conflict (inep_code) do nothing", (inep, name, census))
        for course_inep, ies in ((9990203, 203), (9990466, 466), (9990204, 203)):
            run("""insert into courses (inep_code, institution_id, name, degree, shift, duration_years, city, source_id)
                   select %s, id, 'Ciência da Computação', 'bacharelado', 'noturno', 4, 'São Paulo', %s from institutions where inep_code = %s""",
                (course_inep, census, ies))
        self.source = run("select id from sources where url = %s", (DOCS,)).fetchone()[0]  # registered by the migration
        self.usjt = self.grade("anima_curriculum", 9990203, "https://example.test/usjt-grade")
        self.uam = self.grade("anima_curriculum", 9990466, "https://example.test/uam-grade")
        self.other = self.grade("t_other", 9990204, "https://example.test/other-grade")

    def grade(self, adapter, course_inep, url):
        run = self.conn.execute
        source = run("insert into sources (adapter, url, label) values (%s, %s, 'g') returning id", (adapter, url)).fetchone()[0]
        for subject in ("CÁLCULO  I", "Algoritmos", "Sem Ementa"):
            run("insert into curriculum_subjects (course_id, year, name, source_id) select id, 1, %s, %s from courses where inep_code = %s",
                (subject, source, course_inep))
        return source

    def linked(self, source):
        return dict(self.conn.execute(
            "select s.name, d.name from curriculum_subjects s left join disciplines d on d.id = s.discipline_id where s.source_id = %s", (source,)).fetchall())

    def test_load_stores_disciplines_of_inep_203_and_links_only_its_own_anima_grades(self):
        units = [("Algoritmos", TEXT), ("Cálculo I", TEXT + " Dois.")]
        self.assertEqual(anima.load_ementas(self.conn, self.source, units), 2 + 2)  # two inserted, two linked
        stored = self.conn.execute(
            """select i.inep_code, d.code, d.name, d.topics from disciplines d join institutions i on i.id = d.institution_id
               where d.source_id = %s order by d.code""", (self.source,)).fetchall()
        self.assertEqual(stored, [(203, "algoritmos", "Algoritmos", [TEXT]), (203, "calculo i", "Cálculo I", [TEXT + " Dois."])])
        self.assertEqual(self.linked(self.usjt), {"CÁLCULO  I": "Cálculo I", "Algoritmos": "Algoritmos", "Sem Ementa": None})
        self.assertEqual(set(self.linked(self.uam).values()), {None})  # another institution
        self.assertEqual(set(self.linked(self.other).values()), {None})  # another adapter, same institution

    def test_a_rerun_changes_nothing_and_a_changed_text_is_updated(self):
        units = [("Algoritmos", TEXT)]
        anima.load_ementas(self.conn, self.source, units)
        self.assertEqual(anima.load_ementas(self.conn, self.source, units), 0)
        self.assertEqual(anima.load_ementas(self.conn, self.source, [("Algoritmos", TEXT + " Mais.")]), 1)
        self.assertEqual(self.conn.execute("select topics from disciplines where source_id = %s", (self.source,)).fetchone()[0], [TEXT + " Mais."])

    def test_a_shorter_list_deletes_the_stale_discipline_and_unlinks_its_subject(self):
        anima.load_ementas(self.conn, self.source, [("Algoritmos", TEXT), ("Cálculo I", TEXT)])
        anima.load_ementas(self.conn, self.source, [("Algoritmos", TEXT)])
        self.assertEqual(self.conn.execute("select array_agg(code) from disciplines where source_id = %s", (self.source,)).fetchone()[0], ["algoritmos"])
        self.assertIsNone(self.linked(self.usjt)["CÁLCULO  I"])
        self.assertEqual(self.linked(self.usjt)["Algoritmos"], "Algoritmos")

    def test_another_institutions_same_named_discipline_is_left_alone(self):
        other = self.conn.execute("insert into sources (adapter, url, label) values ('t_other', 'https://example.test/o', 'o') returning id").fetchone()[0]
        self.conn.execute("insert into disciplines (institution_id, code, name, topics, source_id) select id, 'algoritmos', 'Algoritmos', array['x'], %s from institutions where inep_code = 466", (other,))
        anima.load_ementas(self.conn, self.source, [("Algoritmos", TEXT)])
        self.assertEqual(self.conn.execute("select count(*) from disciplines where source_id = %s", (other,)).fetchone()[0], 1)
        self.assertEqual(set(self.linked(self.uam).values()), {None})


class WiringTest(unittest.TestCase):
    def test_ementas_adapter_and_its_registration(self):
        self.assertIs(anima.ementas.download, anima.download_ementas)
        self.assertIs(anima.ementas.parse, anima.parse_ementas)
        self.assertIs(anima.ementas.load, anima.load_ementas)
        self.assertIs(cli.ADAPTERS["anima_ementas"], anima.ementas)

    def test_it_runs_after_the_grades_it_links_to(self):
        order = list(cli.ADAPTERS)
        self.assertLess(order.index("anima_curriculum"), order.index("anima_ementas"))


if __name__ == "__main__":
    unittest.main()
