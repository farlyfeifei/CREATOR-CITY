from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager, suppress
from datetime import timedelta

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from .config import get_settings
from .credits_service import recover_stale_reservations
from .database import SessionLocal
from .errors import APIError, error_response
from .maintenance import cleanup_expired_operational_data
from .models import utcnow
from .routers import account_center, ai, auth, checkins, credits, me, public

settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("pixel-api")


def run_maintenance_cycle() -> None:
    with SessionLocal() as db:
        recovered = recover_stale_reservations(
            db,
            utcnow() - timedelta(minutes=settings.stale_reservation_minutes),
        )
        cleaned = cleanup_expired_operational_data(
            db,
            now=utcnow(),
            settings=settings,
        )
        if recovered:
            logger.warning("recovered_stale_ai_reservations count=%s", recovered)
        if any(cleaned.values()):
            logger.info("cleaned_expired_operational_data counts=%s", cleaned)


async def maintenance_loop() -> None:
    while True:
        await asyncio.sleep(settings.recovery_loop_seconds)
        try:
            run_maintenance_cycle()
        except Exception:
            logger.exception("maintenance_cycle_failed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    task: asyncio.Task[None] | None = None
    if settings.app_env != "test":
        run_maintenance_cycle()
        task = asyncio.create_task(maintenance_loop())
    try:
        yield
    finally:
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    lifespan=lifespan,
)
if settings.allowed_hosts != "*":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[value.strip() for value in settings.allowed_hosts.split(",") if value.strip()],
    )


@app.middleware("http")
async def request_context(request: Request, call_next):
    supplied = request.headers.get("x-request-id", "")
    try:
        request_id = str(uuid.UUID(supplied))
    except ValueError:
        request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(APIError)
async def handle_api_error(request: Request, exc: APIError):
    return error_response(request, exc)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, _: RequestValidationError):
    return error_response(request, APIError(422, "validation_error", "请求参数不符合要求。"))


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    logger.exception(
        "unhandled_request_error request_id=%s path=%s",
        getattr(request.state, "request_id", "unknown"),
        request.url.path,
    )
    return error_response(request, APIError(500, "internal_error", "服务暂时不可用。"))


app.include_router(public.router)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(me.router, prefix="/api/v1")
app.include_router(account_center.router, prefix="/api/v1")
app.include_router(credits.router, prefix="/api/v1")
app.include_router(checkins.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
