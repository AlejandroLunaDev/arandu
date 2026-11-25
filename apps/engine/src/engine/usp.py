"""USP JupiterWeb: each unit's course list, each course's grade curricular, and chosen subjects' pages (ISO-8859-1 HTML)."""

import html as entities
import re
from types import SimpleNamespace
from urllib.parse import urljoin

from engine import curricula
from engine.html_table import rows

BASE = "https://uspdigital.usp.br/jupiterweb/"
INEP_CODE = 55  # USP's CO_IES in the INEP census
ENCODING = "iso-8859-1"  # declared by every JupiterWeb page
# Grades listed under the bare course name while the census has a bacharelado and a licenciatura of that name: the
# grade page itself states the degree ("título de Bacharel/Bacharela em Enfermagem", read 2026-11-18).
# shortcut: one entry by hand; add a page here only when its own text names the degree.
STATED_DEGREE = {"listarGradeCurricular?codcg=7&codcur=7012&codhab=0&tipo=N": "Bacharelado"}


def parse_courses(doc):
    """Return (grade url, course name, shift, city) for every course on one unit's list page."""
    city = None
    courses = []
    for row in rows(doc.read().decode(ENCODING)):
        first = row[0][0] if row else ""
        if first.startswith("Campus:"):
            city = first.removeprefix("Campus:").split(" - ")[0].strip()  # 'São Paulo - Cidade Universitária ...'
        elif row and row[0][1] and "listarGradeCurricular" in row[0][1]:
            if "tipo=N" not in row[0][1]:
                continue  # other grade types ('Percurso Formativo', tipo=V) publish no subjects
            if city is None:
                raise ValueError(f"course {first!r} is listed before any campus")
            # Some units list the codes 'codcur codhab' first, then the name, e.g. 'Habilitação: Engenharia Civil'.
            cells = row[1:] if re.fullmatch(r"\d+ \d+", first) else row
            name = cells[0][0].removeprefix("Habilitação: ")
            if degree := STATED_DEGREE.get(row[0][1]):
                name = f"{degree} em {name}"
            courses.append((urljoin(BASE, row[0][1]), name, cells[1][0] if len(cells) > 1 else None, city))
    if not courses:
        raise ValueError("no course found on the course list")
    return courses


def parse_curriculum(doc):
    """Return (term, year, name, hours, is_elective) for every subject on one grade curricular page."""
    section = term = None
    subjects = []
    for row in rows(doc.read().decode(ENCODING)):
        first = row[0][0] if row else ""
        if len(row) == 1 and first.startswith("Disciplinas "):
            section = first  # 'Disciplinas Obrigatórias', 'Disciplinas Optativas Eletivas', ...
        elif match := re.fullmatch(r"(\d+)º Período Ideal", first):
            term = int(match[1])
        # A subject row opens with its code, linked to its page; a note that links a subject mid-text is not one (5065).
        elif row and row[0][1] and f"obterDisciplina?sgldis={first}&" in row[0][1]:
            if section is None or term is None or len(row) < 5:
                raise ValueError(f"subject row outside a section and term: {row}")
            hours = row[4][0]  # CH, the subject's total hours
            if hours and not hours.isdigit():
                raise ValueError(f"unexpected hours {hours!r} for {row[1][0]}")
            subjects.append((term, (term + 1) // 2, row[1][0], int(hours) if hours and int(hours) > 0 else None,
                             section != "Disciplinas Obrigatórias"))
    if not subjects:
        raise ValueError("no subject found on the grade curricular")
    return subjects


DISCIPLINE = re.compile(r"Disciplina:\s*([A-Z0-9]+)\s*-\s*([^<]+)<")
SECTION = r"<b>\s*{}\s*</b>(?:(?!<b>).)*?<pre>(.*?)</pre>"  # a heading's own preformatted block, before the next heading
COURSE = re.compile(r"codcur=(\d+)&codhab=(\d+)")
# Group labels ('Bibliografia Básica:', 'Livros texto:', 'Livro(s) Texto(s):') carry no period or comma, unlike a title.
LABEL = re.compile(r"(?i)^(?:bibliografia|livros?|livro\(s\))\b[^.,]*$|^\(ver\b")


def _lines(block):
    lines = [line for raw in re.split(r"(?i)<br\s*/?>", block)
             if (line := " ".join(entities.unescape(re.sub(r"<[^>]+>", " ", raw)).split()))]
    # Some pages repeat a line (CRP0466 back to back, 2000101 in a priority list): keep the first (owner, 2026-11-18).
    return list(dict.fromkeys(lines))


def parse_discipline(doc):
    """Return (code, name, topics, bibliography): the Conteúdo Programático and Bibliografia, one line per element in
    the page's order, or None when the page publishes none. Objetivos are not kept (owner, 2026-11-18)."""
    html = doc.read().decode(ENCODING)
    heading = DISCIPLINE.search(html)
    if not heading:
        raise ValueError("no 'Disciplina: CODE - name' heading on the subject page")
    sections = [re.search(SECTION.format(title), html, re.S) for title in ("Conteúdo Programático", "Bibliografia")]
    topics, titles = (_lines(match[1]) if match else [] for match in sections)
    cut = next((i for i, line in enumerate(topics) if LABEL.match(line)), len(topics))
    topics = topics[:cut]  # some pages write their bibliography inside the Conteúdo Programático
    if len(topics) == 1:  # a programa written as one line ('1 - História; 2 - Noções; ...') is its items
        topics = curricula.split_topics(topics[0])
    titles = [t for t in titles if not LABEL.match(t)]
    return heading[1], " ".join(entities.unescape(heading[2]).split()), topics or None, titles or None


def load_discipline(conn, source_id, parsed):
    """Store the subject and link it to the rows of that name in the one course whose grade page this url came from."""
    code, name, topics, bibliography = parsed
    url = conn.execute("select url from sources where id = %s", (source_id,)).fetchone()[0]
    course = COURSE.search(url)
    if not course:
        raise ValueError(f"no codcur and codhab in {url}")
    written = conn.execute(
        """insert into public.disciplines (institution_id, code, name, topics, bibliography, source_id)
           select id, %s, %s, %s, %s, %s from public.institutions where inep_code = %s
           on conflict (institution_id, code) do update
             set name = excluded.name, topics = excluded.topics, bibliography = excluded.bibliography,
               source_id = excluded.source_id
             where (disciplines.name, disciplines.topics, disciplines.bibliography, disciplines.source_id)
               is distinct from (excluded.name, excluded.topics, excluded.bibliography, excluded.source_id)""",
        (code, name, topics, bibliography, source_id, INEP_CODE)).rowcount
    grade = f"%codcur={course[1]}&codhab={course[2]}&%"
    linked = conn.execute(
        "select coalesce(sum(staging.link_disciplines(id)), 0) from public.sources"
        " where adapter = 'usp_curriculum' and url like %s", (grade,)).fetchone()[0]
    if not conn.execute(
            """select exists (select 1 from public.curriculum_subjects s
                 join public.sources g on g.id = s.source_id join public.disciplines d on d.id = s.discipline_id
                 join public.institutions i on i.id = d.institution_id
               where g.adapter = 'usp_curriculum' and g.url like %s and i.inep_code = %s and d.code = %s)""",
            (grade, INEP_CODE, code)).fetchone()[0]:
        raise ValueError(f"{code} {name!r} matches no subject of the grade codcur={course[1]} codhab={course[2]}")
    return written + linked


courses = SimpleNamespace(
    parse=parse_courses,
    load=lambda conn, source_id, parsed: curricula.load_courses(
        conn, "usp_curriculum", INEP_CODE, "USP JupiterWeb, grade curricular", parsed),
)
curriculum = SimpleNamespace(parse=parse_curriculum, load=curricula.load_subjects)
discipline = SimpleNamespace(parse=parse_discipline, load=load_discipline)
