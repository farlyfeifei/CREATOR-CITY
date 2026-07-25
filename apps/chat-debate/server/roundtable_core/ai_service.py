from __future__ import annotations

import asyncio
import time
import uuid
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy.orm import Session

from .ai_provider import ProviderResult
from .config import Settings
from .credits_service import (
    complete_ai_request,
    mark_ai_running,
    refund_ai_request,
    reserve_ai_request,
)
from .errors import APIError
from .models import AIUsageEvent, CreditWallet, IdempotencyKey

ProviderCall = Callable[[], Awaitable[ProviderResult]]


class AIConcurrency:
    def __init__(self) -> None:
        self._global: asyncio.Semaphore | None = None
        self._global_size = 0
        self._users: dict[str, asyncio.Semaphore] = defaultdict(lambda: asyncio.Semaphore(1))

    def global_semaphore(self, size: int) -> asyncio.Semaphore:
        if self._global is None or self._global_size != size:
            self._global = asyncio.Semaphore(size)
            self._global_size = size
        return self._global

    def user_semaphore(self, user_id: uuid.UUID, size: int) -> asyncio.Semaphore:
        key = str(user_id)
        semaphore = self._users.get(key)
        if semaphore is None or getattr(semaphore, "_pixel_size", None) != size:
            semaphore = asyncio.Semaphore(size)
            setattr(semaphore, "_pixel_size", size)
            self._users[key] = semaphore
        return semaphore


concurrency = AIConcurrency()


async def execute_ai_request(
    db: Session,
    *,
    user_id: uuid.UUID,
    idempotency_key: str,
    request_id: str,
    action_type: str,
    request_hash: str,
    input_size: int,
    cost: int,
    settings: Settings,
    provider_call: ProviderCall,
    timeout_seconds: float | None = None,
    parent_job_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    idem, job, wallet, replay = reserve_ai_request(
        db,
        user_id=user_id,
        key=idempotency_key,
        action_type=action_type,
        request_hash=request_hash,
        request_id=request_id,
        cost=cost,
        parent_job_id=parent_job_id,
    )
    if replay:
        if idem.status == "completed" and idem.response_body:
            return idem.response_body
        if idem.status in {"refunded", "failed"}:
            raise APIError(
                idem.response_status or 502,
                idem.error_code or "previous_request_failed",
                "该请求此前已失败且额度已退回，请使用新的幂等键重试。",
            )
        raise APIError(409, "request_in_progress", "相同请求正在处理中，请稍后查询任务状态。")

    mark_ai_running(db, idempotency_id=idem.id, job_id=job.id)
    started = time.monotonic()
    model = settings.active_chat_model
    provider_name = settings.active_chat_provider
    try:
        async with concurrency.global_semaphore(settings.global_ai_concurrency):
            async with concurrency.user_semaphore(user_id, settings.per_user_ai_concurrency):
                provider_result = await asyncio.wait_for(
                    provider_call(),
                    timeout=timeout_seconds or settings.ai_request_timeout_seconds,
                )
        latency_ms = int((time.monotonic() - started) * 1000)
        model = provider_result.model
        provider_name = provider_result.provider
        current_wallet = db.get(CreditWallet, user_id)
        predicted_balance = current_wallet.balance if current_wallet else wallet.balance
        response_body = {
            "job_id": str(job.id),
            "request_id": request_id,
            "action_type": action_type,
            "balance": predicted_balance,
            "result": provider_result.result,
        }
        balance = complete_ai_request(
            db,
            idempotency_id=idem.id,
            job_id=job.id,
            result=provider_result.result,
            response_body=response_body,
        )
        response_body["balance"] = balance
        stored_idem = db.get(IdempotencyKey, idem.id)
        if stored_idem:
            stored_idem.response_body = response_body
        db.add(
            AIUsageEvent(
                user_id=user_id,
                request_id=request_id,
                action_type=action_type,
                provider=provider_name,
                model=model,
                prompt_version=settings.prompt_version,
                input_size=input_size,
                output_size=len(str(provider_result.result).encode()),
                input_tokens=provider_result.input_tokens,
                output_tokens=provider_result.output_tokens,
                latency_ms=latency_ms,
                status="succeeded",
            )
        )
        db.commit()
        return response_body
    except TimeoutError as exc:
        latency_ms = int((time.monotonic() - started) * 1000)
        refund_ai_request(
            db,
            idempotency_id=idem.id,
            job_id=job.id,
            error_code="upstream_timeout",
            response_status=504,
        )
        db.add(
            AIUsageEvent(
                user_id=user_id,
                request_id=request_id,
                action_type=action_type,
                provider=provider_name,
                model=model,
                prompt_version=settings.prompt_version,
                input_size=input_size,
                output_size=0,
                latency_ms=latency_ms,
                status="failed",
                error_code="upstream_timeout",
            )
        )
        db.commit()
        raise APIError(504, "upstream_timeout", "AI 服务响应超时，次数已退回。") from exc
    except APIError as exc:
        latency_ms = int((time.monotonic() - started) * 1000)
        refund_ai_request(
            db,
            idempotency_id=idem.id,
            job_id=job.id,
            error_code=exc.code,
            response_status=exc.status_code,
        )
        db.add(
            AIUsageEvent(
                user_id=user_id,
                request_id=request_id,
                action_type=action_type,
                provider=provider_name,
                model=model,
                prompt_version=settings.prompt_version,
                input_size=input_size,
                output_size=0,
                latency_ms=latency_ms,
                status="failed",
                error_code=exc.code,
            )
        )
        db.commit()
        raise
    except Exception as exc:
        latency_ms = int((time.monotonic() - started) * 1000)
        refund_ai_request(
            db,
            idempotency_id=idem.id,
            job_id=job.id,
            error_code="upstream_unavailable",
            response_status=502,
        )
        db.add(
            AIUsageEvent(
                user_id=user_id,
                request_id=request_id,
                action_type=action_type,
                provider=provider_name,
                model=model,
                prompt_version=settings.prompt_version,
                input_size=input_size,
                output_size=0,
                latency_ms=latency_ms,
                status="failed",
                error_code="upstream_unavailable",
            )
        )
        db.commit()
        raise APIError(502, "upstream_unavailable", "AI 服务暂时不可用，次数已退回。") from exc
