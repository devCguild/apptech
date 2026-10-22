# 산책 스팟 백엔드: GET /api/parks (이슈 #9: 앱 라우터는 app/routers/<앱id>.py)
# 필요한 환경 변수: DATA_GO_KR_KEY (공공데이터포털 "전국도시공원정보표준데이터" 인증키)
#   로컬은 backend/.env, Vercel 은 Settings → Environment Variables
import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlencode
from urllib.request import urlopen

from fastapi import APIRouter, HTTPException

router = APIRouter()

# 공공데이터포털 "전국도시공원정보표준데이터"
PARKS_URL = "https://api.data.go.kr/openapi/tn_pubr_public_cty_park_info_api"
PAGE_SIZE = 1000
KST = timezone(timedelta(hours=9))

# 하루 캐시: {"date": "YYYY-MM-DD", "data": {...}}
_cache = {}


def _service_key():
    """DATA_GO_KR_KEY 를 환경 변수 → backend/.env 순서로 찾는다."""
    value = os.getenv("DATA_GO_KR_KEY")
    if not value:
        env_file = Path(__file__).resolve().parents[2] / ".env"  # backend/app/routers/ → backend/
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                name, _, rest = line.partition("=")
                if name.strip() == "DATA_GO_KR_KEY":
                    value = rest.strip().strip('"').strip("'")
    # 포털의 Encoding 키를 넣어도 두 번 인코딩되지 않게 풀어 둔다
    return unquote(value) if value else None


def _fetch_page(service_key, page):
    query = urlencode(
        {"serviceKey": service_key, "pageNo": page, "numOfRows": PAGE_SIZE, "type": "json"}
    )
    with urlopen(f"{PARKS_URL}?{query}", timeout=15) as response:
        text = response.read().decode("utf-8")
    try:
        data = json.loads(text)
        data = data.get("response", data)  # {"response": {...}} 로 감싸 오기도 한다
        header, body = data["header"], data["body"]
    except (ValueError, KeyError, AttributeError):
        # 키 미등록·미활성화면 JSON 대신 XML 오류가 온다
        raise RuntimeError(f"공공데이터포털 응답 오류: {text[:200]}")
    if header.get("resultCode") != "00":
        raise RuntimeError(f"공공데이터포털 오류: {header.get('resultMsg')}")
    return body


def _items(body):
    # items 가 [..] 일 때도, {"item": [..]} 나 {"item": {..}} 일 때도 목록으로
    items = body.get("items") or []
    if isinstance(items, dict):
        items = items.get("item") or []
    return [items] if isinstance(items, dict) else items


def _to_park(item):
    address = item.get("rdnmadr") or item.get("lnmadr") or ""
    try:
        lat, lng = float(item["latitude"]), float(item["longitude"])
    except (KeyError, TypeError, ValueError):
        return None
    if not address.startswith("서울"):
        return None
    return {"name": item.get("parkNm", ""), "address": address, "lat": lat, "lng": lng}


def fetch_seoul_parks(service_key):
    first = _fetch_page(service_key, 1)
    total = int(first.get("totalCount", 0))
    pages = range(2, (total + PAGE_SIZE - 1) // PAGE_SIZE + 1)
    with ThreadPoolExecutor(max_workers=8) as pool:
        rest = list(pool.map(lambda page: _fetch_page(service_key, page), pages))

    items = [item for body in [first, *rest] for item in _items(body)]
    parks = [park for park in map(_to_park, items) if park]
    reference_dates = [item.get("referenceDate") for item in items if item.get("referenceDate")]
    return {"parks": parks, "referenceDate": max(reference_dates, default=None)}


@router.get("/api/parks")
def seoul_parks():
    today = datetime.now(KST).strftime("%Y-%m-%d")
    if _cache.get("date") == today:
        return _cache["data"]

    service_key = _service_key()
    if not service_key:
        raise HTTPException(status_code=503, detail="DATA_GO_KR_KEY 가 설정되지 않았습니다")
    try:
        data = fetch_seoul_parks(service_key)
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error))

    _cache.update(date=today, data=data)
    return data
