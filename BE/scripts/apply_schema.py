"""Apply BE/db/schema.sql to the database in BE/.env (DATABASE_URL). Safe to re-run.

Usage (from the repo root):
    BE\\.venv\\Scripts\\python.exe BE\\scripts\\apply_schema.py
"""
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

BE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BE_DIR / ".env")

sql = (BE_DIR / "db" / "schema.sql").read_text(encoding="utf-8")
with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    conn.execute(sql)
    cols = conn.execute(
        "select column_name from information_schema.columns "
        "where table_name = 'places' order by ordinal_position"
    ).fetchall()
print(f"places table ready ({len(cols)} columns): " + ", ".join(c[0] for c in cols))
