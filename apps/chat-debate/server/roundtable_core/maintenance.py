from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import delete, or_
from sqlalchemy.orm import Session

from .config import Settings
from .models import (
    AIJob,
    AIUsageEvent,
    AuthSession,
    EmailVerificationCode,
    IdempotencyKey,
    PasswordResetCode,
    PublicSourceCache,
    RateLimitBucket,
    User,
    UserFeedback,
)


def cleanup_expired_operational_data(
    db: Session,
    *,
    now: datetime,
    settings: Settings,
) -> dict[str, int]:
    auth_code_cutoff = now - timedelta(hours=settings.auth_code_retention_hours)
    session_cutoff = now - timedelta(days=settings.revoked_session_retention_days)
    ai_cutoff = now - timedelta(days=settings.ai_operational_retention_days)
    deleted_account_cutoff = now - timedelta(days=settings.deleted_account_retention_days)

    rate_limits = db.execute(
        delete(RateLimitBucket).where(
            RateLimitBucket.window_started_at
            < now - timedelta(hours=settings.rate_limit_retention_hours)
        )
    ).rowcount
    public_cache = db.execute(
        delete(PublicSourceCache).where(
            PublicSourceCache.expires_at.is_not(None),
            PublicSourceCache.expires_at < now,
        )
    ).rowcount
    email_codes = db.execute(
        delete(EmailVerificationCode).where(
            EmailVerificationCode.expires_at < auth_code_cutoff
        )
    ).rowcount
    reset_codes = db.execute(
        delete(PasswordResetCode).where(
            PasswordResetCode.expires_at < auth_code_cutoff
        )
    ).rowcount
    sessions = db.execute(
        delete(AuthSession).where(
            or_(
                AuthSession.expires_at < session_cutoff,
                AuthSession.revoked_at < session_cutoff,
            )
        )
    ).rowcount
    feedback = db.execute(
        delete(UserFeedback).where(UserFeedback.created_at < ai_cutoff)
    ).rowcount
    usage_events = db.execute(
        delete(AIUsageEvent).where(AIUsageEvent.created_at < ai_cutoff)
    ).rowcount
    jobs = db.execute(
        delete(AIJob).where(
            AIJob.created_at < ai_cutoff,
            AIJob.status.in_(["succeeded", "failed"]),
        )
    ).rowcount
    idempotency_keys = db.execute(
        delete(IdempotencyKey).where(
            IdempotencyKey.created_at < ai_cutoff,
            IdempotencyKey.status.in_(["completed", "refunded", "failed"]),
        )
    ).rowcount
    deleted_accounts = db.execute(
        delete(User).where(
            User.status == "deleted",
            User.deleted_at < deleted_account_cutoff,
        )
    ).rowcount
    db.commit()
    return {
        "rate_limit_buckets": int(rate_limits or 0),
        "public_source_cache": int(public_cache or 0),
        "email_verification_codes": int(email_codes or 0),
        "password_reset_codes": int(reset_codes or 0),
        "auth_sessions": int(sessions or 0),
        "user_feedback": int(feedback or 0),
        "ai_usage_events": int(usage_events or 0),
        "ai_jobs": int(jobs or 0),
        "idempotency_keys": int(idempotency_keys or 0),
        "deleted_accounts": int(deleted_accounts or 0),
    }
