"""Load the UST places spreadsheet into the `places` table (upsert on place_id).

Usage (from the repo root):
    BE\\.venv\\Scripts\\python.exe BE\\scripts\\import_places.py path\\to\\filled.xlsx --dry-run
    BE\\.venv\\Scripts\\python.exe BE\\scripts\\import_places.py path\\to\\filled.xlsx

The sheet must be the 'Places' sheet of docs/data-template/TaraTrip_Places_Template.xlsx.
Every row is checked first; if any row has a problem, nothing is written and the problems
are listed by row and column so they can be sent back to UST. Example rows (place_id
starting with EXAMPLE) and fully empty rows are skipped. Re-running updates existing
place_ids instead of duplicating them; places missing from the sheet are left alone.
"""
import argparse
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook

from make_data_template import CATEGORIES, COLUMNS, DAYS

BE_DIR = Path(__file__).resolve().parents[1]
HOURS_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-4]):[0-5]\d$")
REQUIRED = {key for key, required, *_ in COLUMNS if required}
DB_COLUMNS = [
    "place_id", "name", "category", "is_small_business", "local_score", "lat", "lng",
    "address", "district", "price_min", "price_max", "entry_fee", "signature_menu",
    "signature_price", "cash_only", "avg_stay_minutes", "opening_hours", "tags",
    "description", "photos", "contact", "source", "last_checked",
]


class RowError(Exception):
    pass


def text(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def to_int(v, key, lo=0, hi=100_000):
    if v is None or text(v) is None:
        return None
    try:
        f = float(str(v).replace(",", "").strip())
    except ValueError:
        raise RowError(f"{key}: '{v}' is not a number")
    if f != int(f):
        raise RowError(f"{key}: {v} must be a whole number")
    if not lo <= f <= hi:
        raise RowError(f"{key}: {v} must be between {lo} and {hi}")
    return int(f)


def to_float(v, key, lo, hi):
    try:
        f = float(str(v).strip())
    except ValueError:
        raise RowError(f"{key}: '{v}' is not a number")
    if not lo <= f <= hi:
        raise RowError(f"{key}: {v} is outside {lo}..{hi} (lat/lng swapped?)")
    return f


def to_bool(v, key):
    s = (text(v) or "").lower()
    if s in ("yes", "y", "true", "1"):
        return True
    if s in ("no", "n", "false", "0"):
        return False
    raise RowError(f"{key}: '{v}' must be Yes or No")


def to_date(v, key):
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v).strip())
    except ValueError:
        raise RowError(f"{key}: '{v}' must be a date YYYY-MM-DD")


def to_list(v):
    return [p.strip() for p in (text(v) or "").split(",") if p.strip()]


def hours(v, key):
    if isinstance(v, datetime):  # Excel sometimes turns "08:00" into a time; we need a range
        raise RowError(f"{key}: '{v}' must be HH:MM-HH:MM or closed")
    s = (text(v) or "").replace(" ", "").replace("–", "-")
    if s.lower() == "closed":
        return "closed"
    if not HOURS_RE.match(s):
        raise RowError(f"{key}: '{v}' must be HH:MM-HH:MM (e.g. 08:00-20:00) or closed")
    return s


def category(v, key):
    s = (text(v) or "").lower()
    if s not in CATEGORIES:
        raise RowError(f"{key}: '{v}' must be one of {', '.join(CATEGORIES)}")
    return s


def convert(raw: dict) -> dict:
    """One sheet row (header -> cell value) to DB values.

    Raises RowError listing every problem in the row, so UST can fix a row in one pass.
    """
    problems = [f"{k}: required" for k in raw if k in REQUIRED and text(raw[k]) is None]
    row = {}

    def field(key, fn=None, *args, src=None):
        v = raw.get(src or key)
        row[key] = None
        if text(v) is None:  # empty: required ones are already reported above
            return
        try:
            row[key] = fn(v, src or key, *args) if fn else text(v)
        except RowError as e:
            problems.append(str(e))

    for key in ("place_id", "name", "address", "district", "signature_menu",
                "description", "contact", "source"):
        field(key)
    field("category", category)
    field("is_small_business", to_bool)
    field("cash_only", to_bool)
    field("local_score", to_int, 1, 10)
    field("lat", to_float, 14.2, 15.0)  # Metro Manila box, same as the template's validation
    field("lng", to_float, 120.8, 121.3)
    for key in ("price_min", "price_max", "entry_fee", "signature_price"):
        field(key, to_int)
    field("avg_stay_minutes", to_int, 5, 480)
    field("last_checked", to_date)
    for d in DAYS:
        field(d, hours, src=f"hours_{d}")
    row["opening_hours"] = {d: row.pop(d) for d in DAYS}
    row["tags"] = [t.lower() for t in to_list(raw.get("tags"))]
    row["photos"] = to_list(raw.get("photos"))

    lo, hi = row["price_min"], row["price_max"]
    if lo is not None and hi is not None and lo > hi:
        problems.append(f"price_min {lo} is greater than price_max {hi}")
    if problems:
        raise RowError("; ".join(problems))
    return row


def read_sheet(path: Path) -> tuple[list[dict], list[str]]:
    wb = load_workbook(path, data_only=True, read_only=True)
    if "Places" not in wb.sheetnames:
        sys.exit(f"{path}: no 'Places' sheet (sheets: {', '.join(wb.sheetnames)})")
    rows = wb["Places"].iter_rows(values_only=True)
    header = [text(h) for h in next(rows)]
    expected = [c[0] for c in COLUMNS]
    unknown = [h for h in header if h and h not in expected]
    absent = [k for k in expected if k not in header]
    if absent or unknown:
        sys.exit(f"Header mismatch. Missing: {absent or '-'}  Unknown: {unknown or '-'}\n"
                 "Was a column renamed or deleted? Compare with docs/data-template.")

    good, errors, seen = [], [], {}
    for n, values in enumerate(rows, start=2):
        raw = dict(zip(header, values))
        if all(text(v) is None for v in values):
            continue
        pid = text(raw.get("place_id")) or ""
        if pid.upper().startswith("EXAMPLE"):
            continue
        try:
            row = convert(raw)
        except RowError as e:
            errors.append(f"row {n} ({pid or 'no place_id'}): {e}")
            continue
        if pid in seen:
            errors.append(f"row {n} ({pid}): duplicate place_id, also on row {seen[pid]}")
            continue
        seen[pid] = n
        good.append(row)
    return good, errors


def upsert(conn, rows: list[dict]) -> tuple[int, int]:
    """Insert or update every row on `conn`. Returns (new, updated). Caller commits."""
    from psycopg.types.json import Jsonb

    cols = ", ".join(DB_COLUMNS)
    marks = ", ".join(["%s"] * len(DB_COLUMNS))
    updates = ", ".join(f"{c} = excluded.{c}" for c in DB_COLUMNS if c != "place_id")
    sql = (f"insert into places ({cols}) values ({marks}) "
           f"on conflict (place_id) do update set {updates} "
           "returning (xmax = 0) as inserted")
    inserted = 0
    for r in rows:
        values = [Jsonb(r[c]) if c == "opening_hours" else r[c] for c in DB_COLUMNS]
        inserted += conn.execute(sql, values).fetchone()[0]
    return inserted, len(rows) - inserted


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("xlsx", type=Path)
    ap.add_argument("--dry-run", action="store_true", help="check the sheet, write nothing")
    args = ap.parse_args()

    rows, errors = read_sheet(args.xlsx)
    if errors:
        print(f"{len(errors)} problem(s), nothing written:")
        print("\n".join("  " + e for e in errors))
        sys.exit(1)
    if not rows:
        sys.exit("No data rows found (only examples or empty rows).")
    if args.dry_run:
        print(f"OK: {len(rows)} place(s) ready to import. Run again without --dry-run to write.")
        return
    import psycopg
    from dotenv import load_dotenv

    load_dotenv(BE_DIR / ".env")
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:  # one transaction: all or nothing
        inserted, updated = upsert(conn, rows)
    print(f"Imported {len(rows)} place(s): {inserted} new, {updated} updated.")


if __name__ == "__main__":
    main()
