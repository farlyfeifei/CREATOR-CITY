from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    auth_provider: Mapped[str] = mapped_column(String(24), default="email", index=True, nullable=False)
    apple_subject: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    nickname: Mapped[str] = mapped_column(String(80), nullable=False)
    avatar_seed: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="active", index=True, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)

    wallet: Mapped[CreditWallet] = relationship(back_populates="user", uselist=False)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    token_family_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), index=True, nullable=False)
    parent_session_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    replaced_by_session_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    device_name: Mapped[str] = mapped_column(String(120), default="iPhone", nullable=False)
    app_version: Mapped[str] = mapped_column(String(40), default="unknown", nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)
    revoke_reason: Mapped[str | None] = mapped_column(String(48))
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class EmailVerificationCode(Base):
    __tablename__ = "email_verification_codes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    purpose: Mapped[str] = mapped_column(String(24), index=True, nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class PasswordResetCode(Base):
    __tablename__ = "password_reset_codes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class CreditWallet(Base):
    __tablename__ = "credit_wallets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="wallet")


class CreditLedger(Base):
    __tablename__ = "credit_ledger"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    action_type: Mapped[str | None] = mapped_column(String(48), index=True)
    request_id: Mapped[str | None] = mapped_column(String(64), index=True)
    details: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True, nullable=False)


class DailyCheckin(Base):
    __tablename__ = "daily_checkins"
    __table_args__ = (UniqueConstraint("user_id", "checkin_date", name="uq_daily_checkin_user_date"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    checkin_date: Mapped[date] = mapped_column(Date, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Shanghai", nullable=False)
    granted_credits: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (
        UniqueConstraint("user_id", "key", name="uq_idempotency_user_key"),
        Index("ix_idempotency_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    action_type: Mapped[str] = mapped_column(String(48), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="reserved", nullable=False)
    cost: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    response_status: Mapped[int | None] = mapped_column(Integer)
    response_body: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error_code: Mapped[str | None] = mapped_column(String(64))
    reservation_ledger_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    refund_ledger_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class AIJob(Base):
    __tablename__ = "ai_jobs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    idempotency_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("idempotency_keys.id", ondelete="SET NULL"), unique=True
    )
    parent_job_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_jobs.id", ondelete="SET NULL"), unique=True
    )
    action_type: Mapped[str] = mapped_column(String(48), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="reserved", index=True, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error_code: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class AIUsageEvent(Base):
    __tablename__ = "ai_usage_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    request_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action_type: Mapped[str] = mapped_column(String(48), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(80), nullable=False)
    input_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    output_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(24), index=True, nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    usage_event_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_usage_events.id", ondelete="SET NULL")
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(80))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class RateLimitBucket(Base):
    __tablename__ = "rate_limit_buckets"
    __table_args__ = (
        UniqueConstraint("scope", "key", "window_started_at", name="uq_rate_limit_bucket"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(24), nullable=False)
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    window_started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class PublicSourceCache(Base):
    __tablename__ = "public_source_cache"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cache_key: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    aweme_id: Mapped[str | None] = mapped_column(String(80), index=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    transcript: Mapped[str | None] = mapped_column(Text)
    source_digest: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    reusable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class AccountRoundtableArchive(Base, TimestampMixin):
    __tablename__ = "account_roundtable_archives"
    __table_args__ = (
        UniqueConstraint("user_id", "client_archive_id", name="uq_account_roundtable_archive"),
        Index("ix_account_roundtable_user_ended", "user_id", "ended_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_archive_id: Mapped[str] = mapped_column(String(180), nullable=False)
    session_id: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    timeline_revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    snapshot_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    topic_title: Mapped[str] = mapped_column(String(500), nullable=False)
    topic_question: Mapped[str] = mapped_column(Text, nullable=False)
    participant_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    speech_event_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    battle_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    archive_payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)


class AccountDecisionArtifact(Base, TimestampMixin):
    __tablename__ = "account_decision_artifacts"
    __table_args__ = (
        UniqueConstraint("user_id", "client_decision_id", name="uq_account_decision_artifact"),
        Index("ix_account_decision_user_created", "user_id", "client_created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_decision_id: Mapped[str] = mapped_column(String(80), nullable=False)
    topic_title: Mapped[str] = mapped_column(String(500), nullable=False)
    card_title: Mapped[str] = mapped_column(String(500), nullable=False)
    conditional_conclusion: Mapped[str] = mapped_column(Text, nullable=False)
    role_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role_description: Mapped[str] = mapped_column(Text, nullable=False)
    client_created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    artifact_payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)


class AccountActionItem(Base, TimestampMixin):
    __tablename__ = "account_action_items"
    __table_args__ = (
        UniqueConstraint("decision_id", "client_action_id", name="uq_account_decision_action"),
        Index("ix_account_action_user_status", "user_id", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    decision_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("account_decision_artifacts.id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_action_id: Mapped[str] = mapped_column(String(160), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    due_hint: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    source_topic: Mapped[str] = mapped_column(String(500), nullable=False)
    impact_summary: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)


class UserExpertRelationship(Base, TimestampMixin):
    __tablename__ = "user_expert_relationships"
    __table_args__ = (
        UniqueConstraint("user_id", "expert_id", name="uq_user_expert_relationship"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    expert_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    understanding_score: Mapped[float] = mapped_column(Float, nullable=False)
    taming_score: Mapped[float] = mapped_column(Float, nullable=False)
    consensus_score: Mapped[float] = mapped_column(Float, nullable=False)
    battle_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    adaptation_profile: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    last_battle_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)


class BattleRelationshipEvent(Base):
    __tablename__ = "battle_relationship_events"
    __table_args__ = (
        UniqueConstraint("user_id", "battle_id", name="uq_user_battle_relationship_event"),
        Index("ix_battle_relationship_user_created", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    battle_id: Mapped[str] = mapped_column(String(80), nullable=False)
    expert_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    topic_id: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    session_id: Mapped[str | None] = mapped_column(String(180), index=True)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    input_metrics: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    metric_deltas: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    scores_before: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    scores_after: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    drivers: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
