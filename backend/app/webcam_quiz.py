"""Windy Webcams 나라 맞히기 퀴즈 (담당: CMG).

- 키는 WINDY_API_KEY 환경 변수로만 받는다 (CLAUDE.md 백엔드 규칙, 레포에 올리지 않음).
- 정답은 응답에 평문으로 넣지 않고 서명된 토큰으로 보낸다 (개발자 도구로 정답을 보지 못하게).
"""
import hashlib
import hmac
import json
import os
import random
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/webcam-quiz", tags=["webcam-quiz"])

WINDY_URL = "https://api.windy.com/webcams/api/v3/webcams"  # 🔌
PAGE_SIZE = 50
OPTION_COUNT = 4


def _key() -> str:
    key = os.getenv("WINDY_API_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="WINDY_API_KEY 가 설정되지 않았어요")
    return key


def fetch_webcams(offset: int = 0) -> dict:
    query = urllib.parse.urlencode(
        {"limit": PAGE_SIZE, "offset": offset, "include": "location,images,player"}
    )
    request = urllib.request.Request(
        f"{WINDY_URL}?{query}", headers={"x-windy-api-key": _key()}  # 🔌 API 호출
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.load(response)
    except Exception as error:
        raise HTTPException(status_code=502, detail="Windy API 를 불러오지 못했어요") from error


def sign(country_code: str) -> str:
    return hmac.new(_key().encode(), country_code.encode(), hashlib.sha256).hexdigest()


class Answer(BaseModel):
    token: str
    guess: str


@router.get("/question")
def question():
    # total 을 알아야 무작위 위치를 고를 수 있어서 첫 호출은 가볍게 offset 0
    total = fetch_webcams(0).get("total", 0)
    offset = random.randint(0, max(0, min(total, 1000) - PAGE_SIZE))
    webcams = [
        w
        for w in fetch_webcams(offset).get("webcams", [])
        if w.get("location", {}).get("country_code")
        and w.get("images", {}).get("current", {}).get("preview")
    ]
    if not webcams:
        raise HTTPException(status_code=502, detail="쓸 수 있는 웹캠이 없어요")

    picked = random.choice(webcams)
    names = {w["location"]["country_code"]: w["location"].get("country", "") for w in webcams}
    answer = picked["location"]["country_code"]
    others = [code for code in names if code != answer]
    random.shuffle(others)
    codes = [answer, *others[: OPTION_COUNT - 1]]
    random.shuffle(codes)
    return {
        "image": picked["images"]["current"]["preview"],
        "title": picked.get("title", ""),
        "options": [{"code": code, "name": names[code]} for code in codes],
        "token": sign(answer),
        "source": "Windy Webcams (windy.com)",
    }


@router.post("/answer")
def answer(body: Answer):
    expected = sign(body.guess.upper())
    return {"correct": hmac.compare_digest(expected, body.token)}
