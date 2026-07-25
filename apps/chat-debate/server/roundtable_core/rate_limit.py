from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from .errors import APIError


def increment_bucket(
    db: Session,
    *,
    scope: str,
    key: str,
    limit: int,
    now: datetime | None = None,
) -> int:
    current = now or datetime.now(UTC).replace(tzinfo=None)
    window = current.replace(second=0, microsecond=0)
    count = db.execute(
        text(
            """
            INSERT INTO rate_limit_buckets (scope, key, window_started_at, count, updated_at)
            VALUES (:scope, :key, :window, 1, :now)
            ON CONFLICT (scope, key, window_started_at)
            DO UPDATE SET count = rate_limit_buckets.count + 1, updated_at = :now
            RETURNING count
            """
        ),
        {"scope": scope, "key": key, "window": window, "now": current},
    ).scalar_one()
    db.commit()
    if count > limit:
        raise APIError(429, "rate_limit_exceeded", "请求过于频繁，请稍后再试。")
    return int(count)
