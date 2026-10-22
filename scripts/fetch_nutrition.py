"""공공데이터포털 영양성분 표준데이터 3종을 불러서 public/data.js 를 만든다.

키가 필요한 API 라서 브라우저가 아니라 여기(파이썬)서만 부른다 (CLAUDE.md API 화면 규칙).
서비스키는 코드에 넣지 않고, git 에 안 올라가는 키 파일이나 환경변수 DATA_GO_KR_KEY 로만 받는다.

    # 사용법
    # 레포 맨 위에 키 파일을 만들고 DATA_GO_KR_KEY=인증키 한 줄을 적는다 (또는 환경변수 DATA_GO_KR_KEY)
    python scripts/fetch_nutrition.py            # public/data.js 생성
    python scripts/fetch_nutrition.py --sample   # 각 API 응답 첫 줄만 출력 (칸 이름 확인용)

외부 라이브러리 없이 표준 라이브러리만 쓴다.
"""

import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "data.js"
KST = timezone(timedelta(hours=9))

# 🔌 키가 필요한 API 3개. max_rows 는 data.js 가 너무 커지지 않게 받는 최대 줄 수
DATASETS = {
    "food": {
        "name": "전국통합식품영양성분정보(음식)표준데이터",
        "page": "https://www.data.go.kr/data/15100070/standard.do",
        "endpoint": "https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api",
        "max_rows": 20000,  # 전체 약 2만 줄을 다 받는다 (김치찌개 같은 대표 음식이 빠지지 않게)
    },
    "integrated": {
        "name": "전국통합식품영양성분정보표준데이터",
        "page": "https://www.data.go.kr/data/15100064/standard.do",
        "endpoint": "https://api.data.go.kr/openapi/tn_pubr_public_nutri_info_api",
        "max_rows": 3000,
    },
    "supplement": {
        "name": "전국건강기능식품영양성분정보표준데이터",
        "page": "https://www.data.go.kr/data/15155983/standard.do",
        "endpoint": "https://api.data.go.kr/openapi/tn_pubr_public_health_functional_food_nutrition_info_api",
        "max_rows": 1000,
    },
}

# 응답 칸 이름 (2026-10-22 실제 응답으로 확인). 건강기능식품은 기준량·1회 섭취량 칸 이름이 다르다
FIELDS = {
    "name": ["foodNm"],
    "basis": ["nutConSrtrQua", "ntrtIgrdPvsnUnitAmnt"],  # 영양성분함량 기준량 (예: 100g)
    "weight": ["foodSize", "onetmQntWghtVolm"],  # 식품중량 / 1회 섭취량 (예: 817g, 500mg)
    "kcal": ["enerc"],
    "carbG": ["chocdf"],
    "proteinG": ["prot"],
    "fatG": ["fatce"],
}


def fetch_page(endpoint, key, page, rows):
    query = urllib.parse.urlencode({"serviceKey": key, "pageNo": page, "numOfRows": rows, "type": "json"})
    with urllib.request.urlopen(f"{endpoint}?{query}", timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))
    body = data.get("response", data).get("body", {})  # 표준데이터 API 는 맨 바깥이 바로 header·body
    items = body.get("items") or []
    if isinstance(items, dict):  # {"item": [...]} 형태로 오는 API 도 있다
        items = items.get("item") or []
    if isinstance(items, dict):
        items = [items]
    return items, int(body.get("totalCount") or 0)


def pick(raw, field):
    for name in FIELDS[field]:
        if raw.get(name) not in (None, ""):
            return raw[name]
    return None


def number(value):
    m = re.search(r"[\d.]+", str(value or ""))
    return float(m.group()) if m else None


def normalize(raw, kind):
    """API 한 줄 → 화면이 쓰는 형태. 식품중량이 있으면 1인분 값으로 바꾼다"""
    name = pick(raw, "name")
    kcal = number(pick(raw, "kcal"))
    if not name or kcal is None:
        return None
    basis = number(pick(raw, "basis"))
    weight = number(pick(raw, "weight"))
    scale = weight / basis if basis and weight else 1
    serving = f"1인분 {pick(raw, 'weight')}" if scale != 1 else f"{pick(raw, 'basis') or '기준량'} 기준"
    r = lambda v: round((number(v) or 0) * scale, 1)
    return {
        "name": str(name).strip(),
        "kind": kind,
        "serving": serving,
        "kcal": round(kcal * scale, 1),
        "carbG": r(pick(raw, "carbG")),
        "proteinG": r(pick(raw, "proteinG")),
        "fatG": r(pick(raw, "fatG")),
    }


def collect(kind, ds, key):
    foods, page, rows = [], 1, 1000
    while len(foods) < ds["max_rows"]:
        items, total = fetch_page(ds["endpoint"], key, page, rows)
        foods += [f for f in (normalize(it, kind) for it in items) if f]
        if not items or page * rows >= total:
            break
        page += 1
    return foods[: ds["max_rows"]]


def read_key_file(name="DATA_GO_KR_KEY"):
    """레포 맨 위 키 파일(.gitignore 에 들어 있어 올라가지 않음)에서 이름=값 한 줄을 읽는다"""
    path = OUT.parent.parent / ".env"
    try:
        for line in path.read_bytes().decode("utf-8-sig", errors="replace").splitlines():  # 메모장 한글 주석이 다른 인코딩이어도 읽히게
            key_name, _, value = line.partition("=")
            if key_name.strip() == name:
                return value.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return None


def key_for(kind, common):
    """API 마다 키가 따로면 DATA_GO_KR_KEY_FOOD 처럼 적고, 없으면 공통 키를 쓴다"""
    name = f"DATA_GO_KR_KEY_{kind.upper()}"
    return os.environ.get(name) or read_key_file(name) or common


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # 윈도우 터미널에서 한글이 깨지지 않게
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", action="store_true", help="각 API 응답 첫 줄만 출력")
    args = parser.parse_args()

    common = os.environ.get("DATA_GO_KR_KEY") or read_key_file()
    keys = {kind: key_for(kind, common) for kind in DATASETS}
    if not all(keys.values()):
        sys.exit("인증키가 없어요. 키 파일에 DATA_GO_KR_KEY=인증키 한 줄을 적어 주세요.")

    if args.sample:
        for kind, ds in DATASETS.items():
            print(f"== {kind} ({ds['name']})")
            try:
                items, total = fetch_page(ds["endpoint"], keys[kind], 1, 1)
                print(f"totalCount={total}")
                print(json.dumps(items[:1], ensure_ascii=False, indent=2))
            except Exception as e:  # 오류 문구에 키가 섞이지 않게 종류와 메시지만
                print(f"실패 - {type(e).__name__}: {getattr(e, 'reason', e)}")
        return

    foods, sources = [], {}
    for kind, ds in DATASETS.items():
        try:
            got = collect(kind, ds, keys[kind])
            print(f"{kind}: {len(got)}개")
        except Exception as e:  # 하나가 실패해도 나머지는 만든다
            got = []
            print(f"{kind}: 실패 - {e}")
        foods += got
        sources[kind] = {"name": ds["name"], "page": ds["page"], "endpoint": ds["endpoint"], "count": len(got)}

    data = {
        "baseDate": datetime.now(KST).strftime("%Y-%m-%d"),
        "sources": sources,
        "foods": foods,
    }
    OUT.write_text(
        "// 🔌 scripts/fetch_nutrition.py 가 만든 파일. 직접 고치지 말고 스크립트를 다시 돌린다\n"
        f"window.NUTRITION_DATA = {json.dumps(data, ensure_ascii=False)};\n",
        encoding="utf-8",
    )
    print(f"저장: {OUT} (총 {len(foods)}개, 기준 날짜 {data['baseDate']})")


if __name__ == "__main__":
    main()
