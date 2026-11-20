"""POST /api/merchant/promo (docs/API.md): the promotion helper for small-business owners.

The owner writes a line or two in their own words (English, Tagalog, Taglish); the LLM turns
that and the form fields into an English description for travelers and a Facebook post.
Nothing is saved. The answer is checked before it is returned: it must be JSON with both
texts, within the length limits, and it may not contain a number the owner did not give
(prices, years, phone numbers). One retry with the problem explained, then 503.
"""
import json
import logging
import os
import re
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from typing import Callable

from fastapi import APIRouter, Request

from app.errors import ApiError
from app.routers.recommendations import AI_TIMEOUT_SECONDS  # also puts AI/ on sys.path
from app.schemas import Promo, PromoRequest

from core.explain import EXPLAIN_MODEL  # noqa: E402  (70B: better writing than the 8B model)
from core.parse_query import call_workers_ai, extract_json  # noqa: E402

log = logging.getLogger(__name__)
router = APIRouter()

MAX_DESCRIPTION = 400
MAX_POST = 600
RATE_LIMIT = 10           # requests per client ...
RATE_WINDOW_SECONDS = 600  # ... in this many seconds
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="promo")
_recent: dict[str, deque] = defaultdict(deque)

CATEGORY_WORDS = {
    "restaurant": "eatery or restaurant",
    "market": "market stall",
    "shop": "shop",
    "attraction": "place to visit",
}

SYSTEM_PROMPT = f"""You write short promotional text for small local businesses in Metro Manila, for TaraTrip, an app that plans budget day trips for tourists.

You get facts about one place and the owner's own notes, which may be in English, Tagalog or Taglish.
Write in simple, warm English that a foreign tourist understands. Keep well-known Filipino food words (adobo, silog, lutong bahay) but explain them briefly if needed.

Rules:
- Use ONLY the facts and notes given. Do not invent awards, history, years, prices, ingredients, opening hours or locations.
- Do not write any number that is not in the facts or notes.
- No emojis in "description". At most 3 emojis in "post".
- "description": 1-3 sentences, at most {MAX_DESCRIPTION} characters, for the place page in the app. Do not start with the place name.
- "post": a Facebook post by the owner inviting tourists, 2-4 short sentences, at most {MAX_POST} characters, ending with 2-4 hashtags. You may mention that travelers can find the place on TaraTrip.

Answer with ONLY this JSON object:
{{"description": "...", "post": "..."}}"""

NUMBER = re.compile(r"\d+")


def llm() -> Callable[[list], str] | None:
    """Workers AI caller, or None when CF_ACCOUNT_ID / CF_API_TOKEN are not set."""
    acc, tok = os.environ.get("CF_ACCOUNT_ID"), os.environ.get("CF_API_TOKEN")
    if not (acc and tok):
        return None
    return lambda messages: call_workers_ai(messages, acc, tok, model=EXPLAIN_MODEL, max_tokens=700)


def facts_text(req: PromoRequest) -> str:
    lines = [f"Name: {req.name}", f"Type: {CATEGORY_WORDS[req.category]}"]
    if req.district:
        lines.append(f"Area: {req.district}")
    if req.signature_menu:
        price = f" (PHP {req.signature_price})" if req.signature_price is not None else ""
        lines.append(f"Best seller: {req.signature_menu}{price}")
    if req.cash_only:
        lines.append("Payment: cash only")
    if req.tags:
        lines.append("Tags: " + ", ".join(req.tags))
    lines.append(f"Owner's notes: {req.notes}")
    return "\n".join(lines)


def clean(text) -> str:
    return " ".join(str(text or "").split()).strip("\"' ")


def problem(answer: dict, facts: str) -> str:
    """Why the answer can't be shown, or '' if it is fine."""
    d, p = answer["description"], answer["post"]
    if not d or not p:
        return 'Both "description" and "post" must be filled in.'
    if len(d) > MAX_DESCRIPTION:
        return f'"description" is {len(d)} characters; keep it under {MAX_DESCRIPTION}.'
    if len(p) > MAX_POST:
        return f'"post" is {len(p)} characters; keep it under {MAX_POST}.'
    allowed = set(NUMBER.findall(facts))
    extra = sorted(set(NUMBER.findall(d + " " + p)) - allowed)
    if extra:
        return f"You wrote numbers that are not in the facts: {', '.join(extra)}. Remove them."
    return ""


def write_promo(req: PromoRequest, call: Callable[[list], str]) -> dict | None:
    facts = facts_text(req)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": facts}]
    for attempt in range(2):
        try:
            raw = call(messages)
            data = extract_json(raw)
            answer = {"description": clean(data.get("description")), "post": clean(data.get("post"))}
        except Exception as e:  # LLM error or no JSON in the answer
            log.warning("promo attempt %d failed: %s", attempt + 1, e)
            continue
        why = problem(answer, facts)
        if not why:
            if "#" not in answer["post"]:
                answer["post"] += " #TaraTrip"
            return answer
        log.warning("promo attempt %d rejected: %s", attempt + 1, why)
        messages += [{"role": "assistant", "content": str(raw)}, {"role": "user", "content": why + " Answer again with only the JSON."}]
    return None


def client_id(request: Request) -> str:
    # Render (and the Vercel /api rewrite) put the real client first in X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "?")


def check_rate(client: str) -> None:
    now = time.monotonic()
    q = _recent[client]
    while q and now - q[0] > RATE_WINDOW_SECONDS:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise ApiError(429, "TOO_MANY_REQUESTS", "Too many requests. Please wait a few minutes and try again.")
    q.append(now)


@router.post("/merchant/promo", response_model=Promo)
def create_promo(body: PromoRequest, request: Request) -> dict:
    call = llm()
    if call is None:
        raise ApiError(503, "AI_UNAVAILABLE", "The writing helper is not available right now.")
    check_rate(client_id(request))
    future = _executor.submit(write_promo, body, call)
    try:
        answer = future.result(timeout=AI_TIMEOUT_SECONDS)
    except FutureTimeout:
        raise ApiError(504, "AI_TIMEOUT", "The writing helper took too long. Please try again.")
    if answer is None:
        raise ApiError(503, "AI_UNAVAILABLE", "The writing helper could not write this one. Please try again or write it yourself.")
    return answer
