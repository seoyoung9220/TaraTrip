"""DB connection for request handlers. Reads DATABASE_URL from BE/.env (same as scripts/)."""
import os
from collections.abc import Iterator
from pathlib import Path
from typing import TYPE_CHECKING

from dotenv import load_dotenv

if TYPE_CHECKING:
    import psycopg

BE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BE_DIR / ".env")


def get_conn() -> Iterator["psycopg.Connection"]:
    """FastAPI dependency: one connection per request, rows as dicts.

    psycopg is imported here, not at module load, so the app and tests start
    without the libpq DLL. Tests override this with app.dependency_overrides[get_conn].
    """
    import psycopg
    from psycopg.rows import dict_row

    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        yield conn
