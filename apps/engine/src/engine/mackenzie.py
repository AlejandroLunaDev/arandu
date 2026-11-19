"""Mackenzie: the graduação course list and each course's matriz curricular (UTF-8 HTML).

The matriz page links the course's ementas as PDFs, one per etapa or one for the whole course. The first etapa's ementa
of each subject is kept as the discipline's one topic, as FIAP's description is: the book shows it as the subject's
theme (owner, 2026-11-19).
"""

import hashlib
import html as entities
import io
import re
import tempfile
import unicodedata
import urllib.error
import zipfile
from types import SimpleNamespace
from urllib.parse import unquote, urljoin

import pdfplumber

from engine import curricula, fetch
from engine.html_table import rows

BASE = "https://www.mackenzie.br"
INEP_CODE = 22  # Universidade Presbiteriana Mackenzie's CO_IES in the INEP census

# The footer publishes each campus's address: its /universidade/<slug>/ link, then locality ("Bairro, City") and region.
ADDRESS = re.compile(
    r'universidade/([a-z0-9-]+)/".*?itemprop="addressLocality">([^<]+)<.*?itemprop="addressRegion">([^<]+)<', re.S
)
COURSE_LINK = re.compile(r'<a[^>]+href="/graduacao/([a-z0-9-]+)/([a-z0-9-]+)"[^>]*>(.*?)</a>', re.S)


def _text(html):
    return " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", html)).split())


def parse_courses(doc):
    """Return (matriz url, course name, None, city) for every course on a campus whose address is in SP."""
    html = doc.read().decode("utf-8")
    cities = {
        slug: locality.rsplit(",", 1)[-1].strip()
        for slug, locality, region in ADDRESS.findall(html)
        if region.strip() == "SP"
    }
    if not cities:
        raise ValueError("no SP campus address found on the course list")
    # Courses on a campus with no published address (EaD, other states) are left out: their city is unknown.
    courses = {}
    for slug, course, label in COURSE_LINK.findall(html):
        if slug in cities and _text(label):
            courses.setdefault(f"{BASE}/graduacao/{slug}/{course}/matriz-curricular", (_text(label), cities[slug]))
    if not courses:
        raise ValueError("no course found on the course list")
    return [(url, name, None, city) for url, (name, city) in courses.items()]


TAB = re.compile(r'href="#tab-content-([^"]+)"[^>]*>\s*([^<]*?)\s*<')
HEADERS = ("Disciplina", "Componente Curricular")  # the table's header row, not a subject
ACTIVE_TAB = re.compile(r'class="nav-link active" href="#tab-content-([^"]+)"')


def parse_curriculum(doc):
    """Return (term, year, name, None, is_elective) for every subject of the active curriculum, per etapa.

    Version tabs ('Currículo 2026', '2018', '2014 - 2017') each hold their own 'Nª Etapa' tabs; the selected version is
    the active one. A page with one version may have no version tabs. Etapa panes list subjects as table rows or as
    paragraphs, depending on the course.
    """
    html = doc.read().decode("utf-8")
    tabs = [(match.start(), match[1], match[2]) for match in TAB.finditer(html)]
    etapas = {tab: int(match[1]) for _, tab, label in tabs if (match := re.fullmatch(r"(\d+)ª Etapa", label))}
    first_etapa = min((pos for pos, tab, _ in tabs if tab in etapas), default=0)
    # Version tabs come before the first etapa tab; later non-etapa tabs ('Optativas') sit inside a version.
    versions = [tab for pos, tab, _ in tabs if tab not in etapas and pos < first_etapa]
    start, end, suffix = 0, len(html), None
    if versions:
        active = next((tab for tab in ACTIVE_TAB.findall(html) if tab in versions), None)
        if active is None:
            raise ValueError(f"no active curriculum version among {versions}")
        panes = [tab for tab in versions if f'id="tab-content-{tab}"' in html]
        if active not in panes and any(tab.endswith(active) for tab in etapas):
            suffix = active  # no pane wraps this version: its etapa ids end with its id ('1a_etapa350818')
        elif active not in panes:
            # The active tab holds no curriculum ('Disciplinas e Pré-Requisitos'): take the version of the latest year.
            labels = {tab: label for _, tab, label in tabs}
            years = {tab: max(map(int, re.findall(r"\b(?:19|20)\d\d\b", labels[tab])), default=0) for tab in panes}
            if not years or max(years.values()) == 0:
                raise ValueError(f"the active tab {active!r} holds no curriculum and no version names a year")
            active = max(years, key=years.get)
        if suffix is None:
            start = html.index(f'id="tab-content-{active}"')
            end = min([pos for tab in versions if (pos := html.find(f'id="tab-content-{tab}"')) > start] or [end])
    subjects = []
    for tab, term in etapas.items():
        pane_start = html.find(f'id="tab-content-{tab}"')
        if not start <= pane_start < end or (suffix and not tab.endswith(suffix)):
            continue  # an etapa of another version
        stop = html.find('id="tab-content-', pane_start + 1)
        pane = html[pane_start:stop if stop > 0 else None]
        names = [row[0][0] for row in rows(pane) if len(row) == 2 and row[0][0] and row[0][0] not in HEADERS]
        # A paragraph ending in ':' labels what follows ('Período(s) Oferecido(s):'), it is not a subject.
        names = names or [text for p in re.findall(r"<p>(.*?)</p>", pane, re.S)
                          if (text := _text(p)) and not text.endswith(":")]
        # Hours are left out: the page mixes units ('4' per subject, '440' for the internship) and states none.
        subjects += [(term, (term + 1) // 2, name, None, name.upper().startswith(("OPTATIVA", "ELETIVA")))
                     for name in names]
    if not subjects:
        raise ValueError("no subject found on the matriz curricular")
    return subjects


PDF_LINK = re.compile(r'href="([^"]+\.pdf)"', re.I)
GONE = {403, 404, 410}  # a linked PDF that answers these is dead, not down: the page loads without it
FIRST_ETAPA = re.compile(r"(^|[^0-9])0?1(a|ª|º|o)?[_ -]*(etapa|semestre)|etapa[_ -]*0?1([^0-9]|$)", re.I)
NOT_EMENTAS = re.compile(r"biblioteca|codigo|c%c3%b3digo|ebook|regulamento|manual|calendario", re.I)


def ementa_pdfs(html):
    """The PDFs of the first etapa the page links, else its ementário or PPC: they hold the first etapa's ementas."""
    links = [link for href in PDF_LINK.findall(html)
             if not NOT_EMENTAS.search(link := urljoin(BASE + "/", entities.unescape(href)))]
    links = list(dict.fromkeys(links))
    first = [link for link in links if FIRST_ETAPA.search(unquote(link.rsplit("/", 1)[-1]))]
    return first or [link for link in links if re.search(r"ementa|ppc|plano", link, re.I)]


def download_page(url, dest):
    """Bundle the matriz page and its ementa PDFs in one zip; the digest covers every file, so a changed PDF counts."""
    dest.seek(0)
    dest.truncate()
    with tempfile.TemporaryFile() as part:
        digest = hashlib.sha256(fetch.download(url, part).encode())
        part.seek(0)
        page = part.read()
        with zipfile.ZipFile(dest, "w") as bundle:
            bundle.writestr("page.html", page)
            for n, pdf_url in enumerate(ementa_pdfs(page.decode("utf-8"))):
                try:
                    digest.update(fetch.download(pdf_url, part).encode())
                except urllib.error.HTTPError as error:
                    if error.code not in GONE:
                        raise
                    digest.update(f"{pdf_url} {error.code}".encode())
                    continue  # a dead link: its ementas go, the page's subjects still load
                except PermissionError:  # robots.txt disallows it
                    digest.update(f"{pdf_url} disallowed".encode())
                    continue
                part.seek(0)
                bundle.writestr(f"{n}.pdf", part.read())
    return digest.hexdigest()


def _key(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9]", " ", text).split())


EMENTA_LABEL = re.compile(r"^\s*ementa\b\s*:?\s*(.*)$", re.I)
BLOCK_END = re.compile(r"^(objetivo|conteudo|metodologia|bibliografia|criterio|avaliacao|competencia|habilidade|"
                       r"conceitos|procedimentos|referencia|disciplina|codigo|carga horaria|universidade presbiteriana|"
                       r"unidade universitaria|curso)\b")
HEADING_LABEL = re.compile(r"(nome do )?componente curricular|(nome da )?disciplina\b")
TRAILING_HEADING = re.compile(r"\s(?:Objetivos?|Conteúdo Programático|Bibliografia|Metodologia)\b.*$", re.S)


def _named(head, names):
    """The one name the heading holds; a name inside a longer one ('Ética e Cidadania' in '... Cidadania I') yields."""
    found = {name for name in names if name in head}
    found = {name for name in found if not any(name != other and name in other for other in found)}
    return found.pop() if len(found) == 1 else None


def _ementas(lines, names):
    """Yield (name key, ementa) for each ementa whose heading names exactly one of names (spaceless keys).

    A plano de ensino opens with the subject's name, often under a 'Componente Curricular' or 'Disciplina' label,
    then its ementa. The heading is read two ways: the lines just before the label, and the lines from the last
    heading label; each reading must name one subject, and a disagreement shows up as two texts for one name.
    """
    keys = [_key(line) for line in lines]
    previous = 0
    for i, line in enumerate(lines):
        label = EMENTA_LABEL.match(line)
        if not label:
            continue
        # Spaceless: headings wrap a name over lines and space its letters ('A NTROPOLOGIA').
        heads = ["".join(keys[max(previous, i - 10):i]).replace(" ", "")]
        if starts := [j for j in range(previous, i) if HEADING_LABEL.match(keys[j])]:
            heads.append("".join(keys[starts[-1]:min(i, starts[-1] + 4)]).replace(" ", ""))
        body = [label[1]] if label[1] else []
        for key, raw in zip(keys[i + 1:], lines[i + 1:]):
            if BLOCK_END.match(key):
                break
            body.append(raw)
        previous = i + 1
        text = TRAILING_HEADING.sub("", " ".join(" ".join(body).split()))
        named = {name for head in heads if (name := _named(head, names))}
        if len(named) == 1 and 30 <= len(text) <= 1500:  # the two readings name different subjects: neither
            yield named.pop(), text


def parse_page(doc):
    """Return the page's subjects and (name, ementa) for each first-etapa subject its PDFs describe unambiguously."""
    with zipfile.ZipFile(doc) as bundle:
        subjects = parse_curriculum(io.BytesIO(bundle.read("page.html")))
        # Every subject of the page is matched, so a later etapa's heading ('Cálculo II') is never credited to a
        # first-etapa name it contains ('Cálculo I'); only the first etapa's ementas are kept.
        names = {_key(name).replace(" ", ""): name for _, _, name, _, _ in subjects}
        first = {names[_key(name).replace(" ", "")] for term, _, name, _, elective in subjects
                 if term == 1 and not elective}
        found = {}
        for item in sorted(n for n in bundle.namelist() if n.endswith(".pdf")):
            data = bundle.read(item)
            if not data.startswith(b"%PDF"):
                continue  # a link that serves an HTML page instead of its PDF
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                lines = [line for page in pdf.pages for line in (page.extract_text() or "").splitlines() if line.strip()]
            for key, text in _ementas(lines, names):
                if names[key] in first:
                    found.setdefault(names[key], set()).add(text)
    # Two ementas for one name (two curriculum versions, or a misread heading) is not certain: the subject keeps none.
    return subjects, sorted((name, texts.pop()) for name, texts in found.items() if len(texts) == 1)


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "mackenzie_curriculum", INEP_CODE, "Mackenzie, matriz curricular", parsed),
)
curriculum = SimpleNamespace(
    download=download_page,
    parse=parse_page,
    load=lambda conn, source_id, parsed: curricula.load_described(conn, source_id, parsed, INEP_CODE, BASE),
)
