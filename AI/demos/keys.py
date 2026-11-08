"""데모용: Cloudflare 키 읽기

키 파일은 아래 순서로 찾아요 (둘 다 깃허브에 올리면 안 돼요)
  1) AI 폴더의 .env              ← 저장소에서 쓸 때. 저장소 .gitignore가 .env를 막아줌
  2) AI 폴더 한 단계 위의 token.env ← 바탕화면 Taratrip 폴더에서 쓸 때

파일 내용
  CF_ACCOUNT_ID=여기에_계정ID
  CF_API_TOKEN=여기에_API토큰
"""
import os
import sys

from core.utils import load_env

AI_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ENV_PATHS = [os.path.join(AI_DIR, ".env"), os.path.join(AI_DIR, "..", "token.env")]


def get_keys():
    """명령줄에 --real 이 있으면 키 파일을 읽어서 (account_id, api_token) 반환, 아니면 None (= MOCK 모드)"""
    if "--real" not in sys.argv:
        return None
    if not any(load_env(p) for p in ENV_PATHS):
        sys.exit("키 파일을 찾지 못했어요: " + " 또는 ".join(ENV_PATHS))
    acc, tok = os.environ.get("CF_ACCOUNT_ID"), os.environ.get("CF_API_TOKEN")
    if not (acc and tok):
        sys.exit("키 파일에 CF_ACCOUNT_ID, CF_API_TOKEN이 있어야 해요")
    return acc, tok


def user_args():
    """--real 같은 옵션을 뺀 나머지 인자 (사용자가 넣은 문장)"""
    return [a for a in sys.argv[1:] if not a.startswith("--")]
