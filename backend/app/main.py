import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.parks import router as parks_router
from app.webcam_quiz import router as webcam_quiz_router

app = FastAPI(title="apptech API")

# 프론트 주소(Pages·Vercel·로컬)만 이 API를 부를 수 있다. 쉼표로 여러 개.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS", "https://devcguild.github.io,http://localhost:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(webcam_quiz_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(parks_router)
