"""앱별 라우터 폴더 (이슈 #9).

새 앱 백엔드는 이 폴더에 `<앱id>.py` 를 만들고 `router = APIRouter(prefix="/api/<앱id>")` 를 두면
main.py 를 고치지 않아도 자동으로 붙는다.
"""
import importlib
import pkgutil

from fastapi import APIRouter


def discover_routers() -> list[APIRouter]:
    routers = []
    for module in sorted(pkgutil.iter_modules(__path__), key=lambda m: m.name):
        router = getattr(importlib.import_module(f"{__name__}.{module.name}"), "router", None)
        if isinstance(router, APIRouter):
            routers.append(router)
    return routers
