"""여러 파일에서 같이 쓰는 작은 도구들"""
import json
import math
import os
import urllib.request
import urllib.error


def js_round(x):
    """JS의 Math.round와 똑같이 반올림 (0.5는 항상 올림).
    파이썬 기본 round()는 2.5 → 2 처럼 짝수 쪽으로 반올림해서 결과가 달라질 수 있어요."""
    return math.floor(x + 0.5)


def to_min(hhmm):
    """"13:30" → 810 (자정부터 몇 분째인지)"""
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def to_hhmm(minutes):
    """810 → "13:30" """
    minutes = int(minutes)
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def fmt_num(x):
    """숫자를 JS처럼 출력 (12.0 → "12", 3.5 → "3.5")"""
    if isinstance(x, float) and x.is_integer():
        return str(int(x))
    return str(x)


def load_env(path):
    """token.env 같은 KEY=VALUE 파일을 읽어서 환경변수로 등록 (python-dotenv 없이)"""
    if not os.path.exists(path):
        return False
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return True


def post_json(url, body, headers, timeout=30):
    """JSON을 POST로 보내고 (상태코드, 응답 JSON)을 돌려줌. 외부 라이브러리 없이 표준 라이브러리만 사용"""
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "TaraTrip/0.1", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {"error": str(e)}
