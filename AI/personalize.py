"""
TaraTrip AI 2단계: 취향 맞춤 점수 (임베딩) — personalize.js를 그대로 옮김

아이디어
  - 임베딩 모델은 문장을 숫자 배열(벡터)로 바꿔요. 의미가 비슷한 문장일수록 벡터 방향이 비슷해요.
  - 사용자 취향 문장  "Wants to eat local food and street snacks."  → 벡터 A
  - 장소 설명         "Street stall selling halo-halo ... snacks"   → 벡터 B
  - A와 B가 얼마나 같은 방향인지(코사인 유사도)로 "이 사람에게 이 장소가 얼마나 맞는지" 계산

결과: 장소마다 -8 ~ +12 사이의 개인 맞춤 점수
"""
import json
import math
import re

from utils import js_round, post_json

EMBED_MODEL = "@cf/baai/bge-base-en-v1.5"  # 영어 문장용 임베딩 모델 (그래서 preferenceText를 영어로 받음)
MAX_BONUS = 12   # 가장 잘 맞는 장소: +12점
MIN_BONUS = -8   # 가장 안 맞는 장소: -8점


def embed_workers_ai(texts, account_id, api_token, model=EMBED_MODEL):
    """Cloudflare Workers AI 임베딩: 여러 문장을 한 번에 보내고 문장마다 768개짜리 벡터를 받음"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    status, data = post_json(url, {"text": texts}, {"Authorization": f"Bearer {api_token}"})
    if status >= 400 or not data.get("success"):
        raise RuntimeError(f"임베딩 오류 ({status}): {json.dumps(data.get('errors', data), ensure_ascii=False)}")
    return data["result"]["data"]


def embed_mock(texts):
    """MOCK 임베딩: 키가 없을 때 흐름만 확인하는 용도.
    진짜 AI가 아니라 "같은 단어가 많이 겹칠수록 비슷"하게 만드는 단순 흉내예요."""
    DIM = 256
    out = []
    for t in texts:
        v = [0] * DIM
        for w in re.findall(r"[a-z]+", t.lower()):
            if len(w) < 4:  # and, the 같은 짧은 단어 무시
                continue
            h = 0
            for c in w[:5]:  # 앞 5글자로 묶기 (snack/snacks 같게)
                h = (h * 31 + ord(c)) % DIM
            v[h] += 1
        out.append(v)
    return out


def cosine(a, b):
    """코사인 유사도: 두 벡터의 방향이 얼마나 같은지 (1 = 똑같음, 0 = 무관)"""
    dot = na = nb = 0
    for x, y in zip(a, b):
        dot += x * y
        na += x ** 2
        nb += y ** 2
    return dot / math.sqrt(na * nb) if na and nb else 0


def personal_bonus(preference_text, places, embed):
    """
    장소별 개인 맞춤 가산점 계산
    반환: { 장소이름: {"similarity", "fit", "bonus"} }  — 취향 문장이 비어 있으면 None

    참고: 장소 설명 벡터는 장소가 바뀌지 않는 한 똑같아요.
      실제 서비스에선 한 번만 계산해서 DB에 저장해두면 요청마다 사용자 문장 1개만 임베딩하면 돼요.
    """
    if not preference_text or not preference_text.strip():
        return None

    vectors = embed([preference_text] + [f"{p['name']}. {p.get('description') or p['category']}" for p in places])
    user_vec, place_vecs = vectors[0], vectors[1:]
    sims = [cosine(user_vec, v) for v in place_vecs]

    # 유사도를 MIN_BONUS ~ MAX_BONUS로 늘이기: 제일 안 맞는 곳 -8점, 제일 잘 맞는 곳 +12점
    lo, hi = min(sims), max(sims)
    result = {}
    for p, s in zip(places, sims):
        fit = (s - lo) / (hi - lo) if hi > lo else 0.5  # 0(제일 안 맞음) ~ 1(제일 잘 맞음)
        bonus = MIN_BONUS + fit * (MAX_BONUS - MIN_BONUS)
        result[p["name"]] = {"similarity": s, "fit": fit, "bonus": js_round(bonus * 10) / 10}
    return result
