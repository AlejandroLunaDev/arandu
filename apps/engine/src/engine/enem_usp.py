"""ENEM-USP's 'Pontos Finais e Classificações Mínimas' PDFs on fuvest.br: the score of the last candidate called.

Each course block names its 'código USP' (codcur/codhab), the same pair as its Júpiter curriculum page, so a score
links to the census course that page links to.
"""

import re

import pdfplumber

# 2026 writes 'ENEM-USP 2026', 'referentes à 1ª chamada' and 'código USP:'; 2024-2025 write 'ENEM USP 2025', '1ª CHAMADA'
# and 'CODIGO USP:' in capitals, with U+2212 minus signs.
EDITION = re.compile(r"ENEM[- ]USP (\d{4})", re.I)
CALL = re.compile(r"(\d+)ª chamada", re.I)
CODE = re.compile(r"c[óo]digo USP: (\d+)/(\d+)", re.I)
SCORE = re.compile(r"\d{1,4},\d{2}|-")


def parse(doc):
    """Return (codcur, codhab, edition_year, call_number, quota_code, score) for every modality with a called candidate."""
    with pdfplumber.open(doc) as pdf:
        lines = [line.replace("\u2212", "-") for page in pdf.pages for line in (page.extract_text() or "").splitlines()]
    text = "\n".join(lines[:6])
    edition, call = EDITION.search(text), CALL.search(text)
    if not edition or not call:
        raise ValueError("no 'ENEM-USP <year>' title or 'nª chamada' line on the first page")
    rows, modalities, scores = [], None, None
    for line in lines:
        folded = line.lower()
        if " modalidade " in f" {folded} ":
            modalities = line[folded.index("modalidade") + len("modalidade"):].split()
        elif "pontos finais" in folded:
            scores = SCORE.findall(line[folded.index("pontos finais"):])
        if match := CODE.search(line):
            if modalities is None or scores is None or len(scores) != len(modalities):
                raise ValueError(f"código USP {match[1]}/{match[2]}: modalities {modalities} and scores {scores} differ")
            rows += [(int(match[1]), int(match[2]), int(edition[1]), int(call[1]), quota, float(score.replace(",", ".")))
                     for quota, score in zip(modalities, scores) if score != "-"]  # '-': nobody called
            modalities = scores = None
    if not rows:
        raise ValueError("no course block with a código USP found")
    return rows


def load(conn, source_id, rows):
    """Replace the source's staged rows and normalize them into admission_cutoffs; return the rows changed."""
    conn.execute("delete from staging.usp_cutoffs where source_id = %s", (source_id,))
    with conn.cursor() as cur:
        with cur.copy("copy staging.usp_cutoffs (source_id, codcur, codhab, edition_year, call_number, quota_code, score)"
                      " from stdin") as copy:
            for row in rows:
                copy.write_row((source_id, *row))
    return conn.execute("select staging.normalize_usp_cutoffs(%s)", (source_id,)).fetchone()[0]
