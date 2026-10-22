import sys
import types

from fastapi import APIRouter

import app.routers as routers_pkg
from app.routers import discover_routers


def test_discover_routers_picks_up_module_router(tmp_path, monkeypatch):
    # routers 폴더에 앱 파일을 하나 둔 것처럼 만든다
    (tmp_path / "sample_app.py").write_text(
        "from fastapi import APIRouter\nrouter = APIRouter(prefix='/api/sample-app')\n"
        "@router.get('/ping')\ndef ping():\n    return {'ok': True}\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(routers_pkg, "__path__", [str(tmp_path)])
    monkeypatch.delitem(sys.modules, "app.routers.sample_app", raising=False)

    found = discover_routers()

    assert [r.prefix for r in found] == ["/api/sample-app"]
    assert all(isinstance(r, APIRouter) for r in found)


def test_existing_api_paths_unchanged():
    from app.main import app

    paths = set(app.openapi()["paths"])
    for path in ["/api/health", "/api/parks", "/api/webcam-quiz/question", "/api/wallet"]:
        assert path in paths
