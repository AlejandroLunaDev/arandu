"""Run one adapter by hand: python -m engine <adapter>. Reads DATABASE_URL (ADR-0003)."""

import os
import sys
import tempfile

import psycopg

from engine import fetch, inep_census

ADAPTERS = {"inep_census": inep_census}


def run(conn, name):
    """Fetch every source of one adapter, parse only changed documents, and log the run in scrape_runs."""
    adapter = ADAPTERS[name]
    run_id = conn.execute("insert into scrape_runs (adapter) values (%s) returning id", (name,)).fetchone()[0]
    try:
        sources = conn.execute("select id, url, last_content_hash from sources where adapter = %s", (name,)).fetchall()
        if not sources:
            raise LookupError(f"no source registered for adapter {name}")
        written = 0
        for source_id, url, last_hash in sources:
            with tempfile.TemporaryFile() as doc:
                digest = fetch.download(url, doc)
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
    if len(sys.argv) != 2 or sys.argv[1] not in ADAPTERS:
        sys.exit(f"usage: python -m engine {{{'|'.join(ADAPTERS)}}}")
    with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as conn:
        run(conn, sys.argv[1])


if __name__ == "__main__":
    main()
