"""Small-business owners register and edit their own place (docs/API.md section 5).

No accounts in the MVP. Registering returns an `edit_key` once; the owner sends it back
in the `X-Edit-Key` header to read or change the listing. Only its SHA-256 is stored, so
a lost key cannot be recovered (ask the BE owner to reset it). Places imported from the
UST spreadsheet have no key and cannot be changed through this API.
"""
import hashlib
import hmac
import secrets
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header

from app.db import get_conn
from app.errors import ApiError
from app.schemas import MerchantPlace, MerchantPlaceCreated, MerchantPlaceInput

router = APIRouter()

# Columns the owner controls, in MerchantPlaceInput field order.
FIELDS = list(MerchantPlaceInput.model_fields)
RETURN = ", ".join(["place_id", *FIELDS])


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def db_values(body: MerchantPlaceInput) -> list:
    from psycopg.types.json import Jsonb  # lazy, like app/db.py: tests run without libpq

    data = body.model_dump()
    return [Jsonb(data[f]) if f == "opening_hours" else data[f] for f in FIELDS]


def check_key(conn, place_id: str, key: str | None) -> None:
    row = conn.execute("select edit_key_hash from places where place_id = %s", (place_id,)).fetchone()
    if row is None:
        raise ApiError(404, "PLACE_NOT_FOUND", f"No place with id '{place_id}'")
    stored = row["edit_key_hash"]
    if not key or not stored or not hmac.compare_digest(stored, hash_key(key)):
        raise ApiError(401, "INVALID_EDIT_KEY", "The edit key is missing or does not match this place.")


@router.post("/merchant/places", response_model=MerchantPlaceCreated, status_code=201)
def register_place(body: MerchantPlaceInput, conn: Annotated[Any, Depends(get_conn)]) -> dict:
    key = secrets.token_urlsafe(12)
    cols = ", ".join(FIELDS)
    marks = ", ".join(["%s"] * len(FIELDS))
    row = conn.execute(
        f"""insert into places (place_id, {cols}, is_small_business, source, last_checked, edit_key_hash)
            values ('BIZ-' || lpad(nextval('merchant_place_seq')::text, 4, '0'), {marks},
                    true, 'merchant', current_date, %s)
            returning {RETURN}""",
        [*db_values(body), hash_key(key)],
    ).fetchone()
    conn.commit()
    return {**row, "edit_key": key}


@router.get("/merchant/places/{place_id}", response_model=MerchantPlace)
def read_own_place(
    place_id: str,
    conn: Annotated[Any, Depends(get_conn)],
    x_edit_key: Annotated[str | None, Header()] = None,
) -> dict:
    check_key(conn, place_id, x_edit_key)
    return conn.execute(f"select {RETURN} from places where place_id = %s", (place_id,)).fetchone()


@router.put("/merchant/places/{place_id}", response_model=MerchantPlace)
def update_own_place(
    place_id: str,
    body: MerchantPlaceInput,
    conn: Annotated[Any, Depends(get_conn)],
    x_edit_key: Annotated[str | None, Header()] = None,
) -> dict:
    check_key(conn, place_id, x_edit_key)
    sets = ", ".join(f"{f} = %s" for f in FIELDS)
    row = conn.execute(
        f"update places set {sets}, last_checked = current_date where place_id = %s returning {RETURN}",
        [*db_values(body), place_id],
    ).fetchone()
    conn.commit()
    return row
