"""MEC's public Power BI behind acessounico.mec.gov.br/busca: SISU and ProUni cut-offs, and each course's campus.

The page embeds the report with a public resource key; the engine sends the same querydata POST the report sends.
"""

import gzip
import json
from urllib.parse import urlsplit

from engine import fetch

API = "https://wabi-brazil-south-d-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true"
RESOURCE_KEY = "663c9f63-1c45-40a3-844e-14e7304e3780"
MODEL_ID = 651913
DATASET_ID = "913cef55-f269-400e-8857-c3317e86adda"
REPORT_ID = "b466ff25-6b43-447b-b015-e54b3542ff3c"
WINDOW = 30000  # rows per query; a fuller result is an error, never a silent cut

# shortcut: only the demo institutions (product doc §7), by CO_IES; widen when the recommendation scope grows.
INSTITUTIONS = {"sisu": [55, 591, 7, 4925], "prouni": [22, 203, 466, 852]}
ENTITIES = {
    "sisu": ("Relatorio Nota de Corte", ["NU_ANO", "NU_EDICAO", "CODIGO_CURSO", "NOME_CAMPUS", "TURNO",
                                         "MOD_CONCORRENCIA", "TIPO_COTA", "TIPO_RENDA", "NOTA_CORTE"]),
    "prouni": ("Dados Painel PROUNI", ["NU_ANO", "NU_EDICAO", "CODIGO_CURSO", "NOME_CAMPUS", "TURNO",
                                       "MOD_CONCORRENCIA", "TIPO_COTA", "TIPO_BOLSA", "NOTA_CORTE"]),
}


def _column(name):
    return {"Column": {"Expression": {"SourceRef": {"Source": "d"}}, "Property": name}}


def _in(name, values):
    literals = [[{"Literal": {"Value": f"{value}L"}}] for value in values]
    return {"Condition": {"In": {"Expressions": [_column(name)], "Values": literals}}}


def query(route, year, term):
    """The querydata body for one route and edition, filtered to INSTITUTIONS."""
    entity, columns = ENTITIES[route]
    select = [dict(_column(name), Name=f"d.{name}") for name in columns]
    where = [_in("CODIGO_IES", INSTITUTIONS[route]), _in("NU_ANO", [year]), _in("NU_EDICAO", [term])]
    command = {"SemanticQueryDataShapeCommand": {
        "Query": {"Version": 2, "From": [{"Name": "d", "Entity": entity, "Type": 0}], "Select": select, "Where": where},
        "Binding": {"Primary": {"Groupings": [{"Projections": list(range(len(columns)))}]},
                    "DataReduction": {"DataVolume": 3, "Primary": {"Window": {"Count": WINDOW}}}, "Version": 1},
    }}
    return {"version": "1.0.0", "cancelQueries": [], "modelId": MODEL_ID,
            "queries": [{"Query": {"Commands": [command]}, "QueryId": "",
                         "ApplicationContext": {"DatasetId": DATASET_ID, "Sources": [{"ReportId": REPORT_ID}]}}]}


def download(url, dest):
    """POST the query named by the source url's fragment ('prouni-2026-1') and keep the route with the answer."""
    route, year, term = urlsplit(url).fragment.split("-")
    digest = fetch.download(API, dest, data=json.dumps(query(route, int(year), int(term))).encode(), headers={
        "Content-Type": "application/json;charset=UTF-8", "X-PowerBI-ResourceKey": RESOURCE_KEY,
        "Origin": "https://app.powerbi.com", "Referer": "https://app.powerbi.com/"})
    dest.seek(0)
    body = dest.read()
    dest.seek(0)
    dest.write(route.encode() + b"\n" + body)  # parse needs the route; the answer does not carry it
    return digest


def _rows(dsr, width):
    """Decode Power BI's compressed DSR rows: R marks values repeated from the previous row, Ø marks nulls."""
    data = dsr["DS"][0]
    dicts = data.get("ValueDicts", {})
    raw = next(value for key, value in data["PH"][0].items() if key.startswith("DM"))
    if "RT" in data or data.get("IC") is False:
        raise ValueError(f"the query returned more than {WINDOW} rows: split it")
    names, previous, rows = [None] * width, [None] * width, []
    for item in raw:
        if "S" in item:
            names = [column.get("DN") for column in item["S"]]
        values = list(item.get("C", []))
        row = []
        for i in range(width):
            if item.get("R", 0) & (1 << i):
                row.append(previous[i])
            elif item.get("Ø", 0) & (1 << i):
                row.append(None)
            else:
                value = values.pop(0)
                row.append(dicts[names[i]][value] if names[i] and isinstance(value, int) else value)
        previous = row
        rows.append(row)
    return rows


def parse(doc):
    """Return (route, course_code, campus, shift, year, term, quota_code, quota_label, scholarship, score) rows.

    Editions code quotas differently (SISU 2020-2023: '', D, PPI with a separate income band; 2024: AC, LB_EP, LI_EP),
    so quota_code keeps the published code, or the modality when it is blank, plus the income band when one is given.
    """
    route, raw = doc.read().split(b"\n", 1)
    route = route.decode()
    dsr = json.loads(gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw)["results"][0]["result"]["data"]["dsr"]
    if "DataShapes" in dsr:  # how querydata reports a refused query
        raise ValueError(f"Power BI refused the query: {dsr['DataShapes']}")
    rows = []
    for year, term, code, campus, shift, modality, quota, extra, score in _rows(dsr, 9):
        quota_code = quota or modality
        if route == "prouni":
            scholarship = extra.lower().removeprefix("bolsa ")  # 'INTEGRAL'; 2024 writes 'BOLSA INTEGRAL'
            if scholarship not in ("integral", "parcial"):
                raise ValueError(f"unknown ProUni scholarship {extra!r}")
            label = " / ".join(part for part in (modality, quota) if part)
        else:
            scholarship, label = None, " / ".join(part for part in (modality, quota, extra) if part)
            if extra and extra != "Não se aplica":
                quota_code = f"{quota_code} | {extra}"
        rows.append((route, int(code), campus, shift.lower() if shift else None, int(year), int(term), quota_code,
                     label, scholarship, score))
    return rows


def load(conn, source_id, rows):
    """Replace the source's staged rows, normalize them, and re-link the curriculum pages that name their units."""
    conn.execute("delete from staging.mec_offers where source_id = %s", (source_id,))
    with conn.cursor() as cur:
        with cur.copy("copy staging.mec_offers (source_id, route, course_code, campus, shift, edition_year,"
                      " edition_term, quota_code, quota_label, scholarship, score) from stdin") as copy:
            for row in rows:
                copy.write_row((source_id, *row))
    changed = conn.execute("select staging.normalize_mec(%s)", (source_id,)).fetchone()[0]
    relinked = conn.execute(
        "select coalesce(sum(staging.normalize_curriculum(source_id)), 0)"
        " from (select distinct source_id from staging.curriculum_courses where units is not null) pages"
    ).fetchone()[0]
    return changed + relinked
