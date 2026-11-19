"""Ânima Educação (São Judas, Anhembi Morumbi): sitemap, each course page's Nuxt state, each campus's PDF matrix.

The documents page's presencial PPCs link each course's ementário: its units' ementas become the institution's
disciplines, one topic each, as Mackenzie's are (owner, 2026-11-19).
"""

import hashlib
import io
import json
import re
import tempfile
import unicodedata
import urllib.error
import zipfile
from types import SimpleNamespace
from urllib.parse import urlsplit

import pdfplumber

from engine import curricula, fetch

# Each site's host, its institution's CO_IES in the INEP census and its label.
INSTITUTIONS = {"www.usjt.br": (203, "São Judas"), "portal.anhembi.br": (466, "Anhembi Morumbi")}

COURSE_PAGE = re.compile(r"<loc>\s*(https://([^/<]+)/cursos/graduacao/([a-z0-9-]+)/)\s*</loc>")
CANONICAL = re.compile(r'<link rel="canonical" href="https://([^/"]+)/')
NUXT_DATA = re.compile(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', re.S)
WRAPPERS = {"Reactive", "ShallowReactive", "Ref", "ShallowRef"}
SEMESTERS = re.compile(r"Semestres? (\d+)(?: - (\d+))?")  # 'Semestres 1 - 2', or the last block's 'Semestre 7'


def parse_sitemap(doc):
    """Return the url of every graduação course page on one site's sitemap, transfer variants left out."""
    pages = [(url, host) for url, host, slug in COURSE_PAGE.findall(doc.read().decode("utf-8"))
             if not slug.endswith("-transferencia")]  # the same course, sold to students moving in
    if not pages:
        raise ValueError("no course page found on the sitemap")
    if unknown := {host for _, host in pages} - INSTITUTIONS.keys():
        raise ValueError(f"course pages on unknown hosts {sorted(unknown)}")
    return [url for url, _ in pages]


def load_pages(conn, source_id, urls):
    """Register each course page as a source of anima_course."""
    written = 0
    for url in urls:
        parts = urlsplit(url)
        label = f"{INSTITUTIONS[parts.netloc][1]}, página do curso {parts.path.rstrip('/').rsplit('/', 1)[-1]}"
        written += conn.execute(
            """insert into sources (adapter, url, label) values (%s, %s, %s)
               on conflict (url) do update set label = excluded.label where sources.label is distinct from excluded.label""",
            ("anima_course", url, label),
        ).rowcount
    return written


def _node(data, i):
    """One node of Nuxt's devalue payload, Reactive/Ref wrappers unwrapped; its values are still indexes."""
    while isinstance(data[i], list) and data[i] and data[i][0] in WRAPPERS:
        i = data[i][1]
    return data[i]


def _revive(data, i):
    if i < 0:
        return None  # devalue's undefined, NaN and infinities
    value = _node(data, i)
    if isinstance(value, list):
        # shortcut: Set, Map and Date forms read as None, the course fields used here are none of them
        return None if value and isinstance(value[0], str) else [_revive(data, x) for x in value]
    if isinstance(value, dict):
        return {key: _revive(data, x) for key, x in value.items()}
    return value


def parse_course(doc):
    """Return ((CO_IES, label), [(pdf url, course name, shifts, city, units)]) for the presencial units' own matrices.

    units names the presencial units that matrix serves, so it links to their census courses by MEC campus.
    """
    html = doc.read().decode("utf-8")
    if 'http-equiv="refresh" content="0; url=/404/"' in html:
        raise ValueError("the sitemap lists a page that is gone: it redirects to /404/")
    host = CANONICAL.search(html)
    if not host or host[1] not in INSTITUTIONS:
        raise ValueError(f"unknown canonical host {host and host[1]}")
    data = json.loads(NUXT_DATA.search(html)[1])
    state = _node(data, _node(data, 0)["state"])
    page = _node(data, state["$sbreadcrumb-course"])  # read field by field: coordinators are personal data
    title, degree = _revive(data, page["title"]), _revive(data, page["degree"])
    name = f"{title} - {degree}" if degree in ("Bacharelado", "Licenciatura") else title  # the link rule's form
    units = {}  # presencial unit -> (city, turns), from the offers the page lists per campus
    for campus in _revive(data, page["campus"]):
        for offer in campus["offers"]:
            if offer["modality"] == "Presencial" and (campus["city"] or "").strip():  # no city, no link: skipped
                units.setdefault(offer["unit"]["title"], (campus["city"].strip(), set()))[1].add(offer["turn"] or "")
    matrices = _revive(data, page["curriculums"])
    # A Presencial matrix with no unit is the course's presencial matrix: it serves the presencial units that have
    # none of their own. With two or more such matrices the page does not say which one, so none is used.
    general = [m["curriculum_file"] for m in matrices if m["modality"] == "Presencial" and not m["unit"]]
    own = {m["unit"] for m in matrices if m["modality"] == "Presencial" and m["unit"] in units}
    pairs = [(m["curriculum_file"], m["unit"]) for m in matrices if m["modality"] == "Presencial" and m["unit"] in units]
    if len(general) == 1:
        pairs += [(general[0], unit) for unit in units if unit not in own]
    courses = {}  # (pdf, city) -> (turns, units)
    for pdf, unit in pairs:
        city, turns = units[unit]
        served = courses.setdefault((pdf, city), (set(), set()))
        served[0].update(turns - {""})
        served[1].add(unit)
    # Matrices of units with no presencial offer are left out: the page does not say where they are taught.
    return INSTITUTIONS[host[1]], [(url, name, ", ".join(sorted(turns)) or None, city, sorted(served))
                                   for (url, city), (turns, served) in courses.items()]


def parse_curriculum(doc):
    """Return (term, year, name, hours, None, term_to) for every component of one 'Matriz Curricular' PDF.

    Components come in blocks labeled 'Semestres a - b'; TIPO (U.C., AFP, EXT, UC. EXP., UCDP) names a component
    kind, never mandatory or elective, so is_elective stays None.
    """
    subjects, pending, columns = [], [], None
    with pdfplumber.open(doc) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    cells = [" ".join((cell or "").split()) for cell in row]
                    if "TIPO" in cells:  # a block header; the summary table's has no DENOMINAÇÃO and ends the matrix
                        if pending:
                            raise ValueError(f"components with no 'Semestres' label: {pending}")
                        columns = (cells.index("DENOMINAÇÃO"), cells.index("TOTAL CH")) if "DENOMINAÇÃO" in cells else None
                        continue
                    if columns is None:
                        continue
                    name, total = cells[columns[0]], cells[columns[1]]
                    if name:
                        pending.append((name, int(total) if total.isdigit() and int(total) > 0 else None))
                    if label := SEMESTERS.search(cells[0]):  # the block's label sits in its last row
                        first = int(label[1])
                        last = int(label[2] or first)
                        year = (first + 1) // 2 if (first + 1) // 2 == (last + 1) // 2 else None
                        subjects += [(first, year, name, hours, None, last if last > first else None)
                                     for name, hours in pending]
                        pending = []
    if pending:
        raise ValueError(f"components with no 'Semestres' label: {pending}")
    if not subjects:
        raise ValueError("no component found on the matriz curricular")
    return subjects


PPC_LINK = re.compile(r'href="(https://estaticos\.animaeducacao\.com\.br/[^"]+_PRES_[^"]+\.pdf)"')
GONE = {403, 404, 410}  # a linked PDF that answers these is dead, not down: the run goes on without it
UNIT = re.compile(r"^\s*UNIDADE CURRICULAR\s*:\s*(.*)$")
EMENTA = re.compile(r"^\s*EMENTA\s*:\s*(.*)$")
BIBLIOGRAPHY = re.compile(r"^\s*BIBLIOGRAFIA\b")


def download_ementas(url, dest):
    """Zip the ementários the documents page's presencial PPCs link; the digest covers every file fetched.

    A 2026 PPC links its course's ementário (one PDF of 'UNIDADE CURRICULAR' blocks); older PPCs link none.
    """
    dest.seek(0)
    dest.truncate()
    with tempfile.TemporaryFile() as part:
        digest = hashlib.sha256(fetch.download(url, part).encode())
        part.seek(0)
        ppcs = list(dict.fromkeys(PPC_LINK.findall(part.read().decode("utf-8"))))
        if not ppcs:
            raise ValueError("no presencial PPC found on the documents page")
        ementarios = []
        for ppc in ppcs:
            if _fetch_part(ppc, part, digest) and part.read(4) == b"%PDF":
                part.seek(0)
                with pdfplumber.open(part) as pdf:
                    ementarios += [link["uri"] for page in pdf.pages for link in page.hyperlinks
                                   if (link.get("uri") or "").lower().endswith(".pdf")]
        with zipfile.ZipFile(dest, "w") as bundle:
            for n, ementario in enumerate(dict.fromkeys(ementarios)):
                if _fetch_part(ementario, part, digest):
                    part.seek(0)
                    bundle.writestr(f"{n}.pdf", part.read())
    return digest.hexdigest()


def _fetch_part(url, part, digest):
    """Download url into part and fold it into digest; False for a dead or disallowed link."""
    try:
        digest.update(fetch.download(url, part).encode())
        part.seek(0)
        return True
    except urllib.error.HTTPError as error:
        if error.code not in GONE:
            raise
        digest.update(f"{url} {error.code}".encode())
    except PermissionError:  # robots.txt disallows it
        digest.update(f"{url} disallowed".encode())
    return False


def _name_key(name):
    """staging.name_key's form: accents off, lower case, spaces collapsed."""
    name = "".join(c for c in unicodedata.normalize("NFKD", name) if not unicodedata.combining(c))
    return " ".join(name.lower().split())


def _units(lines):
    """Yield (name, ementa) per block: 'UNIDADE CURRICULAR: name' (may wrap), 'EMENTA: text', then 'BIBLIOGRAFIA'."""
    name = body = None
    for line in lines:
        if unit := UNIT.match(line):
            name, body = unit[1].strip(), None
        elif name is not None and body is None:
            if ementa := EMENTA.match(line):
                body = [ementa[1]] if ementa[1] else []
            else:
                name += " " + line.strip()  # a name wrapped over lines
        elif body is not None:
            if BIBLIOGRAPHY.match(line):
                text = " ".join(" ".join(body).split())
                if len(name) <= 150 and 30 <= len(text) <= 1500:
                    yield name, text
                name = body = None
            else:
                body.append(line)


def parse_ementas(doc):
    """Return (name, ementa) for each unit the ementários describe one way; two texts for one name keep none."""
    found = {}  # name key -> (name as first written, texts)
    with zipfile.ZipFile(doc) as bundle:
        for item in sorted(bundle.namelist()):
            data = bundle.read(item)
            if not data.startswith(b"%PDF"):
                continue  # a link that serves an HTML page instead of its PDF
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                lines = [line for page in pdf.pages for line in (page.extract_text() or "").splitlines() if line.strip()]
            for name, text in _units(lines):
                found.setdefault(_name_key(name), (name, set()))[1].add(text)
    units = sorted((name, texts.pop()) for name, texts in found.values() if len(texts) == 1)
    if not units:
        raise ValueError("no ementa found in the linked ementários")
    return units


def load_ementas(conn, source_id, units):
    """Store each unit as a discipline of the documents page's institution, then link the Ânima grades to them."""
    url = conn.execute("select url from sources where id = %s", (source_id,)).fetchone()[0]
    inep_code = INSTITUTIONS[urlsplit(url).netloc][0]
    codes = [_name_key(name) for name, _ in units]
    written = conn.execute("delete from public.disciplines where source_id = %s and not (code = any(%s))",
                           (source_id, codes)).rowcount
    for code, (name, text) in zip(codes, units):
        written += conn.execute(
            """insert into public.disciplines (institution_id, code, name, topics, source_id)
               select id, %s, %s, %s, %s from public.institutions where inep_code = %s
               on conflict (institution_id, code) do update
                 set name = excluded.name, topics = excluded.topics, source_id = excluded.source_id
                 where (disciplines.name, disciplines.topics, disciplines.source_id)
                   is distinct from (excluded.name, excluded.topics, excluded.source_id)""",
            (code, name, [text], source_id, inep_code)).rowcount
    return written + conn.execute(
        "select coalesce(sum(staging.link_disciplines(id)), 0) from public.sources where adapter = 'anima_curriculum'"
    ).fetchone()[0]


sitemap = SimpleNamespace(parse=parse_sitemap, load=load_pages)
ementas = SimpleNamespace(download=download_ementas, parse=parse_ementas, load=load_ementas)
course = SimpleNamespace(
    parse=parse_course,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "anima_curriculum", parsed[0][0], f"{parsed[0][1]}, matriz curricular", parsed[1]),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
