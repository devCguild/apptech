from fastapi.testclient import TestClient

from app.routers import whereami as webcam_quiz
from app.main import app

client = TestClient(app)


def fake_webcams(offset=0):
    return {
        "total": 4,
        "webcams": [
            {
                "title": f"cam {code}",
                "location": {"country_code": code, "country": name},
                "images": {"current": {"preview": f"https://img/{code}.jpg"}},
                "player": {"day": f"https://player/{code}/day"},
            }
            for code, name in [("KR", "Korea"), ("JP", "Japan"), ("FR", "France"), ("IT", "Italy")]
        ],
    }


def test_question_and_answer(monkeypatch):
    monkeypatch.setenv("WINDY_API_KEY", "test-key")
    monkeypatch.setattr(webcam_quiz, "fetch_webcams", fake_webcams)

    q = client.get("/api/webcam-quiz/question").json()
    assert len(q["options"]) == 4
    assert "correct" not in q
    assert q["timelapse"].startswith("https://player/")
    assert "autoplay=1" in q["timelapse"] and "interactive=0" in q["timelapse"]

    right = next(o["code"] for o in q["options"] if webcam_quiz.sign(o["code"]) == q["token"])
    wrong = next(o["code"] for o in q["options"] if o["code"] != right)
    assert client.post("/api/webcam-quiz/answer", json={"token": q["token"], "guess": right}).json() == {"correct": True}
    assert client.post("/api/webcam-quiz/answer", json={"token": q["token"], "guess": wrong}).json() == {"correct": False}


def test_missing_key(monkeypatch):
    monkeypatch.delenv("WINDY_API_KEY", raising=False)
    assert client.get("/api/webcam-quiz/question").status_code == 503
