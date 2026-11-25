"""Run one adapter by hand: python -m engine <adapter>. Reads DATABASE_URL (ADR-0003)."""

import os
import sys
import tempfile

import psycopg

from engine import anima, enem_usp, fatec, fetch, fiap, inep_census, mackenzie, mec_powerbi, unifesp, unip, usp

# Run order for 'all': each list adapter comes before the level it registers (<x>_courses before <x>_curriculum).
ADAPTERS = {
    "inep_census": inep_census,
    "mec_powerbi": mec_powerbi,  # names each course's campus, which Ânima's unit matrices link through
    "usp_courses": usp.courses,
    "usp_curriculum": usp.curriculum,
    "usp_discipline": usp.discipline,  # after usp_curriculum: it links to the rows that level loads
    "enem_usp": enem_usp,  # links through the Júpiter pages usp_curriculum registers
    "mackenzie_courses": mackenzie.courses,
    "mackenzie_curriculum": mackenzie.curriculum,
    "fiap_courses": fiap.courses,
    "fiap_curriculum": fiap.curriculum,
    "anima_sitemap": anima.sitemap,
    "anima_course": anima.course,
    "anima_curriculum": anima.curriculum,
    "anima_ementas": anima.ementas,  # after anima_curriculum: it links to the rows that level loads
    "unip_courses": unip.courses,
    "unip_units": unip.units,
    "unip_curriculum": unip.curriculum,
    "unifesp_courses": unifesp.courses,
    "unifesp_curriculum": unifesp.curriculum,
    "fatec_media": fatec.media,
    "fatec_curriculum": fatec.curriculum,
}


def run(conn, name):
    """Fetch every source of one adapter, parse only changed documents, and log the run in scrape_runs."""
    adapter = ADAPTERS[name]
    run_id = conn.execute("insert into scrape_runs (adapter) values (%s) returning id", (name,)).fetchone()[0]
    try:
        sources = conn.execute("select id, url, last_content_hash from sources where adapter = %s", (name,)).fetchall()
        if not sources:
            raise LookupError(f"no source registered for adapter {name}")
        written = 0
        failures = []  # one bad page must not stop the other sources; its hash stays, so the next run retries it
        for source_id, url, last_hash in sources:
            try:
                with tempfile.TemporaryFile() as doc:
                    digest = getattr(adapter, "download", fetch.download)(url, doc)
                    parsed = None
                    if digest != last_hash:
                        doc.seek(0)
                        parsed = adapter.parse(doc)
                    with conn.transaction():
                        if parsed is not None:
                            written += adapter.load(conn, source_id, parsed)
                        conn.execute(
                            "update sources set last_fetched_at = now(), last_content_hash = %s where id = %s",
                            (digest, source_id),
                        )
            except Exception as error:
                failures.append(f"{url}: {error}")
        if failures:
            raise RuntimeError(f"{len(failures)} of {len(sources)} sources failed (rows written: {written}):\n"
                               + "\n".join(failures))
        conn.execute(
            "update scrape_runs set status = 'succeeded', finished_at = now(), rows_written = %s where id = %s",
            (written, run_id),
        )
    except Exception as error:
        conn.execute(
            "update scrape_runs set status = 'failed', finished_at = now(), error = %s where id = %s",
            (str(error), run_id),
        )
        raise


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in (*ADAPTERS, "all"):
        sys.exit(f"usage: python -m engine {{all|{'|'.join(ADAPTERS)}}}")
    names = list(ADAPTERS) if sys.argv[1] == "all" else [sys.argv[1]]  # 'all' keeps ADAPTERS order: lists first
    failed = []
    with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as conn:
        for name in names:
            try:
                run(conn, name)
            except Exception as error:  # already logged in scrape_runs; the next adapters still run
                print(f"{name} failed: {error}", file=sys.stderr)
                failed.append(name)
    if failed:
        sys.exit(f"failed adapters: {', '.join(failed)}")


if __name__ == "__main__":
    main()
