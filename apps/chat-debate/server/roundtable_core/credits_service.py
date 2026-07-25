from __future__ import annotations

import base64
import hashlib
import json
import uuid
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from .errors import APIError
from .models import (
    AIJob,
    CreditLedger,
    CreditWallet,
    DailyCheckin,
    IdempotencyKey,
    utcnow,
)

SHANGHAI = ZoneInfo("Asia/Shanghai")


def current_checkin_date() -> date:
    return datetime.now(SHANGHAI).date()


def wallet_for_update(db: Session, user_id: uuid.UUID) -> CreditWallet:
    wallet = db.scalar(
        select(CreditWallet).where(CreditWallet.user_id == user_id).with_for_update()
    )
    if not wallet:
        wallet = CreditWallet(user_id=user_id, balance=0, version=0)
        db.add(wallet)
        db.flush()
    return wallet


def calculate_streak(db: Session, user_id: uuid.UUID, today: date | None = None) -> int:
    reference = today or current_checkin_date()
    dates = list(
        db.scalars(
            select(DailyCheckin.checkin_date)
            .where(DailyCheckin.user_id == user_id, DailyCheckin.checkin_date <= reference)
            .order_by(DailyCheckin.checkin_date.desc())
            .limit(365)
        )
    )
    streak = 0
    expected = reference
    for value in dates:
        if value == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif value < expected:
            break
    return streak


def checkin(db: Session, user_id: uuid.UUID) -> tuple[DailyCheckin, CreditWallet, bool, int]:
    today = current_checkin_date()
    wallet = wallet_for_update(db, user_id)
    existing = db.scalar(
        select(DailyCheckin).where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date == today,
        )
    )
    if existing:
        db.commit()
        return existing, wallet, False, calculate_streak(db, user_id, today)
    record = DailyCheckin(
        user_id=user_id,
        checkin_date=today,
        timezone="Asia/Shanghai",
        granted_credits=10,
    )
    wallet.balance += 10
    wallet.version += 1
    db.add(record)
    db.add(
        CreditLedger(
            user_id=user_id,
            delta=10,
            balance_after=wallet.balance,
            reason="daily_checkin",
            action_type="daily_checkin",
            request_id=f"checkin-{user_id}-{today.isoformat()}",
            details={"timezone": "Asia/Shanghai", "date": today.isoformat()},
        )
    )
    db.commit()
    return record, wallet, True, calculate_streak(db, user_id, today)


def canonical_request_hash(payload: Any) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def file_request_hash(data: bytes, extra: dict[str, Any]) -> str:
    digest = hashlib.sha256(data).hexdigest()
    return canonical_request_hash({**extra, "file_sha256": digest})


def reserve_ai_request(
    db: Session,
    *,
    user_id: uuid.UUID,
    key: str,
    action_type: str,
    request_hash: str,
    request_id: str,
    cost: int,
    parent_job_id: uuid.UUID | None = None,
) -> tuple[IdempotencyKey, AIJob, CreditWallet, bool]:
    wallet = wallet_for_update(db, user_id)
    existing = db.scalar(
        select(IdempotencyKey).where(
            IdempotencyKey.user_id == user_id,
            IdempotencyKey.key == key,
        )
    )
    if existing:
        if existing.action_type != action_type or existing.request_hash != request_hash:
            db.commit()
            raise APIError(
                409,
                "idempotency_conflict",
                "该幂等键已用于不同请求，请生成新的幂等键。",
            )
        job = db.scalar(select(AIJob).where(AIJob.idempotency_id == existing.id))
        if not job:
            raise APIError(500, "job_state_invalid", "请求状态异常。")
        db.commit()
        return existing, job, wallet, True

    if parent_job_id:
        parent = db.scalar(
            select(AIJob).where(AIJob.id == parent_job_id).with_for_update()
        )
        if (
            not parent
            or parent.user_id != user_id
            or parent.action_type != "battle_reply"
            or parent.status != "succeeded"
        ):
            db.commit()
            raise APIError(422, "invalid_parent_job", "关联的 Battle 回复任务无效。")
        child = db.scalar(select(AIJob).where(AIJob.parent_job_id == parent_job_id))
        if child:
            db.commit()
            raise APIError(409, "parent_job_already_judged", "该 Battle 回复已经完成裁决。")

    if cost > 0 and wallet.balance < cost:
        db.commit()
        raise APIError(402, "insufficient_credits", "辩论次数不足，请先签到领取次数。")
    ledger_id: uuid.UUID | None = None
    if cost > 0:
        wallet.balance -= cost
        wallet.version += 1
        ledger = CreditLedger(
            user_id=user_id,
            delta=-cost,
            balance_after=wallet.balance,
            reason="ai_reservation",
            action_type=action_type,
            request_id=request_id,
            details={"idempotency_key": key},
        )
        db.add(ledger)
        db.flush()
        ledger_id = ledger.id
    idem = IdempotencyKey(
        user_id=user_id,
        key=key,
        action_type=action_type,
        request_hash=request_hash,
        request_id=request_id,
        status="reserved",
        cost=cost,
        reservation_ledger_id=ledger_id,
    )
    db.add(idem)
    db.flush()
    job = AIJob(
        user_id=user_id,
        idempotency_id=idem.id,
        parent_job_id=parent_job_id,
        action_type=action_type,
        status="reserved",
        progress=0,
    )
    db.add(job)
    db.commit()
    return idem, job, wallet, False


def mark_ai_running(db: Session, *, idempotency_id: uuid.UUID, job_id: uuid.UUID) -> None:
    idem = db.get(IdempotencyKey, idempotency_id)
    job = db.get(AIJob, job_id)
    if idem:
        idem.status = "running"
    if job:
        job.status = "running"
        job.progress = 10
        job.started_at = utcnow()
    db.commit()


def complete_ai_request(
    db: Session,
    *,
    idempotency_id: uuid.UUID,
    job_id: uuid.UUID,
    result: dict[str, Any],
    response_body: dict[str, Any],
) -> int:
    idem = db.get(IdempotencyKey, idempotency_id)
    job = db.get(AIJob, job_id)
    if not idem or not job:
        raise APIError(500, "job_state_invalid", "请求状态异常。")
    wallet = wallet_for_update(db, idem.user_id)
    if idem.cost > 0:
        db.add(
            CreditLedger(
                user_id=idem.user_id,
                delta=0,
                balance_after=wallet.balance,
                reason="ai_commit",
                action_type=idem.action_type,
                request_id=idem.request_id,
                details={"idempotency_key": idem.key},
            )
        )
    idem.status = "completed"
    idem.response_status = 200
    idem.response_body = response_body
    job.status = "succeeded"
    job.progress = 100
    job.result = result
    job.finished_at = utcnow()
    db.commit()
    return wallet.balance


def refund_ai_request(
    db: Session,
    *,
    idempotency_id: uuid.UUID,
    job_id: uuid.UUID,
    error_code: str,
    response_status: int = 502,
) -> int:
    idem = db.get(IdempotencyKey, idempotency_id)
    job = db.get(AIJob, job_id)
    if not idem or not job:
        raise APIError(500, "job_state_invalid", "请求状态异常。")
    wallet = wallet_for_update(db, idem.user_id)
    if idem.status not in {"refunded", "failed"} and idem.cost > 0:
        wallet.balance += idem.cost
        wallet.version += 1
        ledger = CreditLedger(
            user_id=idem.user_id,
            delta=idem.cost,
            balance_after=wallet.balance,
            reason="ai_refund",
            action_type=idem.action_type,
            request_id=idem.request_id,
            details={"idempotency_key": idem.key, "error_code": error_code},
        )
        db.add(ledger)
        db.flush()
        idem.refund_ledger_id = ledger.id
    idem.status = "refunded"
    idem.response_status = response_status
    idem.error_code = error_code
    job.status = "failed"
    job.progress = 100
    job.error_code = error_code
    job.finished_at = utcnow()
    if job.action_type == "battle_judge":
        job.parent_job_id = None
    db.commit()
    return wallet.balance


def recover_stale_reservations(db: Session, older_than: datetime) -> int:
    rows = list(
        db.scalars(
            select(IdempotencyKey).where(
                IdempotencyKey.status.in_(["reserved", "running"]),
                IdempotencyKey.updated_at < older_than,
            )
        )
    )
    recovered = 0
    for idem in rows:
        job = db.scalar(select(AIJob).where(AIJob.idempotency_id == idem.id))
        if not job:
            continue
        refund_ai_request(
            db,
            idempotency_id=idem.id,
            job_id=job.id,
            error_code="stale_reservation_recovered",
            response_status=503,
        )
        recovered += 1
    return recovered


def encode_cursor(created_at: datetime, ledger_id: uuid.UUID) -> str:
    value = f"{created_at.isoformat()}|{ledger_id}"
    return base64.urlsafe_b64encode(value.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        value = base64.urlsafe_b64decode(padded.encode()).decode()
        timestamp, ledger_id = value.split("|", 1)
        return datetime.fromisoformat(timestamp), uuid.UUID(ledger_id)
    except (ValueError, UnicodeDecodeError) as exc:
        raise APIError(400, "invalid_cursor", "分页游标无效。") from exc
