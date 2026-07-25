from __future__ import annotations

import hashlib
import math
import uuid
from dataclasses import dataclass
from typing import Any

SCORE_KEYS = ("understanding", "taming", "consensus")


def clamp(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    return min(upper, max(lower, value))


def score_level(score: float) -> int:
    return min(5, max(1, int(math.floor(clamp(score) / 20.0)) + 1))


def _unit(byte: int, *, lower: float, upper: float) -> float:
    return lower + (upper - lower) * (byte / 255.0)


def adaptation_profile(user_id: uuid.UUID, expert_id: str) -> dict[str, Any]:
    digest = hashlib.sha256(f"pixel-relationship-v1:{user_id}:{expert_id}".encode()).digest()
    weights = {
        "evidence": round(_unit(digest[0], lower=0.88, upper=1.14), 4),
        "logic": round(_unit(digest[1], lower=0.88, upper=1.14), 4),
        "challenge": round(_unit(digest[2], lower=0.88, upper=1.14), 4),
        "openness": round(_unit(digest[3], lower=0.88, upper=1.14), 4),
    }
    dominant = max(weights, key=weights.get)
    return {
        "version": 1,
        "weights": weights,
        "dominant_signal": dominant,
    }


def initial_scores(user_id: uuid.UUID, expert_id: str) -> dict[str, float]:
    digest = hashlib.sha256(f"pixel-relationship-baseline-v1:{user_id}:{expert_id}".encode()).digest()
    return {
        "understanding": round(42.0 + _unit(digest[0], lower=-4.0, upper=4.0), 2),
        "taming": round(30.0 + _unit(digest[1], lower=-4.0, upper=4.0), 2),
        "consensus": round(38.0 + _unit(digest[2], lower=-6.0, upper=6.0), 2),
    }


@dataclass(frozen=True)
class RelationshipImpact:
    before: dict[str, float]
    deltas: dict[str, float]
    after: dict[str, float]
    drivers: list[dict[str, Any]]


def _growth_scale(score: float, battle_count: int) -> float:
    saturation = max(0.34, 1.0 - clamp(score) / 135.0)
    novelty = max(0.58, 1.0 - min(max(battle_count, 0), 12) * 0.035)
    return saturation * novelty


def _signed_scaled(raw: float, score: float, battle_count: int) -> float:
    if raw >= 0:
        return raw * _growth_scale(score, battle_count)
    return raw * (0.82 + min(score, 100.0) / 500.0)


def compute_relationship_impact(
    *,
    before: dict[str, float],
    battle_count: int,
    profile: dict[str, Any],
    metrics: dict[str, Any],
) -> RelationshipImpact:
    weights = profile.get("weights") or {}
    evidence_weight = float(weights.get("evidence", 1.0))
    logic_weight = float(weights.get("logic", 1.0))
    challenge_weight = float(weights.get("challenge", 1.0))
    openness_weight = float(weights.get("openness", 1.0))

    answered = clamp(float(metrics["answered_conflict"]), 0, 1)
    evidence = clamp(float(metrics["verifiable_evidence"]), 0, 1)
    rebuttal = clamp(float(metrics["rebutted_original_point"]), 0, 1)
    specificity = clamp(float(metrics["specificity"]), 0, 1)
    logic = clamp(float(metrics["logical_consistency"]), 0, 1)
    factual = clamp(float(metrics["factual_alignment"]), 0, 1)
    stuffing = clamp(float(metrics["keyword_stuffing"]), 0, 1)
    persuasion = clamp(float(metrics["persuasion"]), 0, 1)
    openness = clamp(float(metrics["openness"]), 0, 1)
    rounds = min(5, max(1, int(metrics["rounds"])))
    used_evidence_count = min(30, max(0, int(metrics.get("used_evidence_count", 0))))
    result = str(metrics["result"])

    quality = clamp(
        answered * 0.24
        + evidence * 0.20
        + rebuttal * 0.20
        + specificity * 0.13
        + logic * 0.13
        + factual * 0.10
        - stuffing * 0.42,
        0,
        1,
    )
    engagement = min(1.0, rounds / 3.0)
    evidence_depth = min(1.0, used_evidence_count / 3.0)
    result_factor = {
        "win": 1.0,
        "expertSoftened": 0.68,
        "draw": 0.22,
        "lose": -0.18,
        "expertUnmoved": -0.32,
    }.get(result, 0.0)

    understanding_signal = (
        answered * 0.34
        + specificity * 0.19
        + logic * 0.27
        + factual * 0.20
    )
    understanding_raw = (
        0.55
        + 3.9 * understanding_signal * ((logic_weight + openness_weight) / 2)
        + 0.65 * engagement
        - 1.5 * stuffing
    )

    persuasion_signal = clamp((persuasion - 0.34) / 0.62, 0, 1)
    taming_signal = (
        quality * 0.26
        + rebuttal * 0.22
        + evidence * 0.18
        + persuasion_signal * 0.20
        + evidence_depth * 0.14
    )
    taming_raw = (
        0.18
        + 5.4 * taming_signal * ((challenge_weight + evidence_weight) / 2)
        + 1.65 * result_factor
        - 2.35 * stuffing
    )

    consensus_raw = (
        (persuasion - 0.5) * 5.0
        + (openness - 0.5) * 2.5
        + result_factor * 2.15
        + (0.85 if metrics.get("changed_side") else 0.0)
        - stuffing * 1.4
    ) * openness_weight

    raw = {
        "understanding": max(0.12, understanding_raw),
        "taming": max(-1.8, taming_raw),
        "consensus": max(-4.5, min(6.0, consensus_raw)),
    }
    deltas = {
        key: round(_signed_scaled(raw[key], float(before[key]), battle_count), 2)
        for key in SCORE_KEYS
    }
    after = {
        key: round(clamp(float(before[key]) + deltas[key]), 2)
        for key in SCORE_KEYS
    }

    drivers = [
        {
            "metric": "understanding",
            "label": "回应焦点与逻辑结构",
            "signal": round(understanding_signal, 3),
            "contribution": deltas["understanding"],
        },
        {
            "metric": "taming",
            "label": "证据、反驳与有效说服",
            "signal": round(taming_signal, 3),
            "contribution": deltas["taming"],
        },
        {
            "metric": "consensus",
            "label": "最终立场与开放度",
            "signal": round((persuasion + openness) / 2, 3),
            "contribution": deltas["consensus"],
        },
    ]
    if stuffing >= 0.25:
        drivers.append(
            {
                "metric": "all",
                "label": "关键词堆砌惩罚",
                "signal": round(stuffing, 3),
                "contribution": round(-stuffing * 1.4, 2),
            }
        )
    return RelationshipImpact(before=before, deltas=deltas, after=after, drivers=drivers)
