from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_pages_origin():
    response = client.get("/api/health", headers={"Origin": "https://devcguild.github.io"})
    assert response.headers["access-control-allow-origin"] == "https://devcguild.github.io"


def test_cors_blocks_unknown_origin():
    response = client.get("/api/health", headers={"Origin": "https://example.com"})
    assert "access-control-allow-origin" not in response.headers
