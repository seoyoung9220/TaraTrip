"""Fill places.description_ko / signature_menu_ko with Korean translations (Workers AI).

The Korean app shows these on the place screen (GET /api/places/{id}?lang=ko); a place
without them shows the English text. Needs DATABASE_URL, CF_ACCOUNT_ID and CF_API_TOKEN
in BE/.env, and BE/db/schema.sql applied first (scripts/apply_schema.py).

Usage (from the repo root):
    BE\\.venv\\Scripts\\python.exe BE\\scripts\\translate_places.py --dry-run   # print, write nothing
    BE\\.venv\\Scripts\\python.exe BE\\scripts\\translate_places.py             # only untranslated places
    BE\\.venv\\Scripts\\python.exe BE\\scripts\\translate_places.py --all       # redo every place

Run it again after importing new places or after owners edit theirs (editing the English
text clears the Korean copy). Review the output; a wrong translation can be fixed by hand
in Supabase and won't be overwritten unless --all is used.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

BE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BE_DIR.parent / "AI"))
from core.explain import EXPLAIN_MODEL  # noqa: E402  (Llama 3.3 70B: better Korean than the 8B model)
from core.parse_query import call_workers_ai, extract_json  # noqa: E402

HANGUL = re.compile(r"[가-힣]")

PROMPT = """Translate a Philippine place listing for a Korean travel app into natural Korean.
Rules:
- "description": friendly, polite Korean in 해요체: every sentence ends with ~요 (e.g. "맛볼 수 있어요",
  "유명한 곳이에요"), never ~습니다/~니다. Same meaning, no added facts. Split long sentences.
- "signature_menu": the dish or product name as Koreans would say it. Use the common Korean word if one
  exists (e.g. "Halo-halo" -> "할로할로"), otherwise write it in Hangul by sound. Keep it short.
- Keep place names, brand names and street names as they are.
- If a field is empty, return an empty string for it.
Answer with JSON only: {"description": "...", "signature_menu": "..."}"""


def translate(row: dict, account: str, token: str) -> dict:
    src = {"name": row["name"], "description": row["description"] or "", "signature_menu": row["signature_menu"] or ""}
    reply = call_workers_ai(
        [{"role": "system", "content": PROMPT}, {"role": "user", "content": json.dumps(src, ensure_ascii=False)}],
        account, token, model=EXPLAIN_MODEL, max_tokens=600,
    )
    out = extract_json(reply)
    result = {}
    for key in ("description", "signature_menu"):
        text = str(out.get(key) or "").strip()
        # Only keep real Korean for fields that have English to translate.
        result[f"{key}_ko"] = text if src[key] and HANGUL.search(text) else None
    return result


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--all", action="store_true", help="retranslate places that already have Korean")
    ap.add_argument("--dry-run", action="store_true", help="print translations, write nothing")
    args = ap.parse_args()

    load_dotenv(BE_DIR / ".env")
    account, token = os.environ.get("CF_ACCOUNT_ID"), os.environ.get("CF_API_TOKEN")
    if not (account and token):
        sys.exit("CF_ACCOUNT_ID / CF_API_TOKEN missing in BE/.env")

    where = "" if args.all else (
        "where (description is not null and description <> '' and description_ko is null)"
        " or (signature_menu is not null and signature_menu <> '' and signature_menu_ko is null)"
    )
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        rows = conn.execute(
            f"select place_id, name, description, signature_menu from places {where} order by place_id"
        ).fetchall()
        print(f"{len(rows)} place(s) to translate")
        done = failed = 0
        for row in rows:
            try:
                ko = translate(row, account, token)
            except Exception as e:  # one bad reply should not stop the rest
                failed += 1
                print(f"  {row['place_id']}: FAILED ({e})")
                continue
            print(f"  {row['place_id']} {row['name']}\n    {ko['signature_menu_ko'] or '-'}\n    {ko['description_ko'] or '-'}")
            if not args.dry_run:
                conn.execute(
                    "update places set description_ko = %s, signature_menu_ko = %s where place_id = %s",
                    (ko["description_ko"], ko["signature_menu_ko"], row["place_id"]),
                )
                conn.commit()
            done += 1
    print(f"{'Would write' if args.dry_run else 'Wrote'} {done}, failed {failed}")


if __name__ == "__main__":
    main()
