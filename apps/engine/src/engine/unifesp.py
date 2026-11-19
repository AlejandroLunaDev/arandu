"""Unifesp: each campus's course list and each course's active matriz curricular (UTF-8 HTML).

The matriz links the course's list of curricular units; each first-termo unit offered there has a 'conteúdo
programático' page whose ementa becomes the discipline's one topic, as Mackenzie's are (owner, 2026-11-19).
"""

import base64
import datetime
import hashlib
import html as entities
import io
import json
import re
import tempfile
import zipfile
from types import SimpleNamespace

from engine import curricula, fetch
from engine.html_table import rows

INEP_CODE = 591  # Universidade Federal de São Paulo's CO_IES in the INEP census
BASE = "https://cursos.siiu.unifesp.br"

# The pages name the campus, not its city; five campuses carry their city's name, these two a region's.
CITIES = {"BAIXADA SANTISTA": "Santos", "ZONA LESTE": "São Paulo"}
NAME_SHIFT = re.compile(r"(.+?) - (INTEGRAL|MATUTINO|VESPERTINO|NOTURNO)")
CAMPUS = re.compile(r"<strong>Campus: </strong>([^<]+)</p>")
MATRIX = re.compile(r'<span>\d+ - ([^<]+)</span>\s*<a\s+href="([^"]+)"')
TERM = re.compile(r"<strong>(\d+)&ordm; Termo</strong>")


def parse_courses(doc):
    """Return (active matriz url, course name, shift, city) for every course on one campus's list."""
    html = doc.read().decode("utf-8")
    courses = []
    for row in html.split('<td data-th="Código">')[1:]:
        label = " ".join(entities.unescape(re.search(r'<td data-th="Curso">([^<]+)</td>', row)[1]).split())
        campus = CAMPUS.search(row)
        active = [url for status, url in MATRIX.findall(row) if status.strip() == "ATIVA"]
        if not campus or len(active) != 1:
            continue  # no single active matriz (all phased out or inactive): nothing current to show
        name, shift = (match[1], match[2]) if (match := NAME_SHIFT.fullmatch(label)) else (label, None)
        city = campus[1].strip()
        courses.append((entities.unescape(active[0]), name, shift, CITIES.get(city, city)))
    if not courses:
        raise ValueError("no course with an active matriz found on the campus list")
    return courses


def parse_curriculum(doc):
    """Return (term, None, name, hours, None) for every curricular unit of one matriz, per termo.

    The matriz lists electives beside fixed units and does not mark which is which (its 'Critérios de integralização'
    give only the FIXAS and ELETIVAS hour totals), so is_elective is None.
    shortcut: year is None, as no page says how long a termo lasts; set (term + 1) // 2 once a source confirms
    termos are semesters.
    """
    page = doc.read().decode("utf-8")
    parts = TERM.split(page.split("Critérios de integralização</strong></h5>")[0])
    if "Não há detalhes da estrutura curricular" in page:
        raise ValueError("the matriz publishes no curricular structure ('Não há detalhes da estrutura curricular')")
    if len(parts) == 1 and "<strong>Formação complementar</strong>" in page:
        # ABI entry courses (Guarulhos) publish one pool of units with no termo: nothing says when each is taken.
        raise ValueError("the matriz lists only a 'Formação complementar' pool, with no termo")
    subjects = []
    for term, chunk in zip(parts[1::2], parts[2::2]):
        for row in rows(chunk):
            # Unit rows: Código, Matéria, CH Teórica, CH Prática, CH Total, Extensão, Ações. Hidden prerequisite and
            # equivalence tables nest two-cell rows.
            if len(row) == 7 and row[0][0].isdigit():
                hours = row[4][0]
                if not hours.isdigit():
                    raise ValueError(f"unexpected hours {hours!r} for {row[1][0]}")
                subjects.append((int(term), None, row[1][0], int(hours) or None, None))
    if not subjects:
        raise ValueError("no curricular unit found on the matriz")
    return subjects


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "unifesp_curriculum", INEP_CODE, "Unifesp, matriz curricular", parsed),
)
UNIT_LIST = re.compile(r'href="(' + re.escape(BASE) + r'/graduacao/lista-unidades-curriculares\?[^"]+)"')
OFFER = re.compile(r'data-url="(' + re.escape(BASE) + r'/graduacao/oferta/([^/"]+)/conteudo-programatico)"')
UNIT_NAME = re.compile(r"<strong>Matéria: </strong>(.*?) \(\d+\)</p>")
CARD = r'<strong>{}</strong>\s*</div>\s*<div class="card-body[^"]*">(.*?)</div>\s*</div>\s*</div>'
EMENTA = re.compile(CARD.format("Ementa"), re.S)
CONTENT = re.compile(CARD.format("Conteúdo Programático"), re.S)


def _unit(key):
    """The matéria id an offer url's base64 JSON key names."""
    return json.loads(base64.b64decode(key + "=" * (-len(key) % 4)))["mater_id_mater"]


def download_matriz(url, dest):
    """Zip the matriz page and the conteúdo programático of each unit its course offers in the first termo.

    Offers are listed per school year and semester: this year's first semester, else this year's annual offers
    (semestre 0, as Medicina's), else last year's. The digest covers every page fetched.
    shortcut: São José dos Campos's courses list no first-termo offer under any of these filters, so they get no
    ementas; read their interdisciplinary entry course's list once one is found to hold them.
    """
    dest.seek(0)
    dest.truncate()
    with tempfile.TemporaryFile() as part:
        digest = hashlib.sha256(fetch.download(url, part).encode())
        part.seek(0)
        page = part.read()
        offers = {}
        if listing := UNIT_LIST.search(page.decode("utf-8")):
            year = datetime.date.today().year
            for school_year, semester in ((year, 1), (year, 0), (year - 1, 1), (year - 1, 0)):
                query = f"&filter_anoLetivo={school_year}&filter_semestre={semester}&filter_termo=1"
                digest.update(fetch.download(entities.unescape(listing[1]) + query, part).encode())
                part.seek(0)
                for offer, key in OFFER.findall(part.read().decode("utf-8")):
                    offers.setdefault(_unit(key), offer)  # one page per unit, whatever its class
                if offers:
                    break
        with zipfile.ZipFile(dest, "w") as bundle:
            bundle.writestr("page.html", page)
            for n, offer in enumerate(offers.values()):
                digest.update(fetch.download(offer, part).encode())
                part.seek(0)
                bundle.writestr(f"{n}.html", part.read())
    return digest.hexdigest()


def _card(match):
    """A card's text, one line per line the page breaks.

    The site stores dashes and quotes as '¿', which Portuguese never uses: a spaced or leading one is a dash, a pair
    around words is quotes. shortcut: a lone one between letters (L¿Hôpital, sociedade¿natureza: 4 of 306 units in
    2026) stays as published, since it stands for an apostrophe or a dash; map it once a rule tells them apart.
    """
    if not match:
        return ""
    lines = (" ".join(entities.unescape(re.sub(r"<[^>]+>", " ", line)).split())
             for line in re.split(r"<br\s*/?>", match[1]))
    lines = (re.sub(r"¿([^¿\s][^¿]*?)¿", r"“\1”", re.sub(r"(^| )¿ ", r"\1– ", line)) for line in lines if line)
    return "\n".join(lines)


def parse_page(doc):
    """Return the matriz's subjects and (name, ementa, conteúdo programático or None) for each first-termo unit.

    The conteúdo programático is kept whole, its lines as the page breaks them: it is a list, a plan per class or
    prose depending on the unit, so it is not split into topics here.
    """
    with zipfile.ZipFile(doc) as bundle:
        subjects = parse_curriculum(io.BytesIO(bundle.read("page.html")))
        first = {name for term, _, name, _, _ in subjects if term == 1}
        found = {}
        for item in bundle.namelist():
            if item == "page.html":
                continue
            unit = bundle.read(item).decode("utf-8")
            name = UNIT_NAME.search(unit)
            ementa, content = " ".join(_card(EMENTA.search(unit)).split()), _card(CONTENT.search(unit))
            if name and len(ementa) >= 30 and (name := " ".join(entities.unescape(name[1]).split())) in first:
                found.setdefault(name, set()).add((ementa, content or None))
    # Two texts for one name (two units of that name in the termo) is not certain: the subject keeps none.
    return subjects, sorted((name, *texts.pop()) for name, texts in found.items() if len(texts) == 1)


curriculum = SimpleNamespace(
    download=download_matriz,
    parse=parse_page,
    load=lambda conn, source_id, parsed: curricula.load_described(conn, source_id, parsed, INEP_CODE, BASE),
)
