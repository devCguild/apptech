import asyncio
import hashlib
import hmac
import os
import re
from contextlib import asynccontextmanager
from urllib.parse import parse_qsl

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.parks import router as parks_router
from app.routers import discover_routers
from app.config import Settings
from app.storage import (
    DuplicateReward,
    InvalidSession,
    RewardStore,
    StorageUnavailable,
    UnknownUser,
)

MAX_CALLBACK_BYTES = 16 * 1024
REQUIRED_CALLBACK_FIELDS = {
    "usn": 128,
    "reward_key": 256,
    "campaign_key": 50,
    "quantity": 64,
    "signed_value": 32,
}


def callback_response(code: int, message: str, status_code: int = 200):
    return JSONResponse(
        {"Result": code == 1, "ResultCode": code, "ResultMsg": message},
        status_code=status_code,
        headers={"Cache-Control": "no-store"},
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration_ready = True
    if settings is None:
        try:
            settings = Settings.from_environment()
        except ValueError:
            # Invalid environment settings keep health available while closing
            # every reward operation. Never infer live mode from an invalid value.
            settings = Settings()
            configuration_ready = False
    store = RewardStore(settings, enabled=configuration_ready)

    @asynccontextmanager
    async def lifespan(_):
        await asyncio.to_thread(store.initialize)
        try:
            yield
        finally:
            await asyncio.to_thread(store.close)

    api = FastAPI(title="apptech API", lifespan=lifespan)
    api.state.settings = settings
    api.state.reward_store = store

    # 프론트 주소(Pages·Vercel·로컬)만 이 API를 부를 수 있다. 쉼표로 여러 개.
    allowed_origins = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS", "https://devcguild.github.io,http://localhost:5173"
        ).split(",")
        if origin.strip()
    ]
    api.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api.include_router(parks_router)
    # app/routers/<앱id>.py 의 router 자동 등록 (이슈 #9). 위 두 줄은 해당 앱이 옮기면 지운다
    for router in discover_routers():
        api.include_router(router)

    @api.exception_handler(StorageUnavailable)
    async def unavailable(_, __):
        return JSONResponse(
            {"detail": "Reward storage is unavailable"},
            status_code=503,
            headers={"Cache-Control": "no-store"},
        )

    @api.get("/api/health")
    def health():
        return {"status": "ok"}

    @api.get("/api/rewards/status")
    def reward_status():
        storage_ready = store.is_ready()
        enabled = settings.adpopcorn_environment == "test" or settings.allow_live_rewards
        callback_ready = bool(storage_ready and settings.adpopcorn_hash_key and enabled)
        return JSONResponse(
            {
                "storage_ready": storage_ready,
                "callback_ready": callback_ready,
                "environment": settings.adpopcorn_environment,
                "live_enabled": bool(
                    callback_ready
                    and settings.adpopcorn_environment == "live"
                    and settings.allow_live_rewards
                ),
            },
            headers={"Cache-Control": "no-store"},
        )

    @api.post("/api/session", status_code=201)
    def create_session():
        return JSONResponse(
            store.create_session(),
            status_code=201,
            headers={"Cache-Control": "no-store"},
        )

    @api.get("/api/wallet")
    def wallet(authorization: str | None = Header(default=None)):
        if authorization is None:
            raise HTTPException(
                401,
                "A valid guest session is required",
                headers={"Cache-Control": "no-store", "WWW-Authenticate": "Bearer"},
            )
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token or len(token) > 256:
            raise HTTPException(
                401,
                "A valid guest session is required",
                headers={"Cache-Control": "no-store", "WWW-Authenticate": "Bearer"},
            )
        try:
            result = store.wallet(token)
        except InvalidSession:
            raise HTTPException(
                401,
                "A valid guest session is required",
                headers={"Cache-Control": "no-store", "WWW-Authenticate": "Bearer"},
            ) from None
        return JSONResponse(result, headers={"Cache-Control": "no-store"})

    @api.post("/api/adpopcorn/callback")
    async def adpopcorn_callback(request: Request):
        enabled = settings.adpopcorn_environment == "test" or settings.allow_live_rewards
        if not settings.adpopcorn_hash_key or not enabled:
            return callback_response(4000, "callback is unavailable", 503)
        if not await asyncio.to_thread(store.is_ready):
            return callback_response(4000, "storage is unavailable", 503)
        if request.headers.get("content-type", "").split(";")[0].strip().lower() != (
            "application/x-www-form-urlencoded"
        ):
            return callback_response(4000, "unsupported content type", 415)
        content_length = request.headers.get("content-length")
        if content_length is not None:
            if not content_length.isascii() or not content_length.isdecimal():
                return callback_response(4000, "invalid content length")
            if len(content_length) > 8 or int(content_length) > MAX_CALLBACK_BYTES:
                return callback_response(4000, "request body is too large", 413)
        body = bytearray()
        async for chunk in request.stream():
            if len(body) + len(chunk) > MAX_CALLBACK_BYTES:
                return callback_response(4000, "request body is too large", 413)
            body.extend(chunk)
        try:
            encoded = body.decode("utf-8", errors="strict")
            if re.search(r"%(?![0-9a-fA-F]{2})", encoded):
                raise ValueError
            pairs = parse_qsl(
                encoded,
                keep_blank_values=True,
                strict_parsing=True,
                encoding="utf-8",
                errors="strict",
                max_num_fields=64,
            )
            fields = {}
            for key, value in pairs:
                if key not in REQUIRED_CALLBACK_FIELDS:
                    continue
                if key in fields:
                    raise ValueError
                if not value or len(value) > REQUIRED_CALLBACK_FIELDS[key]:
                    raise ValueError
                if any(ord(char) < 32 or ord(char) == 127 for char in value):
                    raise ValueError
                fields[key] = value
            if fields.keys() != REQUIRED_CALLBACK_FIELDS.keys():
                raise ValueError
            quantity = fields["quantity"]
            if re.fullmatch(r"[0-9]+", quantity) is None:
                raise ValueError
            amount = int(quantity)
            if not 1 <= amount <= 2147483647:
                raise ValueError
        except (UnicodeError, ValueError):
            return callback_response(4000, "invalid callback parameters")
        signed_value = fields["signed_value"]
        if re.fullmatch(r"[0-9a-f]{32}", signed_value) is None:
            return callback_response(1100, "invalid signed value")
        # The provider signs the exact received quantity, without separators.
        plaintext = (
            fields["usn"] + fields["reward_key"] + quantity + fields["campaign_key"]
        )
        expected = hmac.new(
            settings.adpopcorn_hash_key.encode("utf-8"),
            plaintext.encode("utf-8"),
            hashlib.md5,
        ).hexdigest()
        if not hmac.compare_digest(expected, signed_value):
            return callback_response(1100, "invalid signed value")
        try:
            await asyncio.to_thread(
                store.credit,
                fields["usn"],
                fields["reward_key"],
                fields["campaign_key"],
                amount,
            )
        except DuplicateReward:
            return callback_response(3100, "duplicate transaction")
        except UnknownUser:
            return callback_response(3200, "invalid user")
        except StorageUnavailable:
            return callback_response(4000, "storage is unavailable", 503)
        return callback_response(1, "success")

    return api


app = create_app()
