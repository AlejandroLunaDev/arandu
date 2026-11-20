"""UFSCar ProGrad: course list, each course's campus pages, and each campus page's matriz curricular PDF (Plone)."""

import html as entities
import io
import re
from types import SimpleNamespace

import pdfplumber
import pypdfium2

from engine import curricula, ocr, vision

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
ORDINAL = re.compile(r"\d{1,2}\s*[°º]")
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
                        if not name or ORDINAL.fullmatch(name):  # '2°' | 'Metodologia científica': the term's mark
                            name = spill
                        elif len(name) == 1 and spill[0].islower():
                            name += spill
                    elif spill and not name and not numbered and wrapped:
                        # The tail of the shifted name just above ('Estágio ... Ginecologia e' | 'Obstetrícia').
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


TRANSCRIBE = """These images are the pages, in order, of one Brazilian university course's matriz curricular.
Transcribe every curricular unit the matriz lists for each semester (also called perfil or período), in page order.
Rules:
- name: exactly as printed, with its capitalization and accents. Join a name wrapped over lines; drop a hyphen that
  only splits a word at a line break. Leave out any subject code printed before the name.
- term: the semester number the unit belongs to.
- elective: true when the matriz marks it optativa or eletiva.
- Leave out totals, subtotals, headers, footnotes, and requisites.
- Never guess: if a character is unreadable, write it as "?".
Answer with JSON only: {"units": [{"term": 1, "name": "...", "elective": false}]}"""
MAX_PAGES = 12  # a longer PDF is a whole PPC: only its matriz pages are read
GAP = 8  # words of other cells a wrapped name's lines may sit apart by


def _read(data):
    """The subjects the layout readers find in the PDF's text layer."""
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        subjects = _matriz_rows(pdf) or _table_rows(pdf)
        chars = sum(len(page.chars) for page in pdf.pages)
    if not subjects and chars < 600:  # a title over a scanned or drawn table
        raise ValueError(f"the matriz is an image with only {chars} characters of text")
    if not subjects:
        raise ValueError("no subject found in the matriz curricular PDF")
    if glued := [name for _, name, *_ in subjects if re.search(r"[a-zà-ú][A-ZÀ-Ú]|[a-zà-ú]\d", name)]:
        raise ValueError(f"names with glued words, the text layer is not spaced: {glued[:3]}")
    return _checked(subjects)


def _spaced(name):
    """A transcribed name with the spaces its PDF dropped ('dasSaúde', 'Térmicas1') put back.

    shortcut: a capital starts a new word only after a lowercase connective or a 5+ letter word, so 'DevOps' and
    'MedBE' stay whole but 'PowerPoint' would split; widen the rule if such a name shows up.
    """
    name = re.sub(r"(?<=[a-zà-ú])(?=\d)", " ", name)
    return re.sub(r"\b([a-zà-ú]{2,}|[A-ZÀ-Ú][a-zà-ú]{4,})(?=[A-ZÀ-Ú][a-zà-ú])", r"\1 ", name)


def _matriz_pages(texts):
    """The pages to transcribe: all of a matriz, or a PPC's pages headed Matriz Curricular and the one after each."""
    if len(texts) <= MAX_PAGES:
        return list(range(len(texts)))
    heads = [i for i, text in enumerate(texts) if re.search(r"(?i)matriz curricular", text[:300]) and "....." not in text]
    pages = sorted({j for i in heads for j in (i, i + 1) if j < len(texts)})
    if not pages or len(pages) > MAX_PAGES:
        raise ValueError(f"a {len(texts)}-page PDF with {len(pages)} matriz pages: none read")
    return pages


TERM_WORD = "(?:semestre|perfil|periodo|termo|etapa)"


def _terms(reading, slips):
    """Where each semester's heading starts in a tokens() reading ('1º Semestre', 'Perfil 2'), in order 1, 2, 3...

    A bare '1º' is not a heading: it also numbers years ('1º ano') and anything else, so it would place by chance.
    """
    starts, at, term = [], 0, 1
    while match := re.compile(rf"\|(?:{(n := str(term).translate(slips))}o?\|{TERM_WORD}|{TERM_WORD}\|{n})\|").search(reading, at):
        starts.append(match.start())
        at, term = match.end() - 1, term + 1
    return starts


def _placed(name, term, reading, slips):
    """The name stands in the reading under its own semester's heading, before the next one's."""
    starts = _terms(reading, slips)
    if term > len(starts):
        return False
    end = starts[term] if term < len(starts) else len(reading)
    return any(starts[term - 1] <= at < end for at in _held(name, reading, slips))


def _held(name, reading, slips):
    """Where the name's words run through the tokens() reading whole, in order, each starting and ending a word.

    Before each word sit at most GAP other words (a wrapped cell's tail is read after the cells beside it), except a
    short last word ('2', 'II', 'B'), which must follow at once so an hours or credits column never stands in for it.
    No separator at all is a text layer that glues words. A word may be split where OCR broke it ('Inform acionais'),
    and a word hyphenated at a line break ('Algorít-') may have its tail up to GAP words later.
    """
    words = [w for w in (ocr.key(w).translate(slips) for w in name.split()) if w]
    if not words:
        return []
    gap = rf"(?:\|(?:[^|]*\|){{0,{GAP}}})?"
    inside = rf"(?:\|?|-\|(?:[^|]*\|){{0,{GAP}}})"
    spell = lambda word: inside.join(map(re.escape, word)) + "-?"  # a word printed with a trailing hyphen
    pattern = r"\|" + spell(words[0])
    for n, word in enumerate(words[1:], 2):
        pattern += (r"\|?" if n == len(words) and len(word) < 4 else gap) + spell(word)
    return [match.start() for match in re.finditer(pattern + r"\|", reading)]


def _transcribed(data):
    """The matriz as a vision model reads its pages, kept only when a second reading confirms every unit.

    The second reading is the PDF's own text layer when it has one, else Tesseract's OCR of the same pages. A unit is
    confirmed when its name's words are words of that reading, exactly (case, accents and punctuation aside) and in
    order (_held), under the heading of the semester the model gave it and before the next one's (_placed). One
    unconfirmed unit fails the whole matriz: a wrong name or semester is worse than a missing grade; a matriz that
    prints no semester headings cannot be confirmed and fails too.
    Hours are not read: the product uses a subject's name and content, never its load (owner, 2026-11-19).
    """
    texts = [page.get_textpage().get_text_range() for page in pypdfium2.PdfDocument(data)]
    pages = _matriz_pages(texts)
    images = ocr.render(data, 150)
    units = vision.read_json(TRANSCRIBE, [images[i] for i in pages])["units"]
    layer = " ".join(texts[i] for i in pages)
    if len(layer.split()) >= 100:
        readings, slips = [ocr.tokens(layer)], {}
    else:  # each OCR pass (resolution and layout mode) over every page, as each misreads some names another reads right
        readings = []
        for dpi in ocr.DPIS:
            passes = [ocr.texts(image) for i, image in enumerate(ocr.render(data, dpi)) if i in pages]
            readings += ["".join(page[mode] for page in passes) for mode in range(len(ocr.MODES))]
        slips = ocr.SLIPS
    subjects, unconfirmed = [], []
    for unit in units:
        name, term = _spaced(" ".join(str(unit.get("name") or "").split())), unit.get("term")
        if term is None and unit.get("elective"):
            continue  # an elective listed apart from the semesters: it belongs to none of them
        if not isinstance(term, int) or term < 1:
            raise ValueError(f"the transcription gave no semester for {name!r}: {unit}")
        if "?" in name or not any(_placed(name, term, reading, slips) for reading in readings):
            unconfirmed.append(f"{name} ({term})")
        subjects.append((term, name, None, bool(unit.get("elective"))))
    if unconfirmed:
        raise ValueError(f"the second reading does not confirm {len(unconfirmed)} units: {unconfirmed[:3]}")
    if not subjects:
        raise ValueError("the transcription found no subject")
    return subjects


def _checked(subjects):
    """(term, year, name, hours, is_elective) rows, once every subject has a semester and the semesters run 1..n."""
    terms = {term for term, *_ in subjects}
    if None in terms or terms != set(range(1, max(terms) + 1)):
        raise ValueError(f"semesters {sorted(terms, key=lambda t: t or 0)} are not 1..n: the layout was not read")
    # A unit printed with 0 hours ('Projeto integrador 1') has its hours elsewhere in the matriz: they stay unknown.
    return [(term, (term + 1) // 2, name, hours or None, elective) for term, name, hours, elective in subjects]


def parse_curriculum(doc):
    """Return (term, year, name, hours, is_elective) for every subject of a matriz PDF.

    UFSCar matrices come in many layouts. The layout readers come first; a matriz they cannot read (an unknown layout,
    an image or outlined text, a text layer pdfminer cannot decode) is transcribed by a vision model and kept only
    when a second reading confirms it. Anything else fails and is listed for review.
    shortcut: a matriz that keeps failing is transcribed again on every run, as its hash only updates on success; cache
    the transcription by digest if those runs grow costly.
    """
    data = doc.read()
    try:
        return _read(data)
    except Exception as layout:  # pdfminer raises AttributeError on some text layers ('PSKeyword' has no 'decode')
        try:
            return _checked(_transcribed(data))
        except Exception as transcription:  # a network or model failure too: the run lists both reasons
            raise ValueError(f"{layout}; transcribed: {transcription}") from transcription


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
