from __future__ import annotations

from typing import Any


def _context_summary(value: dict[str, Any]) -> str:
    label = str(value.get("label") or "").strip()
    detail = str(value.get("value") or "").strip()
    if not label:
        return detail
    if not detail or label == detail:
        return label
    return f"{label}：{detail}"


def _catalog_item(
    *,
    item_id: str,
    source_type: str,
    summary: str,
    source_label: str,
    source_url: str | None = None,
    time_range: str | None = None,
) -> dict[str, Any]:
    return {
        "id": item_id,
        "sourceType": source_type,
        "summary": summary,
        "sourceLabel": source_label,
        "sourceURL": source_url,
        "timeRange": time_range,
    }


def decision_evidence_catalog(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Build the only evidence records a decision bundle may return.

    IDs are derived from request-owned records. The provider can select records from
    this catalog, but cannot introduce an external source, timestamp, or personal fact.
    """

    catalog: dict[str, dict[str, Any]] = {}
    video = payload.get("video_context") or {}
    verified_timestamps = bool(video.get("has_verified_timestamps"))
    for raw in video.get("evidence") or []:
        item_id = str(raw.get("id") or "").strip()
        if not item_id or item_id in catalog:
            continue
        catalog[item_id] = _catalog_item(
            item_id=item_id,
            source_type=str(raw.get("source_type") or "ai_inference"),
            summary=str(raw.get("summary") or "").strip(),
            source_label=str(raw.get("source_label") or "来源记录").strip(),
            source_url=raw.get("source_url"),
            time_range=raw.get("time_range") if verified_timestamps else None,
        )

    personal = payload.get("personal_context") or {}
    for raw in personal.get("profile_items") or []:
        source_id = str(raw.get("id") or "").strip()
        if not source_id:
            continue
        item_id = f"personal:{source_id}"
        catalog[item_id] = _catalog_item(
            item_id=item_id,
            source_type="user_provided",
            summary=_context_summary(raw),
            source_label="用户确认的长期条件",
        )
    for raw in personal.get("session_answers") or []:
        source_id = str(raw.get("id") or "").strip()
        if not source_id:
            continue
        item_id = f"personal:{source_id}"
        catalog[item_id] = _catalog_item(
            item_id=item_id,
            source_type="user_provided",
            summary=_context_summary(raw),
            source_label="用户本次回答",
        )

    roundtable = payload.get("roundtable_context") or {}
    for collection, prefix in (("messages", "roundtable"), ("battle_transcript", "battle")):
        for raw in roundtable.get(collection) or []:
            source_id = str(raw.get("id") or "").strip()
            if not source_id:
                continue
            item_id = f"{prefix}:{source_id}"
            role = str(raw.get("role") or "")
            catalog[item_id] = _catalog_item(
                item_id=item_id,
                source_type="expert_opinion" if role == "expert" else "user_provided",
                summary=str(raw.get("text") or "").strip(),
                source_label="专家观点" if role == "expert" else "用户在讨论中的表达",
            )

    inference_id = "ai:decision-inference"
    catalog[inference_id] = _catalog_item(
        item_id=inference_id,
        source_type="ai_inference",
        summary="基于已提供条件与讨论记录形成的 AI 推断，不是新增事实。",
        source_label="AI 推断",
    )
    return catalog


def personal_condition_ids(payload: dict[str, Any]) -> set[str]:
    personal = payload.get("personal_context") or {}
    values: set[str] = set()
    for item in personal.get("profile_items") or []:
        if item.get("id"):
            values.add(str(item["id"]))
    for answer in personal.get("session_answers") or []:
        if answer.get("id"):
            values.add(str(answer["id"]))
        if answer.get("question_id"):
            values.add(str(answer["question_id"]))
    return values


def personal_condition_index(payload: dict[str, Any]) -> dict[str, str]:
    personal = payload.get("personal_context") or {}
    values: dict[str, str] = {}
    for item in personal.get("profile_items") or []:
        item_id = str(item.get("id") or "").strip()
        if item_id:
            values[item_id] = _context_summary(item)
    for answer in personal.get("session_answers") or []:
        line = _context_summary(answer)
        answer_id = str(answer.get("id") or "").strip()
        question_id = str(answer.get("question_id") or "").strip()
        if answer_id:
            values[answer_id] = line
        if question_id:
            values[question_id] = line
    return values


def decision_risk_domains(payload: dict[str, Any]) -> set[str]:
    video = payload.get("video_context") or {}
    parts = [video.get("title"), video.get("summary")]
    parts.extend(video.get("claims") or [])
    parts.extend(video.get("controversies") or [])
    text = " ".join(str(value or "") for value in parts).casefold()
    keyword_groups = {
        "health": {
            "医疗",
            "诊断",
            "疾病",
            "症状",
            "用药",
            "药物",
            "治疗",
            "手术",
            "抑郁",
            "焦虑症",
            "medical",
            "diagnosis",
            "treatment",
        },
        "finance": {
            "投资",
            "股票",
            "基金",
            "证券",
            "期货",
            "理财",
            "贷款",
            "房贷",
            "收益率",
            "年化",
            "加密货币",
            "币圈",
            "investment",
            "stock",
            "crypto",
        },
        "legal": {
            "法律",
            "诉讼",
            "合同纠纷",
            "刑事",
            "民事责任",
            "劳动仲裁",
            "legal advice",
            "lawsuit",
        },
    }
    return {
        domain
        for domain, keywords in keyword_groups.items()
        if any(keyword in text for keyword in keywords)
    }
