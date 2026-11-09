"""POST /api/recommendations (docs/API.md section 1).

The route itself comes from the AI module in AI/ (owner: Junwon). This file only
loads places from the DB, calls `recommend()`, and turns its outcomes into API responses.
"""
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.db import get_conn
from app.errors import ApiError
from app.schemas import Recommendation, RecommendationRequest

# AI/ is a sibling of BE/ in the repo. Appended (not prepended) so its top-level
# names (core, data, tests) never shadow BE modules.
AI_DIR = Path(__file__).resolve().parents[3] / "AI"
if str(AI_DIR) not in sys.path:
    sys.path.append(str(AI_DIR))

from core.parse_query import call_workers_ai  # noqa: E402
from core.personalize import embed_workers_ai  # noqa: E402
from recommend import BudgetTooLowError, NoResultsError, recommend  # noqa: E402

log = logging.getLogger(__name__)
router = APIRouter()

# Whole-request limit for the AI step. The AI module never raises on LLM failure
# (it falls back to form values), but each LLM call can take up to 30 s, so the
# backend has to cut it off to answer 504 AI_TIMEOUT.
AI_TIMEOUT_SECONDS = float(os.environ.get("AI_TIMEOUT_SECONDS", "20"))

# Language of `summary`, `reason` and error messages. The FE is Korean-only, so this
# stays "ko" even when free_text is written in English.
RESPONSE_LANG = "ko"

# A timed-out call keeps running in its worker until the LLM request returns;
# the pool size caps how many of those can pile up.
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ai")


def llm_clients() -> dict:
    """Workers AI callbacks if CF_ACCOUNT_ID / CF_API_TOKEN are set in BE/.env.

    Without keys the AI module still recommends from the form fields and
    category tags; free_text is ignored.
    """
    acc, tok = os.environ.get("CF_ACCOUNT_ID"), os.environ.get("CF_API_TOKEN")
    if not (acc and tok):
        return {}
    return {
        "call_llm": lambda messages: call_workers_ai(messages, acc, tok),
        "embed": lambda texts: embed_workers_ai(texts, acc, tok),
    }


@router.post("/recommendations", response_model=Recommendation)
def create_recommendation(
    body: RecommendationRequest, conn: Annotated[Any, Depends(get_conn)]  # psycopg.Connection
) -> dict:
    rows = conn.execute("select * from places").fetchall()
    if not rows:
        raise ApiError(422, "NO_RESULTS", "No places in the database yet.")

    future = _executor.submit(
        recommend,
        body.model_dump(mode="json"),  # docs/API.md request shape (dates as "YYYY-MM-DD")
        rows,
        travel_date=body.travel_date,  # picks that weekday's opening hours
        lang=RESPONSE_LANG,
        **llm_clients(),
    )
    try:
        result = future.result(timeout=AI_TIMEOUT_SECONDS)
    except FutureTimeout:
        raise ApiError(504, "AI_TIMEOUT", "The recommendation took too long. Please try again.")
    except BudgetTooLowError as e:
        raise ApiError(422, "BUDGET_TOO_LOW", str(e))
    except NoResultsError as e:
        raise ApiError(422, "NO_RESULTS", str(e))

    debug = result.pop("_debug", None)
    if debug and debug.get("assumptions"):
        log.info("recommendation %s assumptions: %s", result["route_id"], debug["assumptions"])
    return result
