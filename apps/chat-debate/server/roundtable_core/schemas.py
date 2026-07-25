from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


def validate_password_complexity(value: str) -> str:
    if not any(character.isalpha() for character in value):
        raise ValueError("password must include a letter")
    if not any(character.isdigit() for character in value):
        raise ValueError("password must include a number")
    return value


class MessageResponse(BaseModel):
    message: str


class SendCodeRequest(BaseModel):
    email: EmailStr
    purpose: Literal["register", "reset"] = "register"


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    purpose: Literal["register"] = "register"


class VerifyEmailResponse(BaseModel):
    verification_token: str
    expires_in: int


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    nickname: str = Field(min_length=1, max_length=40)
    verification_token: str
    device_name: str = Field(default="iPhone", max_length=120)
    app_version: str = Field(default="unknown", max_length=40)

    @field_validator("password")
    @classmethod
    def password_complexity(cls, value: str) -> str:
        return validate_password_complexity(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    device_name: str = Field(default="iPhone", max_length=120)
    app_version: str = Field(default="unknown", max_length=40)


class TestLoginRequest(BaseModel):
    device_name: str = Field(default="iPhone Simulator", max_length=120)
    app_version: str = Field(default="unknown", max_length=40)


class AppleLoginRequest(BaseModel):
    identity_token: str = Field(min_length=100, max_length=16_384)
    authorization_code: str | None = Field(default=None, max_length=8_192)
    nonce: str = Field(min_length=16, max_length=256)
    full_name: str | None = Field(default=None, max_length=80)
    device_name: str = Field(default="Apple Device", max_length=120)
    app_version: str = Field(default="unknown", max_length=40)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)
    device_name: str = Field(default="iPhone", max_length=120)
    app_version: str = Field(default="unknown", max_length=40)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_complexity(cls, value: str) -> str:
        return validate_password_complexity(value)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_complexity(cls, value: str) -> str:
        return validate_password_complexity(value)


class DeleteAccountRequest(BaseModel):
    password: str | None = Field(default=None, min_length=1, max_length=128)
    identity_token: str | None = Field(default=None, min_length=100, max_length=16_384)
    nonce: str | None = Field(default=None, min_length=16, max_length=256)
    confirmation: Literal["DELETE"]

    @model_validator(mode="after")
    def requires_reauthentication(self) -> DeleteAccountRequest:
        if self.password is None and (self.identity_token is None or self.nonce is None):
            raise ValueError("account deletion requires reauthentication")
        return self


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    auth_provider: Literal["email", "apple"] = "email"
    nickname: str
    avatar_seed: str
    status: str
    email_verified_at: datetime | None
    created_at: datetime


class UpdateUserRequest(BaseModel):
    nickname: str | None = Field(default=None, min_length=1, max_length=40)
    avatar_seed: str | None = Field(default=None, max_length=80)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserResponse
    balance: int


class SessionResponse(BaseModel):
    id: uuid.UUID
    device_name: str
    app_version: str
    created_at: datetime
    last_used_at: datetime | None
    expires_at: datetime
    current: bool = False


class BalanceResponse(BaseModel):
    balance: int
    updated_at: datetime


class LedgerEntryResponse(BaseModel):
    id: uuid.UUID
    delta: int
    balance_after: int
    reason: str
    action_type: str | None
    request_id: str | None
    metadata: dict[str, Any]
    created_at: datetime


class LedgerPageResponse(BaseModel):
    items: list[LedgerEntryResponse]
    next_cursor: str | None = None


class CheckinResponse(BaseModel):
    checked_in: bool
    checkin_date: date
    granted_credits: int
    balance: int
    streak: int
    message: str


class CheckinHistoryItem(BaseModel):
    checkin_date: date
    granted_credits: int
    created_at: datetime


class CheckinHistoryResponse(BaseModel):
    items: list[CheckinHistoryItem]
    streak: int


class AccountRoundtableUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    client_archive_id: str = Field(min_length=1, max_length=180)
    session_id: str = Field(min_length=1, max_length=180)
    timeline_revision: int = Field(ge=1, le=100_000)
    snapshot_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    topic_title: str = Field(min_length=1, max_length=500)
    topic_question: str = Field(min_length=1, max_length=4_000)
    participant_count: int = Field(ge=0, le=100)
    speech_event_count: int = Field(ge=1, le=20_000)
    battle_count: int = Field(default=0, ge=0, le=1_000)
    started_at: datetime
    ended_at: datetime
    payload: dict[str, Any]

    @model_validator(mode="after")
    def valid_roundtable_window(self) -> AccountRoundtableUpsertRequest:
        if self.ended_at < self.started_at:
            raise ValueError("roundtable ended_at must not precede started_at")
        return self


class AccountRoundtableSummaryResponse(BaseModel):
    id: uuid.UUID
    client_archive_id: str
    session_id: str
    timeline_revision: int
    snapshot_sha256: str
    topic_title: str
    topic_question: str
    participant_count: int
    speech_event_count: int
    battle_count: int
    started_at: datetime
    ended_at: datetime
    created_at: datetime


class AccountRoundtableDetailResponse(AccountRoundtableSummaryResponse):
    payload: dict[str, Any]


class AccountRoundtablePageResponse(BaseModel):
    items: list[AccountRoundtableSummaryResponse]
    total: int
    offset: int
    limit: int
    has_more: bool


class AccountDecisionActionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_action_id: str = Field(min_length=1, max_length=160)
    title: str = Field(min_length=1, max_length=500)
    detail: str = Field(min_length=1, max_length=4_000)
    due_hint: str = Field(default="", max_length=300)


class AccountDecisionUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    client_decision_id: str = Field(min_length=1, max_length=80)
    topic_title: str = Field(min_length=1, max_length=500)
    card_title: str = Field(min_length=1, max_length=500)
    conditional_conclusion: str = Field(min_length=1, max_length=6_000)
    role_name: str = Field(min_length=1, max_length=200)
    role_description: str = Field(min_length=1, max_length=2_000)
    client_created_at: datetime
    actions: list[AccountDecisionActionInput] = Field(default_factory=list, max_length=20)
    payload: dict[str, Any]

    @model_validator(mode="after")
    def unique_action_ids(self) -> AccountDecisionUpsertRequest:
        action_ids = [item.client_action_id for item in self.actions]
        if len(action_ids) != len(set(action_ids)):
            raise ValueError("decision action IDs must be unique")
        return self


class AccountDecisionSummaryResponse(BaseModel):
    id: uuid.UUID
    client_decision_id: str
    topic_title: str
    card_title: str
    conditional_conclusion: str
    role_name: str
    role_description: str
    action_count: int
    pending_action_count: int
    client_created_at: datetime
    created_at: datetime


class AccountDecisionDetailResponse(AccountDecisionSummaryResponse):
    payload: dict[str, Any]


class AccountActionItemResponse(BaseModel):
    id: uuid.UUID
    decision_id: uuid.UUID
    client_action_id: str
    title: str
    detail: str
    due_hint: str
    source_topic: str
    impact_summary: str
    status: Literal["pending", "completed", "dismissed"]
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AccountActionStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["pending", "completed", "dismissed"]


class ExpertRelationshipResponse(BaseModel):
    expert_id: str
    understanding_score: float
    taming_score: float
    consensus_score: float
    understanding_level: int
    taming_level: int
    consensus_level: int
    battle_count: int
    adaptation_profile: dict[str, Any]
    last_battle_at: datetime | None
    updated_at: datetime


class BattleMetricVectorInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answered_conflict: float = Field(ge=0, le=1)
    verifiable_evidence: float = Field(ge=0, le=1)
    rebutted_original_point: float = Field(ge=0, le=1)
    specificity: float = Field(ge=0, le=1)
    logical_consistency: float = Field(ge=0, le=1)
    factual_alignment: float = Field(ge=0, le=1)
    keyword_stuffing: float = Field(ge=0, le=1)
    persuasion: float = Field(ge=0, le=1)
    openness: float = Field(ge=0, le=1)
    rounds: int = Field(ge=1, le=5)
    positive_turns: int = Field(default=0, ge=0, le=5)
    used_evidence_count: int = Field(default=0, ge=0, le=30)
    result: Literal["win", "lose", "draw", "expertSoftened", "expertUnmoved"]
    changed_side: bool = False

    @model_validator(mode="after")
    def positive_turns_fit_rounds(self) -> BattleMetricVectorInput:
        if self.positive_turns > self.rounds:
            raise ValueError("positive_turns must not exceed rounds")
        return self


class BattleRelationshipImpactRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    battle_id: uuid.UUID
    expert_id: str = Field(min_length=1, max_length=100)
    topic_id: str = Field(min_length=1, max_length=180)
    session_id: str | None = Field(default=None, min_length=1, max_length=180)
    session_battle_count: int | None = Field(default=None, ge=1, le=10_000)
    user_stance: Literal["support", "oppose", "custom"]
    metrics: BattleMetricVectorInput

    @model_validator(mode="after")
    def session_link_is_complete(self) -> BattleRelationshipImpactRequest:
        if (self.session_id is None) != (self.session_battle_count is None):
            raise ValueError("session_id and session_battle_count must be provided together")
        return self


class BattleRelationshipImpactResponse(BaseModel):
    event_id: uuid.UUID
    battle_id: uuid.UUID
    expert_id: str
    topic_id: str
    session_id: str | None = None
    scores_before: dict[str, float]
    metric_deltas: dict[str, float]
    scores_after: dict[str, float]
    drivers: list[dict[str, Any]]
    relationship: ExpertRelationshipResponse
    created_at: datetime
    replayed: bool = False


class AccountCenterCountsResponse(BaseModel):
    roundtables: int
    decisions: int
    pending_actions: int
    experts: int
    battles: int


class AccountCenterResponse(BaseModel):
    generated_at: datetime
    counts: AccountCenterCountsResponse
    roundtables: list[AccountRoundtableSummaryResponse]
    decisions: list[AccountDecisionSummaryResponse]
    actions: list[AccountActionItemResponse]
    relationships: list[ExpertRelationshipResponse]


class AccountExportResponse(BaseModel):
    generated_at: datetime
    user: UserResponse
    balance: int
    ledger: list[LedgerEntryResponse]
    checkins: list[CheckinHistoryItem]
    sessions: list[SessionResponse]
    roundtables: list[AccountRoundtableDetailResponse] = Field(default_factory=list)
    decisions: list[AccountDecisionDetailResponse] = Field(default_factory=list)
    actions: list[AccountActionItemResponse] = Field(default_factory=list)
    relationships: list[ExpertRelationshipResponse] = Field(default_factory=list)
    battle_impacts: list[BattleRelationshipImpactResponse] = Field(default_factory=list)


class ConversationMessage(BaseModel):
    role: Literal["moderator", "user", "expert", "system"]
    content: str = Field(min_length=1, max_length=2000)
    expert_id: str | None = Field(default=None, max_length=80)


class RoundtableRequestedTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expert_id: str = Field(min_length=1, max_length=80)
    client_expert_id: str | None = Field(default=None, max_length=80)
    expert_name: str = Field(min_length=1, max_length=80)
    side: Literal["support", "oppose", "swing"]
    role: str = Field(default="", max_length=120)
    debate_role: str = Field(default="", max_length=200)
    thesis: str = Field(default="", max_length=500)
    weak_point: str = Field(default="", max_length=300)
    prior_stance: Literal["support", "oppose", "swing"] | None = None
    prior_argument: str = Field(default="", max_length=2_000)
    required_target_id: str | None = Field(default=None, max_length=80)
    required_target_name: str | None = Field(default=None, max_length=80)
    persona_profile: dict[str, Any] = Field(default_factory=dict)


class RoundtableUserTurnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=100)
    sequence: int = Field(ge=1, le=1_000_000)
    text: str = Field(min_length=1, max_length=2_000)
    intent: Literal["free", "question", "support", "challenge", "attack"]
    target_expert_id: str | None = Field(default=None, max_length=80)
    target_expert_name: str | None = Field(default=None, max_length=80)
    modality: Literal["text", "voice"]


class BattleSourceClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=100)
    text: str = Field(min_length=1, max_length=1000)
    evidence_time_range: str = Field(default="metadata", max_length=120)
    confidence: float = Field(default=0.5, ge=0, le=1)


class TranscriptSegmentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=120)
    startMs: int = Field(ge=0, le=86_400_000)
    endMs: int = Field(gt=0, le=86_400_000)
    text: str = Field(min_length=1, max_length=20_000)
    speaker: str | None = Field(default=None, max_length=120)
    sourceUrl: str | None = Field(default=None, max_length=2_000)
    timestampAccuracy: Literal["word", "segment", "approximate"] = "segment"

    @model_validator(mode="after")
    def end_after_start(self) -> TranscriptSegmentInput:
        if self.endMs <= self.startMs:
            raise ValueError("transcript segment endMs must be greater than startMs")
        return self


class GroundingClaimInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=140)
    text: str = Field(min_length=1, max_length=1_000)
    origin: Literal["direct_quote", "paraphrase", "ai_inference"] = "ai_inference"
    claimType: Literal["fact", "opinion", "experience", "estimate", "prediction", "unverified"] = "unverified"
    verificationStatus: Literal["supported", "mixed", "disputed", "insufficient"] = "insufficient"
    confidence: float = Field(default=0.35, ge=0, le=1)
    evidenceIds: list[str] = Field(default_factory=list, max_length=30)
    caveat: str | None = Field(default=None, max_length=600)


class EvidenceItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=140)
    sourceKind: Literal[
        "video_quote",
        "video_paraphrase",
        "video_visual",
        "comment",
        "related_video",
        "authority_source",
        "ai_inference",
        "user_input",
    ]
    sourceTitle: str = Field(min_length=1, max_length=300)
    sourceUrl: str | None = Field(default=None, max_length=2_000)
    sourceAuthor: str | None = Field(default=None, max_length=200)
    segmentId: str | None = Field(default=None, max_length=120)
    startMs: int | None = Field(default=None, ge=0, le=86_400_000)
    endMs: int | None = Field(default=None, gt=0, le=86_400_000)
    exactQuote: str | None = Field(default=None, max_length=20_000)
    excerpt: str | None = Field(default=None, max_length=20_000)
    relation: Literal["supports", "contradicts", "context", "boundary"] = "context"
    publishedAt: datetime | None = None
    retrievedAt: datetime | None = None
    credibilityGrade: Literal["A", "B", "C", "D"] = "D"
    credibilityScore: float = Field(default=0.2, ge=0, le=1)
    credibilityReasons: list[str] = Field(default_factory=list, max_length=20)


class BattleForumTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=100)
    speaker_name: str = Field(min_length=1, max_length=100)
    speaker_expert_id: str = Field(min_length=1, max_length=80)
    stance: Literal["support", "oppose", "swing"]
    text: str = Field(min_length=1, max_length=2000)
    target_turn_id: str | None = Field(default=None, max_length=100)
    evidence_claim_ids: list[str] = Field(default_factory=list, max_length=20)


class PersonalConditionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=36, max_length=36)
    dimension: Literal["current_situation", "goal", "constraint", "preference", "bottom_line"]
    label: str = Field(min_length=1, max_length=240)
    value: str = Field(min_length=1, max_length=2_000)
    source: Literal["user_entered", "ai_suggested_and_confirmed"]
    scope: Literal["persistent", "session_only"]
    is_reusable: bool
    is_sensitive: bool
    confirmed_at: datetime
    expires_at: datetime | None = None

    @field_validator("id")
    @classmethod
    def valid_condition_id(cls, value: str) -> str:
        uuid.UUID(value)
        return value


class PersonalizationAnswerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=140)
    question_id: str = Field(min_length=1, max_length=140)
    dimension: Literal["current_situation", "goal", "constraint", "preference", "bottom_line"]
    label: str = Field(min_length=1, max_length=240)
    value: str = Field(min_length=1, max_length=2_000)
    scope: Literal["persistent", "session_only"]
    is_sensitive: bool
    answered_at: datetime


class PersonalContextInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    profile_items: list[PersonalConditionInput] = Field(default_factory=list, max_length=80)
    session_answers: list[PersonalizationAnswerInput] = Field(default_factory=list, max_length=3)
    created_at: datetime

    @model_validator(mode="after")
    def unique_personal_context_ids(self) -> PersonalContextInput:
        profile_ids = [item.id for item in self.profile_items]
        answer_ids = [item.id for item in self.session_answers]
        if len(profile_ids) != len(set(profile_ids)) or len(answer_ids) != len(set(answer_ids)):
            raise ValueError("personal context IDs must be unique")
        return self


class DecisionEvidenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=180)
    source_type: Literal[
        "video_content",
        "comment_or_external",
        "user_provided",
        "ai_inference",
        "expert_opinion",
    ]
    summary: str = Field(min_length=1, max_length=2_000)
    source_label: str = Field(min_length=1, max_length=300)
    source_url: str | None = Field(default=None, max_length=2_000)
    time_range: str | None = Field(default=None, max_length=120)


class DecisionVideoContextInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_url: str | None = Field(default=None, max_length=2_000)
    title: str = Field(min_length=1, max_length=500)
    author: str | None = Field(default=None, max_length=200)
    summary: str = Field(min_length=1, max_length=4_000)
    claims: list[Annotated[str, Field(min_length=1, max_length=1_500)]] = Field(
        default_factory=list,
        max_length=50,
    )
    controversies: list[Annotated[str, Field(min_length=1, max_length=1_500)]] = Field(
        default_factory=list,
        max_length=30,
    )
    evidence: list[DecisionEvidenceInput] = Field(default_factory=list, max_length=180)
    has_verified_timestamps: bool = False

    @model_validator(mode="after")
    def timestamps_require_verified_source(self) -> DecisionVideoContextInput:
        evidence_ids = [item.id for item in self.evidence]
        if len(evidence_ids) != len(set(evidence_ids)):
            raise ValueError("decision evidence IDs must be unique")
        if not self.has_verified_timestamps and any(item.time_range for item in self.evidence):
            raise ValueError("unverified video context must not contain time ranges")
        return self


class DecisionContextMessageInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=180)
    speaker: str = Field(min_length=1, max_length=200)
    role: Literal["moderator", "user", "expert", "system"]
    text: str = Field(min_length=1, max_length=4_000)
    evidence_ids: list[str] = Field(default_factory=list, max_length=30)


class DecisionRoundtableContextInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    selected_experts: list[Annotated[str, Field(min_length=1, max_length=160)]] = Field(
        default_factory=list,
        max_length=12,
    )
    messages: list[DecisionContextMessageInput] = Field(default_factory=list, max_length=40)
    user_reactions: list[Annotated[str, Field(min_length=1, max_length=1_000)]] = Field(
        default_factory=list,
        max_length=30,
    )
    main_disagreements: list[Annotated[str, Field(min_length=1, max_length=1_500)]] = Field(
        default_factory=list,
        max_length=30,
    )
    battle_transcript: list[DecisionContextMessageInput] = Field(default_factory=list, max_length=24)


class PersonalizationQuestionsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    task_type: Literal["personalization_questions"]
    video_context: DecisionVideoContextInput
    personal_context: PersonalContextInput
    repair_attempt: bool = False


class DecisionBundleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    task_type: Literal["decision_bundle"]
    video_context: DecisionVideoContextInput
    personal_context: PersonalContextInput
    roundtable_context: DecisionRoundtableContextInput
    repair_attempt: bool = False


class TopicRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_url: str | None = Field(default=None, max_length=2000)
    aweme_id: str | None = Field(default=None, max_length=80)
    title: str | None = Field(default=None, max_length=300)
    author: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    transcript: str = Field(min_length=1, max_length=60_000)
    media_duration_ms: int | None = Field(default=None, ge=0, le=86_400_000)
    transcript_segments: list[TranscriptSegmentInput] = Field(
        default_factory=list,
        max_length=120,
    )
    sample_comments: list[Annotated[str, Field(min_length=1, max_length=500)]] = Field(
        default_factory=list, max_length=15
    )


class RoundtableReplyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(min_length=1, max_length=500)
    title: str = Field(default="", max_length=300)
    phase: Literal["stance", "rebuttal", "closing"]
    user_message: str = Field(default="继续圆桌讨论", max_length=2000)
    latest_interjection: str | None = Field(default=None, max_length=2000)
    latest_user_turn: RoundtableUserTurnInput | None = None
    source_claims: list[GroundingClaimInput | Annotated[str, Field(min_length=1, max_length=1_000)]] = Field(
        default_factory=list, max_length=20
    )
    evidence_items: list[EvidenceItemInput] = Field(default_factory=list, max_length=160)
    transcript_segments: list[TranscriptSegmentInput] = Field(default_factory=list, max_length=120)
    media_duration_ms: int = Field(default=0, ge=0, le=86_400_000)
    stance_ledger: list[str] = Field(default_factory=list, max_length=20)
    requested_turns: list[RoundtableRequestedTurn] = Field(min_length=1, max_length=3)
    conversation_history: list[ConversationMessage] = Field(default_factory=list, max_length=40)
    personal_context: PersonalContextInput | None = None


class BattleReplyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(min_length=1, max_length=500)
    expert_id: str = Field(min_length=1, max_length=80)
    persona_profile: dict[str, Any] = Field(default_factory=dict)
    user_stance: Literal["support", "oppose", "custom"]
    user_message: str = Field(min_length=1, max_length=2000)
    current_persuasion: float = Field(default=0.5, ge=0, le=1)
    target_forum_turn_id: str = Field(min_length=1, max_length=100)
    target_original_quote: str = Field(min_length=1, max_length=2000)
    source_claims: list[GroundingClaimInput] = Field(default_factory=list, max_length=20)
    evidence_items: list[EvidenceItemInput] = Field(default_factory=list, max_length=160)
    transcript_segments: list[TranscriptSegmentInput] = Field(default_factory=list, max_length=120)
    media_duration_ms: int = Field(default=0, ge=0, le=86_400_000)
    forum_turns: list[BattleForumTurn] = Field(min_length=1, max_length=12)
    cited_claim_ids: list[str] = Field(default_factory=list, max_length=20)
    user_forum_history: list[str] = Field(default_factory=list, max_length=20)
    user_influences: list[Annotated[str, Field(min_length=1, max_length=2_000)]] = Field(
        default_factory=list,
        max_length=40,
    )
    stance_ledger: list[str] = Field(default_factory=list, max_length=20)
    unresolved_attacks: list[str] = Field(default_factory=list, max_length=20)
    topic_memories: list[str] = Field(default_factory=list, max_length=20)
    personal_context: PersonalContextInput | None = None

    @field_validator("cited_claim_ids")
    @classmethod
    def unique_cited_claim_ids(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(values))


class BattleJudgeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(min_length=1, max_length=500)
    expert_id: str = Field(min_length=1, max_length=80)
    parent_job_id: uuid.UUID | None = None
    user_message: str = Field(min_length=1, max_length=2000)
    target_original_quote: str = Field(min_length=1, max_length=2000)
    cited_claims: list[BattleSourceClaim] = Field(default_factory=list, max_length=20)
    expert_reply: dict[str, Any]
    turns: list[ConversationMessage] = Field(min_length=2, max_length=40)


class AIResponse(BaseModel):
    job_id: uuid.UUID
    request_id: str
    action_type: str
    balance: int
    result: dict[str, Any]


class JobResponse(BaseModel):
    id: uuid.UUID
    action_type: str
    status: str
    progress: int
    result: dict[str, Any] | None
    error_code: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
