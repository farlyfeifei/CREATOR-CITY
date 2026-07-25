from __future__ import annotations

from typing import Any


def profile_to_roundtable_persona(profile: dict[str, Any]) -> dict[str, Any]:
    """Compile a Profile Pack into the persona shape consumed by Roundtable."""
    identity = profile.get("identity") or {}
    runtime = profile.get("runtime") or {}
    portrait = profile.get("portrait") or {}
    authorization = profile.get("authorization") or {}
    evidence = [
        item
        for item in profile.get("evidence") or []
        if item.get("visibility") in {"public", "public_demo"}
    ]
    evidence_catalog = "；".join(
        f"{item.get('id')}: {item.get('claim')}" for item in evidence[:16]
    )
    forbidden = "、".join(authorization.get("forbidden") or []) or "未授权隐私"
    must_escalate = "、".join(authorization.get("mustEscalate") or []) or "现实承诺"
    thinking_pattern = "；".join(runtime.get("thinkingPattern") or [])
    requirements = "；".join(runtime.get("responseRequirements") or [])

    # The original Roundtable core only understands its existing Persona fields.
    # Rich questionnaire dimensions are compressed into those fields here, without
    # changing the core prompt/validation code or exposing privateIdentity.
    abilities = portrait.get("abilities") or {}
    values = portrait.get("values") or {}
    interaction = portrait.get("interaction") or {}
    stories = portrait.get("stories") or {}
    interests = portrait.get("interests") or {}
    current = portrait.get("current") or {}
    expression = portrait.get("expression") or {}
    matching = portrait.get("matching") or {}

    portrait_belief = _section_text(
        ("确认能力", abilities.get("confirmed")),
        ("判断原则", values.get("principles")),
        ("效率与公平", values.get("efficiencyFairness")),
        ("收益与风险", values.get("gainRisk")),
        ("自由与稳定", values.get("freedomStability")),
        ("重大决定首看", values.get("firstDecisionFactor")),
        ("会改变观点的证据", values.get("changeEvidence")),
        ("故事带来的影响", stories.get("impact")),
        ("近期关注", interests.get("recentConcerns")),
        ("当前目标", current.get("goals")),
        limit=1400,
    )
    portrait_speech = _section_text(
        ("熟人描述", interaction.get("familiarDescription")),
        ("群体角色", interaction.get("groupRole")),
        ("讨论方式", interaction.get("discussionApproach")),
        ("幽默语速与常用表达", interaction.get("humorPacePhrases")),
        ("本人常用词", expression.get("commonWords")),
        ("本人不会使用", expression.get("forbiddenExpressions")),
        ("代理表达力度", expression.get("agentSharpness")),
        ("表达样本", (expression.get("samples") or [])[:3]),
        limit=1200,
    )
    portrait_debate = _section_text(
        ("被质疑时", interaction.get("challengedReaction")),
        ("表达不同意见", interaction.get("disagreementStyle")),
        ("欣赏的对手", interaction.get("admiredOpponents")),
        ("沟通雷区", interaction.get("angerTriggers")),
        ("不可交换底线", values.get("nonNegotiables")),
        limit=900,
    )
    current_boundary = _section_text(
        ("当前限制", current.get("constraints")),
        ("正在寻找", current.get("seeking")),
        ("明确不要的机会", current.get("unwantedOpportunities")),
        ("首次聊天判断重点", matching.get("firstChatJudgment")),
        limit=700,
    )

    return {
        "id": str(profile["id"]),
        "displayName": str(identity.get("displayName") or profile["id"]),
        "role": str(runtime.get("role") or identity.get("role") or "个人 Agent"),
        "category": "Personal Agent",
        "skillSourcePath": str(
            runtime.get("skillSourcePath") or f"profile://personal-agent/{profile['id']}"
        ),
        "coreBelief": _join_nonempty(
            runtime.get("coreBelief"),
            f"判断步骤：{thinking_pattern}" if thinking_pattern else "",
            portrait_belief,
        ),
        "speechStyle": _join_nonempty(
            runtime.get("speechStyle"),
            f"表达要求：{requirements}" if requirements else "",
            portrait_speech,
        ),
        "debateStyle": _join_nonempty(
            runtime.get("debateStyle") or "先回应，再给判断和适用边界。",
            portrait_debate,
        ),
        "agreementTriggers": runtime.get("agreementTriggers") or [],
        "disagreementTriggers": runtime.get("disagreementTriggers") or [],
        "catchphrases": runtime.get("catchphrases") or [],
        "groundingPolicy": _join_nonempty(
            runtime.get("groundingPolicy"),
            f"用户确认资料目录：{evidence_catalog}" if evidence_catalog else "没有可引用的个人事实资料。",
            current_boundary,
        ),
        "safetyNotes": _join_nonempty(
            runtime.get("safetyNotes"),
            f"禁止披露：{forbidden}。必须转交本人：{must_escalate}。",
        ),
        "defaultVoiceClipName": None,
        "battleBGMName": "battle",
        "highlightBGMName": None,
        "defaultRelationship": {"understanding": 3, "taming": 2, "consensus": 3},
    }


def _join_nonempty(*values: Any) -> str:
    return " ".join(str(value).strip() for value in values if str(value or "").strip())


def _section_text(*items: tuple[str, Any], limit: int) -> str:
    sections: list[str] = []
    for label, raw_value in items:
        values = _string_values(raw_value)
        if values:
            sections.append(f"{label}：{'；'.join(values)}")
    return _clip("。".join(sections), limit)


def _string_values(value: Any) -> list[str]:
    if isinstance(value, str):
        normalized = value.strip()
        return [normalized] if normalized else []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item or "").strip()]
    return []


def _clip(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return value[: max(0, limit - 1)].rstrip("；。 ") + "…"
