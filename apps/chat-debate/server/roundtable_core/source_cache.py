from __future__ import annotations

import hashlib
import json
import re
from datetime import timedelta
from typing import Any, Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .ai_provider import ProviderResult
from .config import Settings
from .models import PublicSourceCache, utcnow

PublicSourceKind = Literal["aweme", "url"]


def _allowed_host(host: str, settings: Settings) -> bool:
    normalized = host.lower().strip(".")
    allowed = [
        value.lower().strip(".")
        for value in settings.public_source_allowed_hosts.split(",")
        if value.strip()
    ]
    return any(normalized == value or normalized.endswith(f".{value}") for value in allowed)


def normalize_public_url(value: str, settings: Settings) -> str | None:
    try:
        parts = urlsplit(value.strip())
    except ValueError:
        return None
    host = (parts.hostname or "").lower()
    if parts.scheme not in {"http", "https"} or not host or not _allowed_host(host, settings):
        return None
    query = urlencode(
        sorted(
            (key, item)
            for key, item in parse_qsl(parts.query, keep_blank_values=False)
            if not key.lower().startswith("utm_")
        )
    )
    return urlunsplit(("https", host, parts.path or "/", query, ""))


def public_source_identity(
    *,
    settings: Settings,
    kind: PublicSourceKind,
    value: str,
) -> tuple[str, str | None, str | None] | None:
    raw = value.strip()
    if kind == "aweme":
        if not re.fullmatch(r"[A-Za-z0-9_-]{4,80}", raw):
            return None
        identity = f"aweme:{raw}"
        aweme_id = raw
        source_url = None
    else:
        normalized_url = normalize_public_url(raw, settings)
        if not normalized_url:
            return None
        identity = f"url:{normalized_url}"
        aweme_id = None
        source_url = normalized_url
    cache_key = "public:" + hashlib.sha256(identity.encode()).hexdigest()
    return cache_key, aweme_id, source_url


def topic_identity(
    payload: dict[str, Any],
    settings: Settings,
) -> tuple[str, str | None, str | None] | None:
    if payload.get("aweme_id"):
        return public_source_identity(
            settings=settings,
            kind="aweme",
            value=str(payload["aweme_id"]),
        )
    if payload.get("source_url"):
        return public_source_identity(
            settings=settings,
            kind="url",
            value=str(payload["source_url"]),
        )
    return None


def _active(row: PublicSourceCache) -> bool:
    return row.reusable and (row.expires_at is None or row.expires_at > utcnow())


def _topic_content_hash(payload: dict[str, Any]) -> str:
    relevant_payload = {
        key: payload.get(key)
        for key in (
            "source_url",
            "aweme_id",
            "title",
            "author",
            "description",
            "transcript",
            "sample_comments",
        )
    }
    canonical = json.dumps(
        relevant_payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def _row(
    db: Session,
    *,
    identity: tuple[str, str | None, str | None],
    settings: Settings,
) -> PublicSourceCache:
    cache_key, aweme_id, source_url = identity
    value = db.scalar(
        select(PublicSourceCache)
        .where(PublicSourceCache.cache_key == cache_key)
        .with_for_update()
    )
    if value:
        return value
    value = PublicSourceCache(
        cache_key=cache_key,
        aweme_id=aweme_id,
        source_url=source_url,
        metadata_json={},
        reusable=True,
        expires_at=utcnow() + timedelta(days=settings.public_source_cache_days),
    )
    try:
        with db.begin_nested():
            db.add(value)
            db.flush()
    except IntegrityError:
        value = db.scalar(
            select(PublicSourceCache)
            .where(PublicSourceCache.cache_key == cache_key)
            .with_for_update()
        )
        if not value:
            raise
    return value


def cached_topic_result(
    db: Session,
    *,
    payload: dict[str, Any],
    settings: Settings,
) -> ProviderResult | None:
    identity = topic_identity(payload, settings)
    if not identity:
        return None
    row = db.scalar(select(PublicSourceCache).where(PublicSourceCache.cache_key == identity[0]))
    if not row or not _active(row):
        return None
    content_hash = _topic_content_hash(payload)
    metadata = row.metadata_json or {}
    result = metadata.get("topic_result")
    if not isinstance(result, dict) or metadata.get("topic_content_hash") != content_hash:
        return None
    return ProviderResult(
        result=result,
        model="pixel-public-source-cache",
        provider="cache",
        input_tokens=0,
        output_tokens=0,
    )


def store_topic_result(
    db: Session,
    *,
    payload: dict[str, Any],
    result: dict[str, Any],
    settings: Settings,
) -> None:
    identity = topic_identity(payload, settings)
    if not identity:
        return
    row = _row(db, identity=identity, settings=settings)
    metadata = dict(row.metadata_json or {})
    metadata["topic_result"] = result
    metadata["topic_content_hash"] = _topic_content_hash(payload)
    row.metadata_json = metadata
    row.transcript = str(payload.get("transcript", ""))
    digest = result.get("sourceDigest")
    row.source_digest = digest if isinstance(digest, dict) else None
    row.content_hash = metadata["topic_content_hash"]
    row.reusable = True
    row.expires_at = utcnow() + timedelta(days=settings.public_source_cache_days)
    db.commit()


def cached_asr_result(
    db: Session,
    *,
    identity: tuple[str, str | None, str | None] | None,
    segment_index: int,
    audio_hash: str,
) -> ProviderResult | None:
    if not identity:
        return None
    row = db.scalar(select(PublicSourceCache).where(PublicSourceCache.cache_key == identity[0]))
    if not row or not _active(row):
        return None
    segments = (row.metadata_json or {}).get("asr_segments")
    if not isinstance(segments, dict):
        return None
    segment = segments.get(str(segment_index))
    if (
        not isinstance(segment, dict)
        or segment.get("audio_hash") != audio_hash
        or not isinstance(segment.get("transcript"), str)
        or not segment["transcript"].strip()
    ):
        return None
    return ProviderResult(
        result={"transcript": segment["transcript"]},
        model="pixel-public-source-cache",
        provider="cache",
        input_tokens=0,
        output_tokens=0,
    )


def store_asr_result(
    db: Session,
    *,
    identity: tuple[str, str | None, str | None] | None,
    segment_index: int,
    segment_count: int,
    audio_hash: str,
    transcript: str,
    settings: Settings,
) -> None:
    if not identity:
        return
    row = _row(db, identity=identity, settings=settings)
    metadata = dict(row.metadata_json or {})
    segments = dict(metadata.get("asr_segments") or {})
    segments[str(segment_index)] = {
        "audio_hash": audio_hash,
        "transcript": transcript,
    }
    metadata["asr_segments"] = segments
    metadata["asr_segment_count"] = segment_count
    row.metadata_json = metadata
    row.reusable = True
    row.expires_at = utcnow() + timedelta(days=settings.public_source_cache_days)
    if all(str(index) in segments for index in range(segment_count)):
        row.transcript = "\n".join(
            str(segments[str(index)]["transcript"]).strip() for index in range(segment_count)
        )
    db.commit()
