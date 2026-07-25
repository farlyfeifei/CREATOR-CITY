from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

VIDEO_KINDS = {"video_quote", "video_paraphrase", "video_visual"}
FACT_EVIDENCE_KINDS = VIDEO_KINDS | {"authority_source"}
CLAIM_ORIGINS = {"direct_quote", "paraphrase", "ai_inference"}
CLAIM_TYPES = {"fact", "opinion", "experience", "estimate", "prediction", "unverified"}
VERIFICATION_STATUSES = {"supported", "mixed", "disputed", "insufficient"}
RELATIONS = {"supports", "contradicts", "context", "boundary"}
TIMESTAMP_ACCURACIES = {"word", "segment", "approximate"}


def build_evidence_pack(payload: dict[str, Any]) -> dict[str, Any]:
    """Build system-owned evidence IDs without inventing time ranges."""
    source_url = _string(payload.get("source_url") or payload.get("sourceUrl"))
    source_title = _string(payload.get("title")) or "导入视频"
    source_author = _string(payload.get("author"))
    duration_ms = _integer(payload.get("media_duration_ms") or payload.get("mediaDurationMs"))
    raw_segments = payload.get("transcript_segments") or payload.get("transcriptSegments") or []
    segments: list[dict[str, Any]] = []
    seen_segment_ids: set[str] = set()
    for index, raw in enumerate(raw_segments):
        if not isinstance(raw, dict):
            continue
        segment_id = _string(raw.get("id")) or f"segment-system-{index + 1:03d}"
        start_ms = _integer(raw.get("start_ms") if "start_ms" in raw else raw.get("startMs"))
        end_ms = _integer(raw.get("end_ms") if "end_ms" in raw else raw.get("endMs"))
        text = _string(raw.get("text"))
        if (
            segment_id in seen_segment_ids
            or start_ms is None
            or end_ms is None
            or start_ms < 0
            or end_ms <= start_ms
            or not text
        ):
            continue
        if duration_ms is not None and end_ms > duration_ms:
            continue
        accuracy = _string(
            raw.get("timestamp_accuracy") if "timestamp_accuracy" in raw else raw.get("timestampAccuracy")
        )
        if accuracy not in TIMESTAMP_ACCURACIES:
            accuracy = "segment"
        seen_segment_ids.add(segment_id)
        segments.append(
            {
                "id": segment_id,
                "startMs": start_ms,
                "endMs": end_ms,
                "text": text,
                "speaker": _string(raw.get("speaker")),
                "sourceUrl": _string(raw.get("source_url") or raw.get("sourceUrl")) or source_url,
                "timestampAccuracy": accuracy,
            }
        )

    segments.sort(key=lambda value: (value["startMs"], value["endMs"], value["id"]))
    if duration_ms is None:
        duration_ms = max((segment["endMs"] for segment in segments), default=0)
    duration_ms = max(0, duration_ms)

    retrieved_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    evidence_items: list[dict[str, Any]] = []
    for index, segment in enumerate(segments):
        evidence_items.append(
            {
                "id": f"evidence-video-{index + 1:03d}",
                "sourceKind": "video_quote",
                "sourceTitle": source_title,
                "sourceUrl": source_url or segment.get("sourceUrl"),
                "sourceAuthor": source_author,
                "segmentId": segment["id"],
                "startMs": segment["startMs"],
                "endMs": segment["endMs"],
                "exactQuote": segment["text"],
                "excerpt": segment["text"],
                "relation": "supports",
                "publishedAt": None,
                "retrievedAt": retrieved_at,
                "credibilityGrade": "B",
                "credibilityScore": 0.84,
                "credibilityReasons": [
                    "primary_video_source",
                    "exact_quote_matched",
                    "word_timestamp" if segment["timestampAccuracy"] == "word" else "segment_timestamp",
                ],
            }
        )

    comments = [
        value.strip()
        for value in payload.get("sample_comments", [])
        if isinstance(value, str) and value.strip()
    ][:15]
    cluster_ids: dict[str, list[str]] = {
        "supports": [],
        "opposes": [],
        "adds_condition": [],
    }
    for index, comment in enumerate(comments):
        stance, relation = _comment_stance(comment)
        evidence_id = f"evidence-comment-{index + 1:03d}"
        cluster_ids[stance].append(evidence_id)
        evidence_items.append(
            {
                "id": evidence_id,
                "sourceKind": "comment",
                "sourceTitle": f"匿名社区观点样本 {index + 1}",
                "sourceUrl": source_url,
                "sourceAuthor": None,
                "segmentId": None,
                "startMs": None,
                "endMs": None,
                "exactQuote": None,
                "excerpt": comment,
                "relation": relation,
                "publishedAt": None,
                "retrievedAt": retrieved_at,
                "credibilityGrade": "C",
                "credibilityScore": 0.42,
                "credibilityReasons": [
                    "community_opinion_not_fact",
                    "engagement_not_credibility",
                ],
            }
        )

    evidence_items.append(
        {
            "id": "evidence-ai-inference",
            "sourceKind": "ai_inference",
            "sourceTitle": "像素圆桌 AI 推断",
            "sourceUrl": None,
            "sourceAuthor": "ClipClash AI",
            "segmentId": None,
            "startMs": None,
            "endMs": None,
            "exactQuote": None,
            "excerpt": "模型基于已提供材料形成的判断，不是视频原话。",
            "relation": "context",
            "publishedAt": None,
            "retrievedAt": retrieved_at,
            "credibilityGrade": "D",
            "credibilityScore": 0.20,
            "credibilityReasons": ["model_inference", "no_independent_source"],
        }
    )

    cluster_labels = {
        "supports": "支持",
        "opposes": "反对",
        "adds_condition": "补充条件",
    }
    comment_clusters = [
        {
            "id": f"comment-cluster-{stance}",
            "stance": stance,
            "summary": f"匿名评论中归为“{cluster_labels[stance]}”的观点样本。",
            "evidenceIds": ids,
            "disclaimer": "社区观点，不等于事实证明；互动量不代表可信度。",
        }
        for stance, ids in cluster_ids.items()
        if ids
    ]
    return {
        "schemaVersion": 1,
        "mediaDurationMs": duration_ms,
        "transcriptSegments": segments,
        "evidenceItems": evidence_items,
        "claims": [],
        "commentClusters": comment_clusters,
    }


def evidence_pack_from_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Rehydrate client-supplied system evidence, preserving only valid IDs and times."""
    base = build_evidence_pack(payload)
    supplied_items = payload.get("evidence_items") or payload.get("evidenceItems") or []
    if supplied_items:
        valid_segments = {segment["id"]: segment for segment in base["transcriptSegments"]}
        repaired_items: list[dict[str, Any]] = []
        seen_ids: set[str] = set()
        for raw in supplied_items:
            item = _normalize_evidence_item(raw, valid_segments, base["mediaDurationMs"])
            if not item or item["id"] in seen_ids:
                continue
            seen_ids.add(item["id"])
            repaired_items.append(item)
        if repaired_items:
            base["evidenceItems"] = repaired_items
    source_claims = payload.get("source_claims") or payload.get("sourceClaims") or []
    base["claims"] = sanitize_claims(source_claims, base)
    return base


def sanitize_topic_result(result: dict[str, Any], pack: dict[str, Any]) -> dict[str, Any]:
    digest = result.get("sourceDigest")
    if not isinstance(digest, dict):
        return result
    claims = sanitize_claims(digest.get("claims") or [], pack)
    digest["claims"] = claims
    pack["claims"] = claims
    result["sourceDigest"] = digest
    result["evidencePack"] = pack

    claim_ids = {claim["id"] for claim in claims}
    bundles = [result]
    alternatives = result.get("alternatives")
    if isinstance(alternatives, list):
        bundles.extend(value for value in alternatives if isinstance(value, dict))
    for bundle in bundles:
        for section_name in ("cast", "openingSequence"):
            values = bundle.get(section_name)
            if not isinstance(values, list):
                continue
            for value in values:
                if not isinstance(value, dict):
                    continue
                ids = value.get("evidenceClaimIds") or []
                value["evidenceClaimIds"] = [item for item in ids if item in claim_ids]
    return result


def sanitize_utterance_result(
    result: dict[str, Any],
    payload: dict[str, Any],
    *,
    list_key: str | None = None,
) -> dict[str, Any]:
    pack = evidence_pack_from_payload(payload)
    if list_key:
        values = result.get(list_key)
        if not isinstance(values, list):
            return result
    else:
        values = [result]

    for index, value in enumerate(values):
        if not isinstance(value, dict):
            continue
        claims = sanitize_claims(value.get("claims") or [], pack, prefix=f"utterance-{index + 1}")
        if not claims:
            text = _string(value.get("text") or value.get("replyText")) or "AI 发言"
            claims = [
                {
                    "id": f"utterance-{index + 1}-ai-inference",
                    "text": text[:300],
                    "origin": "ai_inference",
                    "claimType": "unverified",
                    "verificationStatus": "insufficient",
                    "confidence": 0.3,
                    "evidenceIds": [],
                    "caveat": "服务端未收到可核验的逐主张引用，已降级为 AI 推断。",
                    "kind": "unverified",
                    "evidenceTimeRange": "metadata",
                }
            ]
        valid_evidence_ids = {item["id"] for item in pack["evidenceItems"]}
        requested_primary = value.get("primaryEvidenceIds") or value.get("primary_evidence_ids") or []
        primary = [item for item in requested_primary if item in valid_evidence_ids]
        if not primary:
            primary = _unique([item for claim in claims for item in claim["evidenceIds"]])
        value["claims"] = claims
        value["primaryEvidenceIds"] = primary
        value["disclosure"] = _string(value.get("disclosure")) or (
            "引用只来自系统证据包；无匹配来源的内容已标为 AI 推断或证据不足。"
        )
    return result


def sanitize_claims(
    raw_claims: Any,
    pack: dict[str, Any],
    *,
    prefix: str = "claim",
) -> list[dict[str, Any]]:
    if not isinstance(raw_claims, list):
        return []
    evidence_by_id = {
        item["id"]: item
        for item in pack.get("evidenceItems", [])
        if isinstance(item, dict) and _string(item.get("id"))
    }
    output: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for index, raw in enumerate(raw_claims):
        if not isinstance(raw, dict):
            continue
        text = _string(raw.get("text") or raw.get("claim"))
        if not text:
            continue
        claim_id = _string(raw.get("id")) or f"{prefix}-{index + 1:02d}"
        if claim_id in seen_ids:
            claim_id = f"{prefix}-{index + 1:02d}"
        seen_ids.add(claim_id)
        origin = _string(raw.get("origin"))
        if origin not in CLAIM_ORIGINS:
            origin = "ai_inference"
        claim_type = _string(raw.get("claimType") or raw.get("claim_type") or raw.get("kind"))
        if claim_type == "source_claim" or claim_type == "promotion":
            claim_type = "unverified"
        if claim_type not in CLAIM_TYPES:
            claim_type = "unverified"
        verification = _string(raw.get("verificationStatus") or raw.get("verification_status"))
        if verification not in VERIFICATION_STATUSES:
            verification = "insufficient"
        confidence = _float(raw.get("confidence"), default=0.35)
        evidence_ids = raw.get("evidenceIds") or raw.get("evidence_ids") or []
        if not isinstance(evidence_ids, list):
            evidence_ids = []
        evidence_ids = _unique(
            [value for value in evidence_ids if isinstance(value, str) and value in evidence_by_id]
        )
        caveat = _string(raw.get("caveat"))

        exact_evidence = [
            evidence_by_id[value]
            for value in evidence_ids
            if evidence_by_id[value].get("sourceKind") == "video_quote"
            and _quote_matches(text, evidence_by_id[value].get("exactQuote"))
        ]
        if origin == "direct_quote" and not exact_evidence:
            origin = (
                "paraphrase"
                if any(evidence_by_id[value].get("sourceKind") in VIDEO_KINDS for value in evidence_ids)
                else "ai_inference"
            )
            caveat = _append_caveat(caveat, "主张文字未精确匹配视频原话，已降级来源标记。")

        qualifying_fact_evidence = any(
            evidence_by_id[value].get("sourceKind") in FACT_EVIDENCE_KINDS
            and evidence_by_id[value].get("relation") == "supports"
            for value in evidence_ids
        )
        if claim_type == "fact" and not qualifying_fact_evidence:
            claim_type = "unverified"
            verification = "insufficient"
            confidence = min(confidence, 0.35)
            caveat = _append_caveat(caveat, "缺少可验证事实来源，已降级为未经证实。")

        if not evidence_ids:
            origin = "ai_inference"
            verification = "insufficient"
            confidence = min(confidence, 0.45)
            caveat = _append_caveat(caveat, "当前没有可核对来源。")

        output.append(
            {
                "id": claim_id,
                "text": text[:1000],
                "origin": origin,
                "claimType": claim_type,
                "verificationStatus": verification,
                "confidence": round(min(1.0, max(0.0, confidence)), 4),
                "evidenceIds": evidence_ids,
                "caveat": caveat,
                "kind": claim_type,
                "evidenceTimeRange": _evidence_time_range(evidence_ids, evidence_by_id),
            }
        )
    return output


def _normalize_evidence_item(
    raw: Any,
    segments: dict[str, dict[str, Any]],
    media_duration_ms: int,
) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    item_id = _string(raw.get("id"))
    kind = _string(raw.get("sourceKind") or raw.get("source_kind"))
    if not item_id or kind not in VIDEO_KINDS | {
        "comment",
        "related_video",
        "authority_source",
        "ai_inference",
        "user_input",
    }:
        return None
    relation = _string(raw.get("relation"))
    if relation not in RELATIONS:
        relation = "context"
    segment_id = _string(raw.get("segmentId") or raw.get("segment_id"))
    start_ms = _integer(raw.get("startMs") if "startMs" in raw else raw.get("start_ms"))
    end_ms = _integer(raw.get("endMs") if "endMs" in raw else raw.get("end_ms"))
    exact_quote = _string(raw.get("exactQuote") or raw.get("exact_quote"))
    excerpt = _string(raw.get("excerpt"))
    segment = segments.get(segment_id or "")
    if kind in VIDEO_KINDS:
        if (
            not segment
            or start_ms != segment["startMs"]
            or end_ms != segment["endMs"]
            or start_ms is None
            or end_ms is None
            or start_ms < 0
            or end_ms > media_duration_ms
        ):
            return None
        if kind == "video_quote" and not _quote_matches(exact_quote or excerpt, segment["text"]):
            kind = "video_paraphrase"
            exact_quote = None
    else:
        segment_id = None
        start_ms = None
        end_ms = None
    source_url = _string(raw.get("sourceUrl") or raw.get("source_url"))
    source_author = _string(raw.get("sourceAuthor") or raw.get("source_author"))
    grade, score, reasons = _rating(
        kind,
        segment,
        has_complete_authority_metadata=bool(source_url and source_author),
    )
    return {
        "id": item_id,
        "sourceKind": kind,
        "sourceTitle": _string(raw.get("sourceTitle") or raw.get("source_title")) or "来源",
        "sourceUrl": source_url,
        "sourceAuthor": source_author,
        "segmentId": segment_id,
        "startMs": start_ms,
        "endMs": end_ms,
        "exactQuote": exact_quote,
        "excerpt": excerpt,
        "relation": relation,
        "publishedAt": raw.get("publishedAt") or raw.get("published_at"),
        "retrievedAt": raw.get("retrievedAt") or raw.get("retrieved_at"),
        "credibilityGrade": grade,
        "credibilityScore": score,
        "credibilityReasons": reasons,
    }


def _rating(
    kind: str,
    segment: dict[str, Any] | None,
    *,
    has_complete_authority_metadata: bool = False,
) -> tuple[str, float, list[str]]:
    if kind == "authority_source":
        if has_complete_authority_metadata:
            return (
                "A",
                0.92,
                [
                    "authority_identified",
                    "source_url_preserved",
                    "retrieval_time_recorded",
                ],
            )
        return "B", 0.76, ["authority_incomplete_metadata"]
    if kind == "video_quote":
        accuracy = (
            "word_timestamp" if segment and segment["timestampAccuracy"] == "word" else "segment_timestamp"
        )
        return "B", 0.84, ["primary_video_source", "exact_quote_matched", accuracy]
    if kind == "video_paraphrase":
        return "B", 0.72, ["primary_video_source", "paraphrase_not_verbatim"]
    if kind == "video_visual":
        return "B", 0.68, ["primary_video_visual", "ocr_or_visual_context"]
    if kind == "comment":
        return "C", 0.42, ["community_opinion_not_fact", "engagement_not_credibility"]
    if kind == "related_video":
        return "C", 0.55, ["secondary_video_context", "cross_source_review_required"]
    if kind == "user_input":
        return "C", 0.50, ["user_supplied", "not_independently_verified"]
    return "D", 0.20, ["model_inference", "no_independent_source"]


def _comment_stance(comment: str) -> tuple[str, str]:
    normalized = comment.lower()
    if any(value in normalized for value in ("但是", "除非", "前提", "如果", "条件", "看情况")):
        return "adds_condition", "boundary"
    if any(value in normalized for value in ("不认同", "反对", "不一定", "问题", "缺点", "风险", "太贵")):
        return "opposes", "contradicts"
    return "supports", "supports"


def _evidence_time_range(ids: list[str], evidence_by_id: dict[str, dict[str, Any]]) -> str:
    for value in ids:
        item = evidence_by_id[value]
        start_ms = item.get("startMs")
        end_ms = item.get("endMs")
        if isinstance(start_ms, int) and isinstance(end_ms, int):
            return f"{_timestamp(start_ms)}-{_timestamp(end_ms)}"
    return "metadata"


def _timestamp(milliseconds: int) -> str:
    seconds = max(0, milliseconds // 1000)
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def _quote_matches(left: Any, right: Any) -> bool:
    left_value = _normalize_quote(left)
    right_value = _normalize_quote(right)
    return bool(left_value and right_value and left_value in right_value)


def _normalize_quote(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", "", value).strip()


def _append_caveat(existing: str | None, addition: str) -> str:
    if not existing:
        return addition
    if addition in existing:
        return existing
    return f"{existing} {addition}"


def _string(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    return value.strip() or None


def _integer(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def _float(value: Any, *, default: float) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return default
    return float(value)


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))
