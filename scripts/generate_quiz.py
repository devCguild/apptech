"""LLM으로 상식퀴즈 문제 은행(public/quiz-bank.js)을 만든다.

사용: python scripts/generate_quiz.py
설정: 레포 맨 위 .env (레포에 올리지 않음) — 변수 이름은 src/apps/quiz/README.md 참고.
OpenAI 호환 chat/completions 주소면 어디든 쓸 수 있다 (OpenAI, Gemini, OpenRouter).
"""
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "quiz-bank.js"

# 분야 → (프롬프트용 설명, 호출마다 바꿔 중복을 줄이는 세부 주제들)
CATEGORIES = {
    "economy": ("경제 지식. 최근 뉴스에서 언급되는 내용 중 고등학교 2학년이 이해할 만한 것", [
        "물가·금리·환율", "시장·수요와 공급·소비", "금융·저축·투자·세금", "무역·국제경제·일자리"]),
    "society": ("정치·외교 문제와 뉴스 '사회' 카테고리에서 다루는 시사 상식", [
        "정치 제도·선거·법", "외교·국제 관계·안보", "환경·인구·복지·교육·노동"]),
    "history": ("고등학교 2학년 수준의 세계사와 한국사", [
        "한국사 고대~고려", "한국사 조선~근현대", "세계사 고대~중세", "세계사 근현대"]),
    "science": ("물리·화학·생명과학 같은 순수과학과 쉬운 IT·기술", [
        "물리·화학", "생명과학·지구과학", "IT·컴퓨터·인공지능 등 쉬운 기술"]),
    "english": ("문장의 빈칸(____)에 들어갈 알맞은 영단어를 고르는 쉬운 영어 문제", [
        "일상 생활 단어", "학교·사회 관련 단어", "동사·형용사 쓰임"]),
}
PER_CALL = 8


_PREFIX = re.compile(r"^\(?[a-dA-D1-4][.)]\s+")


def clean_choice(text: str) -> str:
    """보기 앞의 'a) ', '1. ' 같은 번호 접두어를 뗀다 (3.5% 나 a lot 은 그대로)."""
    return _PREFIX.sub("", text.strip(), count=1).strip()


def validate_question(q) -> bool:
    try:
        choices = q["choices"]
        return (
            isinstance(q["question"], str) and q["question"].strip() != ""
            and isinstance(choices, list) and len(choices) == 4
            and all(isinstance(c, str) and c.strip() for c in choices)
            and len({clean_choice(c) for c in choices}) == 4
            and isinstance(q["answer"], int) and not isinstance(q["answer"], bool)
            and 0 <= q["answer"] <= 3
            and isinstance(q.get("explanation", ""), str)
        )
    except (KeyError, TypeError):
        return False


def build_bank(raw_by_category: dict, today: str, rng=None) -> dict:
    rng = rng or random.Random()
    items = []
    for category, raws in raw_by_category.items():
        seen = set()
        n = 0
        for q in raws:
            if not validate_question(q) or q["question"].strip() in seen:
                continue
            seen.add(q["question"].strip())
            choices = [clean_choice(c) for c in q["choices"]]
            correct = choices[q["answer"]]
            rng.shuffle(choices)  # 정답 위치가 한쪽으로 쏠리지 않게
            n += 1
            items.append({
                "id": f"{category}-{n}",
                "category": category,
                "question": q["question"].strip(),
                "choices": choices,
                "answer": choices.index(correct),
                "explanation": q.get("explanation", "").strip(),
            })
    return {"generatedAt": today, "items": items}


def load_env():
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def call_llm(prompt: str) -> str:
    """LLM 제공자에 종속된 코드는 여기 한 곳뿐."""
    key = os.environ.get("LLM_API_KEY")
    if not key:
        sys.exit("LLM_API_KEY 가 없어요. .env 를 확인하세요 (src/apps/quiz/README.md 참고).")
    base = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.environ.get("LLM_MODEL", "gpt-4o-mini")
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/chat/completions", data=body, method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            data = json.load(res)
    except urllib.error.HTTPError as e:
        sys.exit(f"LLM 호출 실패 {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
    return data["choices"][0]["message"]["content"]


def make_prompt(desc: str, topic: str) -> str:
    return (
        f"한국 고등학교 2학년 수준의 상식 퀴즈 {PER_CALL}문제를 만들어 주세요.\n"
        f"분야: {desc}\n세부 주제: {topic}\n"
        "조건: 4지선다, 정답은 하나, 사실이 100% 확실한 교과서 수준 내용만(애매하거나 기억이 불확실하면 "
        "다른 문제로 바꿀 것), 보기에 a) 1. 같은 번호·기호를 붙이지 말 것, 보기 4개는 서로 달라야 함, "
        "영어 문제는 빈칸에 들어갈 서로 다른 영단어 4개, 해설은 한 문장.\n"
        'JSON 객체 하나만 출력하세요(설명·코드블록 금지): '
        '{"items":[{"question":"...","choices":["a","b","c","d"],"answer":0,"explanation":"..."}]}'
    )


def parse_items(text: str) -> list:
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0)).get("items", []) if m else []


def make_verify_prompt(items: list) -> str:
    listing = json.dumps(
        [{"i": i, "question": q.get("question"), "choices": q.get("choices"), "answer": q.get("answer")}
         for i, q in enumerate(items)], ensure_ascii=False)
    return (
        "아래는 4지선다 퀴즈입니다(answer 는 정답 보기의 0부터 센 번호). 각 문제를 엄격하게 검토해 "
        "정답이 사실과 다르거나, 정답이 둘 이상이거나, 정답이 없거나, 질문이 모호하면 ok=false, "
        "확실히 맞으면 ok=true 로 하세요.\n" + listing + "\n"
        'JSON 객체 하나만 출력: {"results":[{"i":0,"ok":true}]}'
    )


def parse_verdicts(text: str, n: int):
    """검토 결과를 문제 순서대로 [bool]. 판정이 빠진 문제는 탈락, 해석 불가면 None."""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        results = json.loads(m.group(0)).get("results", [])
        ok = {r["i"]: r["ok"] is True for r in results}
    except (json.JSONDecodeError, KeyError, TypeError, AttributeError):
        return None
    return [ok.get(i, False) for i in range(n)]


def verify_items(items: list) -> list:
    if not items or os.environ.get("LLM_VERIFY", "1") == "0":
        return items
    verdicts = parse_verdicts(call_llm(make_verify_prompt(items)), len(items))
    if verdicts is None:
        print("  (검토 결과를 읽지 못해 이 묶음은 그대로 둠)")
        return items
    kept = [q for q, ok in zip(items, verdicts) if ok]
    print(f"  검토: {len(items)}개 중 {len(kept)}개 통과")
    return kept


def fetch_items(desc: str, topic: str) -> list:
    for attempt in range(2):  # 파싱 실패 시 1회 재시도
        try:
            return verify_items(parse_items(call_llm(make_prompt(desc, topic))))
        except (json.JSONDecodeError, AttributeError):
            time.sleep(1)
    print(f"  (건너뜀: {topic})")
    return []


def main():
    load_env()
    raw = {}
    for category, (desc, topics) in CATEGORIES.items():
        raw[category] = []
        for topic in topics:
            print(f"{category} / {topic}")
            raw[category] += fetch_items(desc, topic)
    kst = timezone(timedelta(hours=9))
    bank = build_bank(raw, datetime.now(kst).strftime("%Y-%m-%d"))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(
        "// 🔌 scripts/generate_quiz.py 가 만든 상식퀴즈 문제 은행. 직접 고치지 말고 스크립트를 다시 돌린다\n"
        "window.QUIZ_BANK = " + json.dumps(bank, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    counts = {c: sum(1 for i in bank["items"] if i["category"] == c) for c in CATEGORIES}
    print("저장:", OUT, counts)


if __name__ == "__main__":
    main()
