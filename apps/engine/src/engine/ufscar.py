"""UFSCar ProGrad: course list, each course's campus pages, and each campus page's matriz curricular PDF (Plone)."""

import html as entities
import re
from types import SimpleNamespace

import pdfplumber

from engine import curricula

INEP_CODE = 7  # Universidade Federal de São Carlos's CO_IES in the INEP census
COURSES = "https://www.prograd.ufscar.br/pt-br/cursos/cursos-oferecidos/"

COURSE_LINK = re.compile(r'<a[^>]+href="(' + re.escape(COURSES) + r'([a-z0-9-]+)/\2)"[^>]*>(.*?)</a>', re.S)
CAMPUS_LINK = re.compile(r'<p class="campuscurso"><a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S)
HEADING = re.compile(r'<h1 class="documentFirstHeading">(.*?)</h1>', re.S)
FIELD = r"<strong>{}:?\s*</strong>:?\s*(.*?)</li>"
CITIES = {"Lagoa do Sino": "Buri"}  # the census names the campus's city
MATRIZ_LINK = re.compile(r'<a[^>]+href="([^"]+\.pdf)"[^>]*>\s*(?:<strong>)?\s*Matriz Curricular', re.S)
TERM = re.compile(r"(\d+)º Semestre")
KINDS = ("Obrigatório", "Optativo", "Eletivo")  # Caráter; 'Obrigatório (ou TCC)' reads as Obrigatório


def _text(html):
    return " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", html)).split())


def _register(conn, adapter, pages):
    """Register each (url, label) page as a source of adapter; return the rows written."""
    return sum(
        conn.execute(
            """insert into sources (adapter, url, label) values (%s, %s, %s)
               on conflict (url) do update set label = excluded.label where sources.label is distinct from excluded.label""",
            (adapter, url, label),
        ).rowcount
        for url, label in pages
    )


def parse_list(doc):
    """Return (course page url, label) for every course on the ProGrad course list."""
    courses = {url: f"UFSCar, curso: {_text(label)}" for url, _, label in COURSE_LINK.findall(doc.read().decode("utf-8"))}
    if not courses:
        raise ValueError("no course found on the course list")
    return list(courses.items())


def parse_course(doc):
    """Return (campus page url, label) for every campus a course page links.

    A course taught on one campus has no campus links: its page is the campus page, so its matriz is returned as
    parse_campus returns it.
    """
    html = doc.read().decode("utf-8")
    name = _text(HEADING.search(html)[1])
    campuses = [(url, f"UFSCar, campus: {name} - {_text(label)}") for url, label in CAMPUS_LINK.findall(html)]
    if campuses:
        return campuses
    if not re.search(FIELD.format("Campus"), html):
        raise ValueError(f"no campus link and no campus field on the course page of {name!r}")
    return _campus(html)


def parse_campus(doc):
    """Return the (matriz url, course name, shift, city) of one campus page, read from its own fields."""
    return _campus(doc.read().decode("utf-8"))


def _campus(html):
    heading = _text(HEADING.search(html)[1])  # 'Ciência da Computação - São Carlos', or 'Ciências Econômicas'
    name, sep, city = heading.rpartition(" - ")
    if not sep:
        field = re.search(FIELD.format("Campus"), html)
        if not field:
            raise ValueError(f"no campus in the heading {heading!r} nor in a Campus field")
        name, city = heading, _text(field[1])
    city = CITIES.get(city, city)
    kind = re.search(FIELD.format("Tipo"), html)
    if kind and _text(kind[1]) in ("Bacharelado", "Licenciatura"):
        name = f"{name} - {_text(kind[1])}"  # the link rule reads the degree from this suffix
    shift = re.search(FIELD.format("Turno"), html)
    # shortcut: the newest matriz is taken as the last one listed ('A Partir 2019', then 'A Partir de 2026'),
    # check the order if a page lists them otherwise.
    links = MATRIZ_LINK.findall(html)
    if not links:
        raise ValueError(f"no matriz curricular PDF on the campus page of {heading!r}")
    return [(links[-1], name, _text(shift[1]) if shift else None, city)]


def _lines(page):
    """The page's words grouped into lines, top to bottom."""
    lines = []
    for word in sorted(page.extract_words(), key=lambda w: (round(w["top"]), w["x0"])):
        if lines and word["top"] - lines[-1][0]["top"] < 3:
            lines[-1].append(word)
        else:
            lines.append([word])
    return [sorted(line, key=lambda w: w["x0"]) for line in lines]


def _matriz_rows(pdf):
    """Subjects of the São Carlos matriz drawn without ruling: words placed under Disciplina and Requisitos headers."""
    subjects = []
    term = None
    for page in pdf.pages:
        columns = current = None
        for line in _lines(page):
            texts = [w["text"] for w in line]
            text = " ".join(texts)
            if match := TERM.match(text):
                term, current = int(match[1]), None
            elif "Disciplina" in texts and "Requisitos" in texts:
                columns = {w["text"]: w["x0"] - 2 for w in line}  # header x positions of nº, Disciplina, Requisitos
                current = None
            elif columns is None:
                continue
            elif texts[0].isdigit() and line[0]["x0"] < columns["Disciplina"]:
                if term is None:
                    raise ValueError(f"subject row before any semester header: {text!r}")
                name = [w["text"] for w in line if columns["Disciplina"] <= w["x0"] < columns["Requisitos"]]
                kind = next((w["text"] for w in line if w["x0"] >= columns["Requisitos"] and w["text"] in KINDS), None)
                if kind is None:
                    raise ValueError(f"no Caráter in {text!r}")
                hours = texts[-1]  # the Total column is the rightmost
                current = [term, name, int(hours) if hours.isdigit() else None, kind != "Obrigatório", line[0]["top"]]
                subjects.append(current)
            elif current and line[0]["top"] - current[4] < 20:
                # A wrapped cell: its Disciplina words continue the subject's name.
                current[1] += [w["text"] for w in line if columns["Disciplina"] <= w["x0"] < columns["Requisitos"]]
                current[4] = line[0]["top"]
            else:
                current = None
    return [(term, " ".join(name), hours, elective) for term, name, hours, elective, _ in subjects]


NAME_HEAD = re.compile(r"(?i)disciplina|componente|atividade|unidade curricular")
TERM_HEAD = re.compile(r"(?i)^(?:perfil|per[ií]odo|semestre)|^p$")  # 'P' heads the período column
HOURS_HEAD = re.compile(r"(?i)carga|^total|^ch\b|^cht$")
WRAP_END = re.compile(r"\s(?:e|de|da|do|das|dos|em|na|no|a|o|para|com)$")  # a name cut before its last words
NOT_A_SUBJECT = re.compile(r"(?i)^(?:sub-?)?tota|^disciplinas obrigat|^carga[- ]hor|^cr[eé]ditos|^per[ií]odo|^perfi[ls]|^semestre|^[\d\s()h,./°º-]+$")
ORDINALS = "primeiro segundo terceiro quarto quinto sexto setimo oitavo nono decimo".split()


def _term_mark(text):
    """The semester a heading names ('1º Perfil', 'Perfil 1', '2° Período', '3ª Etapa', 'PRIMEIRO PERÍODO'), else None."""
    text = text.strip().lower().translate(str.maketrans("éíó", "eio"))
    if match := (re.match(r"(\d{1,2})\s*[°ºªo]\s*(?:perfil|periodo|semestre|etapa)\b", text)
                 or re.match(r"(?:perfil|periodo|semestre|etapa)\s*(\d{1,2})\b", text)):
        return int(match[1])
    if match := re.match(rf"({'|'.join(ORDINALS)})\s+(?:periodo|semestre|perfil)\b", text):
        return ORDINALS.index(match[1]) + 1
    return None


def _table_rows(pdf):
    """Subjects of the ruled matrices: a header row names the subject, semester and hours columns; a semester is a
    header column or a heading line inside or above the table."""
    subjects, columns, term, wrapped = [], None, None, False
    for page in pdf.pages:
        lines, above_from = page.extract_text_lines(), 0
        for table in sorted(page.find_tables(), key=lambda t: t.bbox[1]):
            for line in lines:
                if above_from <= line["top"] and line["bottom"] <= table.bbox[1] + 1 and (mark := _term_mark(line["text"])):
                    term = mark
            above_from = table.bbox[3]
            for raw in table.extract():
                row = [" ".join((cell or "").split()) for cell in raw]
                filled = {i: cell for i, cell in enumerate(row) if cell}
                if not filled:
                    continue
                # 'Total da disciplina' heads an hours column, not the names
                name_col = next((i for i, c in filled.items()
                                 if NAME_HEAD.search(c) and not HOURS_HEAD.search(c) and len(c) < 45), None)
                if name_col is not None and len(filled) >= 2 and not any(c.isdigit() for c in filled.values()):
                    columns = {
                        "name": name_col,
                        "term": next((i for i, c in filled.items() if TERM_HEAD.match(c)), None),
                        "hours": next((i for i, c in filled.items() if HOURS_HEAD.search(c) and "créd" not in c.lower()),
                                      None),
                        "width": len(row),
                        # A headless column right of the names: some rows' names are shifted into it, or split
                        # across both ('I' | 'ntrodução a Psicologia'), as Fisioterapia's matriz draws them.
                        "spill": name_col + 1 if name_col + 1 < len(row) and not row[name_col + 1] else None,
                    }
                elif len(filled) == 1 and (mark := _term_mark(next(iter(filled.values())))):
                    term = mark
                elif columns and len(row) == columns["width"]:
                    if columns["term"] is not None and (match := re.match(r"(\d{1,2})\s*[°ºª]?", row[columns["term"]])):
                        term = int(match[1])
                    name = row[columns["name"]]
                    spill = row[columns["spill"]] if columns["spill"] is not None else ""
                    numbered = any(cell.isdigit() for cell in row)
                    # Only a subject row (it has credits or hours) is shifted; a wrapped name's tail has no numbers.
                    if spill and not spill.isdigit() and numbered:
                        if not name:
                            name = spill
                        elif len(name) == 1 and spill[0].islower():
                            name += spill
                    elif spill and not name and not numbered and wrapped and (
                            spill.startswith("(") or WRAP_END.search(subjects[-1][1])):
                        # The tail of the shifted name just above ('Estágio ... Ginecologia e' | 'Obstetrícia'); a
                        # name that ends on a full word may be a subject of its own on the next row, so it stays.
                        last = subjects[-1]
                        subjects[-1] = (last[0], f"{last[1]} {spill}", *last[2:])
                        continue
                    wrapped = False
                    # Rows before any semester belong to tables grouped by area, which list the same subjects again.
                    if term is not None and name and not NOT_A_SUBJECT.match(name):
                        hours = row[columns["hours"]] if columns["hours"] is not None else ""
                        elective = bool(re.match(r"(?i)(?:disciplinas? )?(?:optativ|eletiv)", name))
                        subjects.append((term, name, int(hours) if hours.isdigit() else None, elective))
                        wrapped = name == spill  # a shifted name, whose tail may sit in the next row
    return subjects


def parse_curriculum(doc):
    """Return (term, year, name, hours, is_elective) for every subject of a matriz PDF.

    UFSCar matrices come in many layouts, so a PDF is kept only when every subject has a semester, the semesters run
    1..n with no gap, and no name has its words glued together; anything else fails and is listed for review.
    A PDF drawn as vector outlines has no text: it returns no subject and stays empty until OCR is added.
    """
    with pdfplumber.open(doc) as pdf:
        if not any(page.chars for page in pdf.pages):
            return []  # shortcut: outlined PDFs are skipped, add OCR when they are worth the cost
        subjects = _matriz_rows(pdf) or _table_rows(pdf)
        chars = sum(len(page.chars) for page in pdf.pages)
    if not subjects and chars < 600:  # a title over a scanned or drawn table
        raise ValueError(f"the matriz is an image with only {chars} characters of text: it needs OCR")
    if not subjects:
        raise ValueError("no subject found in the matriz curricular PDF")
    terms = {term for term, *_ in subjects}
    if None in terms or terms != set(range(1, max(terms) + 1)):
        raise ValueError(f"semesters {sorted(terms, key=lambda t: t or 0)} are not 1..n: the layout was not read")
    if glued := [name for _, name, *_ in subjects if re.search(r"[a-zà-ú][A-ZÀ-Ú]|[a-zà-ú]\d", name)]:
        raise ValueError(f"names with glued words, the text layer is not spaced: {glued[:3]}")
    return [(term, (term + 1) // 2, name, hours, elective) for term, name, hours, elective in subjects]


courses = SimpleNamespace(parse=parse_list, load=lambda conn, source_id, parsed: _register(conn, "ufscar_course", parsed))
def _load_matriz(conn, source_id, parsed):
    return curricula.load_courses(conn, "ufscar_curriculum", INEP_CODE, "UFSCar, matriz curricular", parsed)


course = SimpleNamespace(
    parse=parse_course,  # campus links (url, label), or a one-campus page's own matriz
    load=lambda conn, source_id, parsed: (
        _register(conn, "ufscar_campus", parsed) if len(parsed[0]) == 2 else _load_matriz(conn, source_id, parsed)),
)
campus = SimpleNamespace(parse=parse_campus, load=_load_matriz)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
