from __future__ import annotations

from datetime import datetime
from typing import Any

from .ai_provider import ProviderResult
from .errors import APIError
from .personalization import (
    decision_evidence_catalog,
    decision_risk_domains,
    personal_condition_ids,
)


def _invalid(message: str = "上游 AI 返回的业务结构不符合要求。") -> APIError:
    return APIError(502, "upstream_response_invalid", message)


def _object(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise _invalid()
    return value


def _nonempty_string(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise _invalid()
    return value.strip()


def _number(value: Any, *, minimum: float, maximum: float) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise _invalid()
    result = float(value)
    if result < minimum or result > maximum:
        raise _invalid()
    return result


def _string_list(value: Any, *, minimum_length: int = 0) -> list[str]:
    if not isinstance(value, list) or len(value) < minimum_length:
        raise _invalid()
    return [_nonempty_string(item) for item in value]


def _boolean(value: Any) -> bool:
    if not isinstance(value, bool):
        raise _invalid()
    return value


def _validate_grounding_claim(
    value: Any,
    *,
    evidence_by_id: dict[str, dict[str, Any]],
) -> str:
    claim = _object(value)
    claim_id = _nonempty_string(claim.get("id"))
    _nonempty_string(claim.get("text"))
    origin = _nonempty_string(claim.get("origin"))
    claim_type = _nonempty_string(claim.get("claimType"))
    verification = _nonempty_string(claim.get("verificationStatus"))
    if origin not in {"direct_quote", "paraphrase", "ai_inference"}:
        raise _invalid()
    if claim_type not in {
        "fact",
        "opinion",
        "experience",
        "estimate",
        "prediction",
        "unverified",
    }:
        raise _invalid()
    if verification not in {"supported", "mixed", "disputed", "insufficient"}:
        raise _invalid()
    _number(claim.get("confidence"), minimum=0, maximum=1)
    evidence_ids = _string_list(claim.get("evidenceIds") or [])
    if any(item not in evidence_by_id for item in evidence_ids):
        raise _invalid("上游 AI 引用了不存在的 evidenceId。")
    if origin == "direct_quote" and not any(
        evidence_by_id[item].get("sourceKind") == "video_quote" for item in evidence_ids
    ):
        raise _invalid("原话主张没有匹配的视频原话证据。")
    if claim_type == "fact" and not any(
        evidence_by_id[item].get("sourceKind")
        in {"video_quote", "video_paraphrase", "video_visual", "authority_source"}
        and evidence_by_id[item].get("relation") == "supports"
        for item in evidence_ids
    ):
        raise _invalid("事实主张没有合格的支持证据。")
    return claim_id


def _validate_evidence_pack(value: Any) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    pack = _object(value)
    duration = int(_number(pack.get("mediaDurationMs"), minimum=0, maximum=86_400_000))
    segments = pack.get("transcriptSegments")
    if not isinstance(segments, list):
        raise _invalid()
    segment_by_id: dict[str, dict[str, Any]] = {}
    for raw in segments:
        segment = _object(raw)
        segment_id = _nonempty_string(segment.get("id"))
        start = int(_number(segment.get("startMs"), minimum=0, maximum=86_400_000))
        end = int(_number(segment.get("endMs"), minimum=1, maximum=86_400_000))
        _nonempty_string(segment.get("text"))
        if segment_id in segment_by_id or end <= start or end > duration:
            raise _invalid("证据包包含非法或重复的转写片段。")
        segment_by_id[segment_id] = segment

    items = pack.get("evidenceItems")
    if not isinstance(items, list):
        raise _invalid()
    evidence_by_id: dict[str, dict[str, Any]] = {}
    for raw in items:
        item = _object(raw)
        item_id = _nonempty_string(item.get("id"))
        kind = _nonempty_string(item.get("sourceKind"))
        relation = _nonempty_string(item.get("relation"))
        if item_id in evidence_by_id or relation not in {
            "supports",
            "contradicts",
            "context",
            "boundary",
        }:
            raise _invalid()
        if kind == "comment":
            if item.get("credibilityGrade") not in {"C", "D"}:
                raise _invalid("评论证据不得获得 A/B 可信度。")
        if kind in {"video_quote", "video_paraphrase", "video_visual"}:
            segment_id = _nonempty_string(item.get("segmentId"))
            segment = segment_by_id.get(segment_id)
            if not segment:
                raise _invalid("视频证据没有对应的真实转写片段。")
            if item.get("startMs") != segment.get("startMs") or item.get("endMs") != segment.get("endMs"):
                raise _invalid("视频证据时间范围与转写片段不一致。")
        evidence_by_id[item_id] = item

    claims = pack.get("claims")
    if not isinstance(claims, list):
        raise _invalid()
    seen_claims: set[str] = set()
    for claim in claims:
        claim_id = _validate_grounding_claim(claim, evidence_by_id=evidence_by_id)
        if claim_id in seen_claims:
            raise _invalid()
        seen_claims.add(claim_id)
    return pack, evidence_by_id


def validate_provider_result(
    action_type: str,
    payload: dict[str, Any],
    provider_result: ProviderResult,
    *,
    allowed_persona_ids: set[str] | None = None,
) -> ProviderResult:
    result = _object(provider_result.result)
    if action_type == "roundtable_asr":
        _nonempty_string(result.get("transcript"))
    elif action_type == "roundtable_topic":
        validate_topic_result(
            result,
            allowed_persona_ids or set(),
            candidate_count=3 if payload.get("candidate_count") == 3 else 1,
        )
    elif action_type == "roundtable_reply":
        validate_roundtable_reply(result, payload)
    elif action_type == "battle_reply":
        validate_battle_reply(result, payload)
    elif action_type == "battle_judge":
        validate_battle_judge(result)
    elif action_type == "personalization_questions":
        validate_personalization_questions(result)
    elif action_type == "decision_bundle":
        validate_decision_bundle(result, payload)
    else:
        raise _invalid("服务器不支持该 AI 业务动作。")
    return provider_result


def validate_topic_result(
    result: dict[str, Any],
    allowed_persona_ids: set[str],
    *,
    candidate_count: int = 1,
) -> None:
    pack, evidence_by_id = _validate_evidence_pack(result.get("evidencePack"))
    digest = _object(result.get("sourceDigest"))
    _nonempty_string(digest.get("summary"))
    if _nonempty_string(digest.get("contentType")) not in {
        "review",
        "recommendation",
        "news",
        "opinion",
        "tutorial",
        "other",
    }:
        raise _invalid()
    claims = digest.get("claims")
    if not isinstance(claims, list) or not 4 <= len(claims) <= 7:
        raise _invalid()
    claim_ids: set[str] = set()
    for claim in claims:
        value = _object(claim)
        claim_id = _validate_grounding_claim(value, evidence_by_id=evidence_by_id)
        _nonempty_string(value.get("kind"))
        _nonempty_string(value.get("evidenceTimeRange"))
        if claim_id in claim_ids:
            raise _invalid()
        claim_ids.add(claim_id)
    if {_nonempty_string(item.get("id")) for item in pack.get("claims", [])} != claim_ids:
        raise _invalid("证据包与 sourceDigest 的主张集合不一致。")
    _string_list(digest.get("uncertainties") or [])
    _string_list(digest.get("transcriptNotes") or [])

    _validate_topic_bundle(result, claim_ids, allowed_persona_ids)
    alternatives = result.get("alternatives")
    if candidate_count == 3:
        if not isinstance(alternatives, list) or len(alternatives) != 2:
            raise _invalid("上游 AI 没有返回三个完整辩题方向。")
        bundles = [result] + [_object(value) for value in alternatives]
        titles_and_questions: set[tuple[str, str]] = set()
        for bundle in bundles:
            _nonempty_string(bundle.get("angleLabel"))
            _validate_topic_bundle(bundle, claim_ids, allowed_persona_ids)
            debate = _object(bundle.get("debate"))
            identity = (
                _nonempty_string(debate.get("title")).strip().casefold(),
                _nonempty_string(debate.get("question")).strip().casefold(),
            )
            if identity in titles_and_questions:
                raise _invalid("三个辩题方向不能重复。")
            titles_and_questions.add(identity)
    elif alternatives not in (None, []):
        if not isinstance(alternatives, list):
            raise _invalid()


def _validate_topic_bundle(
    result: dict[str, Any],
    claim_ids: set[str],
    allowed_persona_ids: set[str],
) -> None:

    debate = _object(result.get("debate"))
    for key in (
        "title",
        "question",
        "proposition",
        "targetAudience",
        "moderatorOpening",
        "conflictAxis",
    ):
        _nonempty_string(debate.get(key))
    _string_list(debate.get("decisionCriteria"), minimum_length=2)

    cast = result.get("cast")
    if not isinstance(cast, list) or len(cast) != 6:
        raise _invalid()
    cast_ids: set[str] = set()
    sides: list[str] = []
    for member in cast:
        value = _object(member)
        persona_id = _nonempty_string(value.get("personaId"))
        side = _nonempty_string(value.get("stance"))
        for key in ("displayName", "debateRole", "thesis", "weakPoint"):
            _nonempty_string(value.get(key))
        if allowed_persona_ids and persona_id not in allowed_persona_ids:
            raise _invalid("上游 AI 返回了服务器允许列表之外的专家角色。")
        if persona_id in cast_ids or side not in {"support", "oppose", "swing"}:
            raise _invalid()
        cast_ids.add(persona_id)
        sides.append(side)
        evidence_ids = value.get("evidenceClaimIds") or []
        if not isinstance(evidence_ids, list) or any(item not in claim_ids for item in evidence_ids):
            raise _invalid()
    if sides.count("support") < 2 or sides.count("oppose") < 2 or sides.count("swing") < 1:
        raise _invalid()

    opening = result.get("openingSequence")
    if not isinstance(opening, list) or len(opening) != 3:
        raise _invalid()
    expected_sides = ["support", "oppose", "swing"]
    for index, turn in enumerate(opening):
        value = _object(turn)
        persona_id = _nonempty_string(value.get("speakerPersonaId"))
        side = _nonempty_string(value.get("stance"))
        _nonempty_string(value.get("text"))
        _nonempty_string(value.get("shortQuote"))
        _nonempty_string(value.get("emotion"))
        _nonempty_string(value.get("tactic"))
        _nonempty_string(value.get("handoffQuestion"))
        if persona_id not in cast_ids or side != expected_sides[index]:
            raise _invalid()
        evidence_ids = value.get("evidenceClaimIds") or []
        if not isinstance(evidence_ids, list) or any(item not in claim_ids for item in evidence_ids):
            raise _invalid()

    plan = _object(result.get("roundPlan"))
    if plan.get("openingOrder") != ["support", "oppose", "swing"]:
        raise _invalid()
    _nonempty_string(plan.get("round2Goal"))
    _nonempty_string(plan.get("round3Goal"))


def validate_roundtable_reply(result: dict[str, Any], payload: dict[str, Any]) -> None:
    evidence_by_id = {
        _nonempty_string(_object(item).get("id")): _object(item) for item in payload.get("evidence_items", [])
    }
    turns = result.get("turns")
    requested = payload.get("requested_turns")
    valid_condition_ids = personal_condition_ids(payload)
    if not isinstance(turns, list) or not isinstance(requested, list) or len(turns) != len(requested):
        raise _invalid()
    latest_user_turn = payload.get("latest_user_turn")
    user_response_keys = (
        "respondedUserTurnId",
        "respondedUserQuote",
        "respondedUserClaim",
        "responseKind",
        "userImpact",
    )
    if latest_user_turn:
        user_turn = _object(latest_user_turn)
        first_requested = _object(requested[0])
        target_id = user_turn.get("target_expert_id")
        target_name = user_turn.get("target_expert_name")
        if target_id and target_id not in {
            first_requested.get("client_expert_id"),
            first_requested.get("expert_id"),
        }:
            raise _invalid("指定目标专家没有成为第一响应者。")
        if target_name and target_name != first_requested.get("expert_name"):
            raise _invalid("指定目标专家没有成为第一响应者。")

    for index, (expected, actual) in enumerate(zip(requested, turns, strict=True)):
        turn = _object(actual)
        expected_object = _object(expected)
        expected_id = _nonempty_string(expected_object.get("expert_id"))
        if _nonempty_string(turn.get("expertId")) != expected_id:
            raise _invalid()
        if _nonempty_string(turn.get("stance")) not in {"support", "oppose", "swing"}:
            raise _invalid()
        _nonempty_string(turn.get("text"))
        _nonempty_string(turn.get("shortQuote"))
        _nonempty_string(turn.get("emotion"))
        _nonempty_string(turn.get("tactic"))
        _nonempty_string(turn.get("memoryNote"))
        used_condition_ids = _string_list(turn.get("usedConditionIDs") or [])
        if any(item not in valid_condition_ids for item in used_condition_ids):
            raise _invalid("圆桌发言引用了未提供的个人条件。")
        if valid_condition_ids and not used_condition_ids:
            raise _invalid("个性化圆桌发言没有声明实际使用的个人条件。")
        if not valid_condition_ids and used_condition_ids:
            raise _invalid("通用圆桌发言不得虚构个人条件。")
        claims = turn.get("claims")
        if not isinstance(claims, list) or not claims:
            raise _invalid()
        for claim in claims:
            _validate_grounding_claim(claim, evidence_by_id=evidence_by_id)
        primary = _string_list(turn.get("primaryEvidenceIds") or [])
        if any(item not in evidence_by_id for item in primary):
            raise _invalid("圆桌发言引用了不存在的主证据。")
        _nonempty_string(turn.get("disclosure"))
        required_target_id = expected_object.get("required_target_id")
        if required_target_id and turn.get("targetExpertId") != required_target_id:
            raise _invalid()

        has_user_response = any(turn.get(key) is not None for key in user_response_keys)
        if not latest_user_turn:
            if has_user_response:
                raise _invalid("没有用户 Turn 时不得返回用户影响字段。")
            continue
        if index == 0 and not has_user_response:
            raise _invalid("第一响应者没有结构化回应该用户 Turn。")
        if not has_user_response:
            continue

        user_turn = _object(latest_user_turn)
        user_turn_id = _nonempty_string(user_turn.get("id"))
        user_text = _nonempty_string(user_turn.get("text"))
        if _nonempty_string(turn.get("respondedUserTurnId")) != user_turn_id:
            raise _invalid("专家回应了不存在或不匹配的 userTurnId。")
        responded_quote = _nonempty_string(turn.get("respondedUserQuote"))
        if responded_quote not in user_text or responded_quote not in _nonempty_string(turn.get("text")):
            raise _invalid("专家引用不是用户原文的真实连续子串。")
        if turn.get("respondedUserClaim") is not None:
            _nonempty_string(turn.get("respondedUserClaim"))
        if _nonempty_string(turn.get("responseKind")) not in {
            "acknowledge",
            "agree",
            "challenge",
            "qualify",
            "redirect",
        }:
            raise _invalid()

        impact = _object(turn.get("userImpact"))
        impact_kind = _nonempty_string(impact.get("impactKind"))
        if impact_kind not in {
            "noMaterialChange",
            "reframe",
            "agendaShift",
            "stanceShift",
            "newUnresolvedQuestion",
        }:
            raise _invalid()
        prior_stance = expected_object.get("prior_stance") or expected_object.get("side")
        stance_before = _nonempty_string(impact.get("stanceBefore"))
        stance_after = _nonempty_string(impact.get("stanceAfter"))
        if stance_before != prior_stance or stance_after != turn.get("stance"):
            raise _invalid("用户影响的前后立场与真实 Turn 不一致。")
        scores = {"oppose": -1.0, "swing": 0.0, "support": 1.0}
        stance_delta = _number(impact.get("stanceDelta"), minimum=-2, maximum=2)
        expected_delta = scores[stance_after] - scores[stance_before]
        if abs(stance_delta - expected_delta) > 0.001:
            raise _invalid("stanceDelta 与前后立场不一致。")
        prior_argument = expected_object.get("prior_argument") or expected_object.get("thesis")
        argument_before = _nonempty_string(impact.get("argumentBefore"))
        argument_after = _nonempty_string(impact.get("argumentAfter"))
        if prior_argument and argument_before != prior_argument:
            raise _invalid("用户影响的原主张与请求上下文不一致。")
        if argument_after != _nonempty_string(turn.get("shortQuote")):
            raise _invalid("用户影响的新主张与专家短主张不一致。")
        _nonempty_string(impact.get("reason"))
        _number(impact.get("confidence"), minimum=0, maximum=1)
        if impact_kind == "noMaterialChange":
            if (
                stance_before != stance_after
                or abs(stance_delta) > 0.001
                or argument_before != argument_after
            ):
                raise _invalid("noMaterialChange 却声称立场或主张发生变化。")
        elif impact_kind == "stanceShift":
            if stance_before == stance_after or abs(stance_delta) < 1 or argument_before == argument_after:
                raise _invalid("stanceShift 没有真实的立场与主张变化。")
        elif (
            stance_before != stance_after
            or abs(stance_delta) > 0.001
            or argument_before == argument_after
        ):
            raise _invalid("非立场变化的影响类型与前后字段冲突。")

        for claim in claims:
            claim_object = _object(claim)
            if (
                responded_quote in _nonempty_string(claim_object.get("text"))
                and claim_object.get("claimType") == "fact"
                and claim_object.get("verificationStatus") == "supported"
            ):
                raise _invalid("不得把用户观点自动当作已支持的外部事实。")


def validate_battle_reply(result: dict[str, Any], payload: dict[str, Any]) -> None:
    evidence_by_id = {
        _nonempty_string(_object(item).get("id")): _object(item) for item in payload.get("evidence_items", [])
    }
    _nonempty_string(result.get("replyText"))
    _nonempty_string(result.get("shortQuote"))
    _nonempty_string(result.get("respondedUserClaim"))
    _nonempty_string(result.get("unresolvedPoint"))
    _nonempty_string(result.get("memoryNote"))
    if _nonempty_string(result.get("stance")) not in {"support", "oppose", "swing"}:
        raise _invalid()
    _number(result.get("persuasionDelta"), minimum=-0.2, maximum=0.2)
    valid_condition_ids = personal_condition_ids(payload)
    used_condition_ids = _string_list(result.get("usedConditionIDs") or [])
    if any(item not in valid_condition_ids for item in used_condition_ids):
        raise _invalid("Battle 回复引用了未提供的个人条件。")
    if valid_condition_ids and not used_condition_ids:
        raise _invalid("个性化 Battle 回复没有声明实际使用的个人条件。")
    if not valid_condition_ids and used_condition_ids:
        raise _invalid("通用 Battle 回复不得虚构个人条件。")

    target_id = _nonempty_string(payload.get("target_forum_turn_id"))
    valid_turn_ids = {_nonempty_string(_object(turn).get("id")) for turn in payload.get("forum_turns", [])}
    responded = result.get("respondedForumTurnIds")
    if (
        not isinstance(responded, list)
        or target_id not in responded
        or any(item not in valid_turn_ids for item in responded)
    ):
        raise _invalid()

    valid_claim_ids = {
        _nonempty_string(_object(claim).get("id")) for claim in payload.get("source_claims", [])
    }
    evidence = result.get("evidenceClaimIds") or []
    if not isinstance(evidence, list) or any(item not in valid_claim_ids for item in evidence):
        raise _invalid()
    claims = result.get("claims")
    if not isinstance(claims, list) or not claims:
        raise _invalid()
    for claim in claims:
        _validate_grounding_claim(claim, evidence_by_id=evidence_by_id)
    primary = _string_list(result.get("primaryEvidenceIds") or [])
    if any(item not in evidence_by_id for item in primary):
        raise _invalid("Battle 回复引用了不存在的主证据。")
    _nonempty_string(result.get("disclosure"))


def validate_battle_judge(result: dict[str, Any]) -> None:
    for key in (
        "answeredConflict",
        "verifiableEvidence",
        "rebuttedOriginalPoint",
        "specificity",
        "logicalConsistency",
        "factualAlignment",
        "keywordStuffing",
    ):
        _number(result.get(key), minimum=0, maximum=1)
    _number(result.get("persuasionDelta"), minimum=-0.18, maximum=0.18)
    _nonempty_string(result.get("summary"))


def validate_personalization_questions(result: dict[str, Any]) -> None:
    if result.get("schemaVersion") != 1:
        raise _invalid("个性化问题版本无效。")
    questions = result.get("questions")
    if not isinstance(questions, list) or len(questions) > 3:
        raise _invalid("个性化问题数量必须为 0 到 3 个。")
    seen_questions: set[str] = set()
    valid_dimensions = {"current_situation", "goal", "constraint", "preference", "bottom_line"}
    valid_types = {"single_choice", "multiple_choice", "range", "quick_tags", "free_text"}
    for raw in questions:
        question = _object(raw)
        question_id = _nonempty_string(question.get("id"))
        if question_id in seen_questions:
            raise _invalid("个性化问题 ID 重复。")
        seen_questions.add(question_id)
        if _nonempty_string(question.get("dimension")) not in valid_dimensions:
            raise _invalid()
        _nonempty_string(question.get("text"))
        _nonempty_string(question.get("whyItMatters"))
        question_type = _nonempty_string(question.get("type"))
        if question_type not in valid_types:
            raise _invalid()
        _boolean(question.get("allowCustomAnswer"))
        if _nonempty_string(question.get("suggestedScope")) not in {"persistent", "session_only"}:
            raise _invalid()
        _boolean(question.get("sensitive"))
        options = question.get("options")
        if not isinstance(options, list) or len(options) > 12:
            raise _invalid()
        if question_type in {"single_choice", "multiple_choice", "quick_tags"} and not options:
            raise _invalid("选择类问题必须提供选项。")
        option_ids: set[str] = set()
        for raw_option in options:
            option = _object(raw_option)
            option_id = _nonempty_string(option.get("id"))
            _nonempty_string(option.get("label"))
            if option_id in option_ids:
                raise _invalid("个性化问题选项 ID 重复。")
            option_ids.add(option_id)


def _personal_context_lines(payload: dict[str, Any]) -> tuple[dict[str, str], set[str]]:
    values: dict[str, str] = {}
    lines: set[str] = set()
    personal = payload.get("personal_context") or {}
    for raw in personal.get("profile_items") or []:
        label = _nonempty_string(raw.get("label"))
        detail = _nonempty_string(raw.get("value"))
        line = label if label == detail else f"{label}：{detail}"
        values[_nonempty_string(raw.get("id"))] = line
        lines.add(line)
    for raw in personal.get("session_answers") or []:
        label = _nonempty_string(raw.get("label"))
        detail = _nonempty_string(raw.get("value"))
        line = detail if label == detail else f"{label}：{detail}"
        values[_nonempty_string(raw.get("id"))] = line
        values[_nonempty_string(raw.get("question_id"))] = line
        lines.add(line)
    return values, lines


def _validate_decision_evidence(
    value: Any,
    *,
    allowed: dict[str, dict[str, Any]],
) -> set[str]:
    if not isinstance(value, list) or not value:
        raise _invalid("决策卡必须包含可追溯证据。")
    seen: set[str] = set()
    for raw in value:
        item = _object(raw)
        item_id = _nonempty_string(item.get("id"))
        expected = allowed.get(item_id)
        if not expected or item_id in seen:
            raise _invalid("决策卡引用了不存在或重复的证据。")
        seen.add(item_id)
        if _nonempty_string(item.get("sourceType")) != expected["sourceType"]:
            raise _invalid("决策证据来源类型与原记录不一致。")
        if _nonempty_string(item.get("summary")) != expected["summary"]:
            raise _invalid("决策证据内容与原记录不一致。")
        if _nonempty_string(item.get("sourceLabel")) != expected["sourceLabel"]:
            raise _invalid("决策证据标签与原记录不一致。")
        if item.get("sourceURL") != expected["sourceURL"]:
            raise _invalid("决策证据来源地址与原记录不一致。")
        if item.get("timeRange") != expected["timeRange"]:
            raise _invalid("决策证据时间范围与原记录不一致。")
    return seen


def validate_decision_bundle(result: dict[str, Any], payload: dict[str, Any]) -> None:
    if result.get("schemaVersion") != 1:
        raise _invalid("决策包版本无效。")

    card = _object(result.get("decisionCard"))
    for key in ("id", "title", "conditionalConclusion", "disclaimer"):
        _nonempty_string(card.get(key))
    disclaimer = str(card.get("disclaimer"))
    risk_markers = {
        "health": ("医疗", "诊断"),
        "finance": ("投资", "不构成"),
        "legal": ("法律", "不替代"),
    }
    for domain in decision_risk_domains(payload):
        if not all(marker in disclaimer for marker in risk_markers[domain]):
            raise _invalid("高风险主题的决策卡缺少对应免责声明。")
    confidence = _object(card.get("confidence"))
    if _nonempty_string(confidence.get("level")) not in {"low", "medium", "high"}:
        raise _invalid()
    _nonempty_string(confidence.get("reason"))

    condition_lines, valid_profile_lines = _personal_context_lines(payload)
    if personal_condition_ids(payload) != set(condition_lines):
        raise _invalid("个人条件索引不一致。")
    profile_snapshot = _string_list(card.get("profileSnapshot") or [])
    if len(profile_snapshot) != len(set(profile_snapshot)) or set(profile_snapshot) != valid_profile_lines:
        raise _invalid("决策卡包含未提供的个人条件。")

    allowed_evidence = decision_evidence_catalog(payload)
    selected_evidence_ids = _validate_decision_evidence(
        card.get("evidence"),
        allowed=allowed_evidence,
    )
    video_evidence_ids = {
        _nonempty_string(item.get("id"))
        for item in (payload.get("video_context") or {}).get("evidence") or []
    }
    if video_evidence_ids and selected_evidence_ids.isdisjoint(video_evidence_ids):
        raise _invalid("决策卡没有引用任何视频来源证据。")
    if condition_lines and not any(item.startswith("personal:") for item in selected_evidence_ids):
        raise _invalid("决策卡没有把用户条件标记为用户本人提供。")
    discussion = payload.get("roundtable_context") or {}
    if (discussion.get("messages") or discussion.get("battle_transcript")) and not any(
        item.startswith("roundtable:") or item.startswith("battle:")
        for item in selected_evidence_ids
    ):
        raise _invalid("决策卡没有引用圆桌或 Battle 记录。")

    reasoning = card.get("reasoningLinks")
    if not isinstance(reasoning, list):
        raise _invalid()
    if condition_lines and not reasoning:
        raise _invalid("有个人条件时必须说明条件如何影响判断。")
    if not condition_lines and reasoning:
        raise _invalid("没有个人条件时不得虚构个性化推理链。")
    reasoning_ids: set[str] = set()
    linked_condition_lines: set[str] = set()
    for raw in reasoning:
        link = _object(raw)
        link_id = _nonempty_string(link.get("id"))
        condition_id = _nonempty_string(link.get("conditionID"))
        if link_id in reasoning_ids or condition_id not in condition_lines:
            raise _invalid("决策推理链引用了不存在的个人条件。")
        reasoning_ids.add(link_id)
        if _nonempty_string(link.get("condition")) != condition_lines[condition_id]:
            raise _invalid("决策推理链改写了用户条件。")
        linked_condition_lines.add(condition_lines[condition_id])
        _nonempty_string(link.get("impact"))
        if _nonempty_string(link.get("direction")) not in {"supports", "opposes", "neutral"}:
            raise _invalid()
        evidence_ids = _string_list(link.get("evidenceIDs") or [], minimum_length=1)
        if any(item not in selected_evidence_ids for item in evidence_ids):
            raise _invalid("推理链引用了决策卡中不存在的证据。")
    if linked_condition_lines != valid_profile_lines:
        raise _invalid("并非所有本次个人条件都进入了推理链。")

    boundaries = card.get("boundaries")
    if not isinstance(boundaries, list) or not 1 <= len(boundaries) <= 8:
        raise _invalid("决策卡必须包含适用边界。")
    boundary_ids: set[str] = set()
    for raw in boundaries:
        boundary = _object(raw)
        boundary_id = _nonempty_string(boundary.get("id"))
        if boundary_id in boundary_ids:
            raise _invalid()
        boundary_ids.add(boundary_id)
        for key in ("if", "then", "why"):
            _nonempty_string(boundary.get(key))

    _string_list(card.get("unknowns") or [], minimum_length=1)
    actions = card.get("actions")
    if not isinstance(actions, list) or len(actions) != 3:
        raise _invalid("决策卡必须包含三个下一步行动。")
    action_ids: set[str] = set()
    for raw in actions:
        action = _object(raw)
        action_id = _nonempty_string(action.get("id"))
        if action_id in action_ids:
            raise _invalid()
        action_ids.add(action_id)
        for key in ("title", "detail", "dueHint"):
            _nonempty_string(action.get(key))
        _boolean(action.get("canCreateTask"))
    _string_list(card.get("reviewTriggers") or [], minimum_length=1)

    role = _object(result.get("roleCard"))
    for key in (
        "id",
        "name",
        "description",
        "strength",
        "blindSpot",
        "nextAction",
        "relationToVideo",
        "impermanenceNotice",
    ):
        _nonempty_string(role.get(key))
    traits = _string_list(role.get("traits"), minimum_length=3)
    if len(traits) != 3 or len(set(traits)) != 3:
        raise _invalid("决策角色卡必须包含三个不同特征。")
    if "不代表永久人格" not in str(role.get("impermanenceNotice")):
        raise _invalid("决策角色卡缺少非永久人格说明。")

    candidates = result.get("memoryCandidates")
    if not isinstance(candidates, list) or len(candidates) > 8:
        raise _invalid()
    candidate_ids: set[str] = set()
    for raw in candidates:
        candidate = _object(raw)
        candidate_id = _nonempty_string(candidate.get("id"))
        if candidate_id in candidate_ids:
            raise _invalid()
        candidate_ids.add(candidate_id)
        if _nonempty_string(candidate.get("dimension")) not in {
            "current_situation",
            "goal",
            "constraint",
            "preference",
            "bottom_line",
        }:
            raise _invalid()
        for key in ("label", "value", "reason"):
            _nonempty_string(candidate.get(key))
        if _nonempty_string(candidate.get("origin")) not in {"explicit_user", "ai_inference"}:
            raise _invalid()
        _boolean(candidate.get("sensitive"))
        if candidate.get("suggestedExpiry") is not None:
            raw_expiry = _nonempty_string(candidate.get("suggestedExpiry"))
            try:
                datetime.fromisoformat(raw_expiry.replace("Z", "+00:00"))
            except ValueError as exc:
                raise _invalid("记忆候选有效期不是 ISO-8601 时间。") from exc
        if _boolean(candidate.get("defaultSelected")):
            raise _invalid("记忆候选不得默认选中。")
