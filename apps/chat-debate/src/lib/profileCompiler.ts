import type {
  PersonalAgentPortrait,
  PersonalAgentProfile,
  ProfileDraft,
  ProfileEvidence,
} from "@/types";

export const emptyProfileDraft: ProfileDraft = {
  displayName: "",
  headline: "",
  role: "",
  domains: "",
  preferredName: "",
  privateIdentity: "",
  experience1: "",
  experience2: "",
  experience3: "",
  project1: "",
  project2: "",
  project3: "",
  strengths: "",
  strengthEvidence: "",
  commonRequests: "",
  falseStrengths: "",
  learningAbilities: "",
  retiredAbilities: "",
  principles: "",
  efficiencyFairness: "",
  gainRisk: "",
  freedomStability: "",
  firstDecisionFactor: "",
  changeEvidence: "",
  nonNegotiables: "",
  familiarDescription: "",
  groupRole: "",
  discussionApproach: "",
  challengedReaction: "",
  disagreementStyle: "",
  admiredOpponents: "",
  angerTriggers: "",
  humorPacePhrases: "",
  proudStory: "",
  failureStory: "",
  valueChangingEvent: "",
  minorityChoice: "",
  unresolvedConflict: "",
  storyImpact: "",
  longTermInterests: "",
  recentConcerns: "",
  endlessTopics: "",
  temporaryInterests: "",
  booksPeopleTheories: "",
  goals: "",
  constraints: "",
  seeking: "",
  unwantedOpportunities: "",
  availableCapacity: "",
  expiringInfo: "",
  desiredPeople: "",
  resonancePeople: "",
  complementaryPeople: "",
  unacceptableTraits: "",
  firstChatJudgment: "",
  commonalityVsComplement: "",
  voiceSamples: "",
  commonWords: "",
  forbiddenExpressions: "",
  agentSharpness: "",
  publicInfo: "",
  matchingOnly: "",
  forbidden: "密码、验证码、身份证件、精确住址、金融账户、第三方未授权隐私",
  mayAnswer: "",
  mayHypothesizeOnly: "",
  mustEscalate: "合同与资金、法律责任、线下见面、长期合作承诺",
  behaviorPermissions: "允许主动拒绝、批评观点并承认不知道；不得攻击个人。",
};

export function compileProfile(draft: ProfileDraft): PersonalAgentProfile {
  const now = new Date().toISOString();
  const id = `personal-${crypto.randomUUID()}`;
  const sourceId = `source-${crypto.randomUUID()}`;
  const timeline = compact(draft.experience1, draft.experience2, draft.experience3);
  const achievements = compact(draft.project1, draft.project2, draft.project3);
  const principles = lines(draft.principles).slice(0, 5);
  const goals = lines(draft.goals);
  const constraints = lines(draft.constraints);
  const seeking = lines(draft.seeking);
  const voiceSamples = paragraphs(draft.voiceSamples).slice(0, 10);
  const forbiddenExpressions = lines(draft.forbiddenExpressions);
  const evidence: ProfileEvidence[] = [];

  const addEvidence = (
    kind: string,
    claims: string[],
    visibility: ProfileEvidence["visibility"] = "public",
  ): string[] => claims.map((claim, index) => {
    const item: ProfileEvidence = {
      id: `${id}-${kind}-${index + 1}`,
      kind,
      claim,
      sourceRef: sourceId,
      confidence: "user_confirmed",
      visibility,
    };
    evidence.push(item);
    return item.id;
  });

  addEvidence("identity", compact(
    draft.headline,
    draft.role,
    lines(draft.domains).length ? `长期领域：${lines(draft.domains).join("、")}` : "",
    draft.preferredName ? `希望被称呼为：${draft.preferredName}` : "",
  ));
  const experienceRefs = addEvidence("experience", timeline);
  const projectRefs = addEvidence("achievement", achievements);
  addEvidence("ability", labeledClaims([
    ["确认擅长", draft.strengths],
    ["能力证据", draft.strengthEvidence],
    ["经常被请求解决", draft.commonRequests],
    ["容易被误解的能力", draft.falseStrengths],
    ["正在学习", draft.learningAbilities],
    ["不再使用", draft.retiredAbilities],
  ]));
  addEvidence("value", labeledClaims([
    ["重要原则", principles.join("；")],
    ["效率与公平", draft.efficiencyFairness],
    ["收益与风险", draft.gainRisk],
    ["自由与稳定", draft.freedomStability],
    ["重大决定首要因素", draft.firstDecisionFactor],
    ["改变观点的证据", draft.changeEvidence],
    ["不可交换底线", draft.nonNegotiables],
  ]));
  addEvidence("interaction", labeledClaims([
    ["熟人描述", draft.familiarDescription],
    ["群体角色", draft.groupRole],
    ["讨论方式", draft.discussionApproach],
    ["被质疑时", draft.challengedReaction],
    ["表达异议", draft.disagreementStyle],
    ["欣赏的对手", draft.admiredOpponents],
    ["沟通雷区", draft.angerTriggers],
    ["幽默语速与常用表达", draft.humorPacePhrases],
  ]));
  addEvidence("story", labeledClaims([
    ["最骄傲经历", draft.proudStory],
    ["重要失败", draft.failureStory],
    ["价值观改变事件", draft.valueChangingEvent],
    ["少数意见选择", draft.minorityChoice],
    ["未解决矛盾", draft.unresolvedConflict],
    ["故事对现在的影响", draft.storyImpact],
  ]));
  addEvidence("interest", labeledClaims([
    ["长期兴趣", draft.longTermInterests],
    ["近期关注", draft.recentConcerns],
    ["可长聊话题", draft.endlessTopics],
    ["短期兴趣", draft.temporaryInterests],
    ["书籍人物理论偏好", draft.booksPeopleTheories],
  ]));
  const currentRefs = addEvidence("current_context", labeledClaims([
    ["未来目标", draft.goals],
    ["当前限制", draft.constraints],
    ["正在寻找", draft.seeking],
    ["明确不要的机会", draft.unwantedOpportunities],
    ["可投入时间精力", draft.availableCapacity],
    ["可能过期的信息", draft.expiringInfo],
  ]));
  addEvidence("matching_preference", labeledClaims([
    ["希望认识的人", draft.desiredPeople],
    ["容易共鸣的人", draft.resonancePeople],
    ["互补的人", draft.complementaryPeople],
    ["不可接受特征", draft.unacceptableTraits],
    ["首次聊天判断重点", draft.firstChatJudgment],
    ["共同点与互补性", draft.commonalityVsComplement],
  ]));
  addEvidence("voice_sample", voiceSamples);
  addEvidence("expression_preference", labeledClaims([
    ["常用词", draft.commonWords],
    ["绝不使用的表达", draft.forbiddenExpressions],
    ["Agent 表达力度", draft.agentSharpness],
  ]));
  addEvidence("authorization_public", lines(draft.publicInfo));
  addEvidence("matching_only", lines(draft.matchingOnly), "matching_only");
  addEvidence("forbidden", lines(draft.forbidden), "forbidden");

  const portrait: PersonalAgentPortrait = {
    identity: {
      preferredName: draft.preferredName.trim(),
      privateIdentity: draft.privateIdentity.trim(),
    },
    timeline,
    achievements,
    abilities: {
      confirmed: lines(draft.strengths),
      evidence: lines(draft.strengthEvidence),
      commonRequests: lines(draft.commonRequests),
      falseStrengths: lines(draft.falseStrengths),
      learning: lines(draft.learningAbilities),
      retired: lines(draft.retiredAbilities),
    },
    values: {
      principles,
      efficiencyFairness: draft.efficiencyFairness.trim(),
      gainRisk: draft.gainRisk.trim(),
      freedomStability: draft.freedomStability.trim(),
      firstDecisionFactor: draft.firstDecisionFactor.trim(),
      changeEvidence: lines(draft.changeEvidence),
      nonNegotiables: lines(draft.nonNegotiables),
    },
    interaction: {
      familiarDescription: draft.familiarDescription.trim(),
      groupRole: draft.groupRole.trim(),
      discussionApproach: draft.discussionApproach.trim(),
      challengedReaction: draft.challengedReaction.trim(),
      disagreementStyle: draft.disagreementStyle.trim(),
      admiredOpponents: draft.admiredOpponents.trim(),
      angerTriggers: lines(draft.angerTriggers),
      humorPacePhrases: draft.humorPacePhrases.trim(),
    },
    stories: {
      proud: draft.proudStory.trim(),
      failure: draft.failureStory.trim(),
      valueChangingEvent: draft.valueChangingEvent.trim(),
      minorityChoice: draft.minorityChoice.trim(),
      unresolvedConflict: draft.unresolvedConflict.trim(),
      impact: draft.storyImpact.trim(),
    },
    interests: {
      longTerm: lines(draft.longTermInterests),
      recentConcerns: lines(draft.recentConcerns),
      endlessTopics: lines(draft.endlessTopics),
      temporary: lines(draft.temporaryInterests),
      booksPeopleTheories: draft.booksPeopleTheories.trim(),
    },
    current: {
      goals,
      constraints,
      seeking,
      unwantedOpportunities: lines(draft.unwantedOpportunities),
      availableCapacity: draft.availableCapacity.trim(),
      expiringInfo: lines(draft.expiringInfo),
    },
    matching: {
      desiredPeople: lines(draft.desiredPeople),
      resonancePeople: lines(draft.resonancePeople),
      complementaryPeople: lines(draft.complementaryPeople),
      unacceptableTraits: lines(draft.unacceptableTraits),
      firstChatJudgment: draft.firstChatJudgment.trim(),
      commonalityVsComplement: draft.commonalityVsComplement.trim(),
    },
    expression: {
      samples: voiceSamples,
      commonWords: lines(draft.commonWords),
      forbiddenExpressions,
      agentSharpness: draft.agentSharpness.trim(),
    },
    permissionNotes: {
      behaviorPermissions: draft.behaviorPermissions.trim(),
    },
  };

  const decisionPattern = compact(
    draft.firstDecisionFactor,
    draft.efficiencyFairness,
    draft.gainRisk,
    draft.freedomStability,
    draft.changeEvidence,
  );
  const speechStyle = compact(
    draft.humorPacePhrases,
    draft.disagreementStyle,
    draft.agentSharpness,
    lines(draft.commonWords).length ? `常用词：${lines(draft.commonWords).join("、")}` : "",
  ).join("；") || "自然、直接，先回应对方，再说明判断和边界。";
  const forbidden = unique([
    ...lines(draft.forbidden),
    ...(draft.privateIdentity.trim() ? ["用户在基本身份中标记为不公开的身份信息"] : []),
  ]);
  const mustEscalate = lines(draft.mustEscalate);
  const behaviorPermissions = draft.behaviorPermissions.trim();

  return {
    schemaVersion: 1,
    id,
    source: {
      id: sourceId,
      kind: "questionnaire",
      label: "用户本人填写的 12 模块 Personal Agent 问卷",
      verification: "user_confirmed_self_report",
      createdAt: now,
    },
    disclaimer: {
      fictionalSample: false,
      aiProxy: true,
      notRealPerson: false,
      shortLabel: "AI 代理 · 本人授权资料",
      details: "该 Agent 依据用户本人填写的问卷运行，不等于本人；超出资料与授权范围时必须承认不知道或转交本人。",
    },
    identity: {
      displayName: draft.displayName.trim(),
      aliases: lines(draft.preferredName),
      headline: draft.headline.trim(),
      role: draft.role.trim(),
      domain: lines(draft.domains),
      locationGranularity: "",
    },
    runtime: {
      role: draft.role.trim() || "个人 Agent",
      category: "Personal Agent",
      skillSourcePath: `profile://personal-agent/${id}`,
      coreBelief: principles.length
        ? `做判断时优先遵守：${principles.join("；")}。重大权衡：${decisionPattern.join("；")}`
        : "基于已确认事实表达，不替本人虚构立场。",
      attentionPriorities: unique([
        ...principles,
        ...lines(draft.recentConcerns),
        ...goals,
        ...lines(draft.firstChatJudgment),
      ]).slice(0, 12),
      thinkingPattern: decisionPattern.length
        ? decisionPattern
        : ["先确认事实与目标", "再比较约束和代价", "最后说明结论的适用边界"],
      speechStyle,
      debateStyle: compact(
        draft.discussionApproach,
        draft.challengedReaction,
        draft.disagreementStyle,
        draft.admiredOpponents,
      ).join("；") || "先准确复述对方主张，再指出分歧、反例与改变立场的条件。",
      agreementTriggers: unique([...principles, ...lines(draft.changeEvidence)]),
      disagreementTriggers: unique([...lines(draft.angerTriggers), ...lines(draft.unacceptableTraits)]),
      catchphrases: unique([...lines(draft.commonWords), ...voiceSamples.slice(0, 3)]).slice(0, 8),
      responseRequirements: unique([
        "只把用户确认的问卷内容当作个人事实。",
        "没有资料支撑时明确说不知道，不补写人生经历。",
        "每个判断至少说明一个现实约束或改变立场的条件。",
        "不得声称自己就是用户本人，应保持 AI 代理身份。",
        ...forbiddenExpressions.map((item) => `不得使用表达：${item}`),
        behaviorPermissions ? `行为权限：${behaviorPermissions}` : "",
      ]).filter(Boolean),
      groundingPolicy: "个人事实只能引用本 Profile Pack 中的公开 evidence ID；仅匹配和禁止信息不得进入公开对话，未覆盖内容标为 AI 推断且证据不足。",
      safetyNotes: `不得披露：${forbidden.join("、") || "未授权隐私"}。`,
    },
    evidence,
    portrait,
    experiences: timeline.map((summary, index) => ({
      id: `${id}-xp-${index + 1}`,
      period: structuredValue(summary, "时间") || "用户未提供结构化时间",
      summary,
      evidenceRefs: [experienceRefs[index]],
    })),
    projects: achievements.map((summary, index) => ({
      id: `${id}-project-${index + 1}`,
      summary,
      evidenceRefs: [projectRefs[index]],
    })),
    currentContext: {
      status: compact(draft.availableCapacity, draft.expiringInfo),
      goals,
      constraints,
      seeking,
      expiresAfter: "P6M",
      evidenceRefs: currentRefs,
    },
    authorization: {
      public: lines(draft.publicInfo),
      matchingOnly: lines(draft.matchingOnly),
      forbidden,
      mayAnswer: lines(draft.mayAnswer),
      mayHypothesizeOnly: lines(draft.mayHypothesizeOnly),
      mustEscalate,
      mayRefuse: !explicitlyDisallows(behaviorPermissions, "拒绝"),
      mayCriticize: !explicitlyDisallows(behaviorPermissions, "批评"),
      mustAdmitUnknown: !explicitlyDisallows(behaviorPermissions, "承认不知道"),
    },
  };
}

export function lines(value: string): string[] {
  return value
    .split(/\r?\n|[；;]/u)
    .map((item) => item.replace(/^[-*\d.、\s]+/u, "").trim())
    .filter(Boolean);
}

function paragraphs(value: string): string[] {
  return value
    .split(/\r?\n\s*\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compact(...values: Array<string | undefined>): string[] {
  return values.map((value) => value?.trim() ?? "").filter(Boolean);
}

function labeledClaims(items: Array<[string, string]>): string[] {
  return items.flatMap(([label, value]) => {
    const normalized = value.trim();
    return normalized ? [`${label}：${normalized}`] : [];
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function structuredValue(block: string, label: string): string {
  const match = block.match(new RegExp(`(?:^|\\n)${label}[：:]\\s*([^\\n]+)`, "u"));
  return match?.[1]?.trim() ?? "";
}

function explicitlyDisallows(value: string, action: string): boolean {
  return new RegExp(`(?:不允许|禁止)[^。；\\n]*${action}|${action}[^。；\\n]*(?:不允许|禁止)`, "u").test(value);
}
