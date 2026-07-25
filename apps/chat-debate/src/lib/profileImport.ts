import { profileQuestionnaireSteps } from "@/data/profileQuestionnaire";
import { emptyProfileDraft } from "@/lib/profileCompiler";
import type { ProfileDraft } from "@/types";

interface ImportFieldDefinition {
  key: keyof ProfileDraft;
  aliases: string[];
}

export interface ProfileImportMissingField {
  key: keyof ProfileDraft;
  label: string;
  stepIndex: number;
}

export interface ProfileImportResult {
  draft: ProfileDraft;
  recognizedFields: number;
  filledFields: number;
  missingRequired: ProfileImportMissingField[];
}

const importFields: ImportFieldDefinition[] = [
  { key: "displayName", aliases: ["显示名称"] },
  { key: "headline", aliases: ["一句话介绍自己"] },
  { key: "role", aliases: ["当前主要身份/职业", "当前主要身份 / 职业"] },
  { key: "domains", aliases: ["长期生活或工作的领域"] },
  { key: "preferredName", aliases: ["希望别人如何称呼你"] },
  { key: "privateIdentity", aliases: ["不希望公开的身份信息"] },
  { key: "experience1", aliases: ["经历1", "经历 1"] },
  { key: "experience2", aliases: ["经历2", "经历 2"] },
  { key: "experience3", aliases: ["经历3", "经历 3"] },
  { key: "project1", aliases: ["项目或作品1", "项目或作品 1"] },
  { key: "project2", aliases: ["项目或作品2", "项目或作品 2"] },
  { key: "project3", aliases: ["项目或作品3", "项目或作品 3"] },
  { key: "strengths", aliases: ["我确认擅长的能力"] },
  { key: "strengthEvidence", aliases: ["每项能力对应的实际证据"] },
  { key: "commonRequests", aliases: ["别人经常找我解决的问题"] },
  { key: "falseStrengths", aliases: ["我不擅长但容易被误认为擅长的事", "不擅长但容易被误认为擅长的事"] },
  { key: "learningAbilities", aliases: ["正在学习的能力"] },
  { key: "retiredAbilities", aliases: ["已经过时或不再想使用的能力"] },
  { key: "principles", aliases: ["最重要的5个原则", "最重要的 5 个原则"] },
  { key: "efficiencyFairness", aliases: ["当效率与公平冲突时，我通常如何选择", "效率与公平冲突时如何选择"] },
  { key: "gainRisk", aliases: ["当收益与风险冲突时", "收益与风险冲突时如何选择"] },
  { key: "freedomStability", aliases: ["当自由与稳定冲突时", "自由与稳定冲突时如何选择"] },
  { key: "firstDecisionFactor", aliases: ["我做重大决定时最先看什么", "重大决定最先看什么"] },
  { key: "changeEvidence", aliases: ["什么证据会让我改变观点"] },
  { key: "nonNegotiables", aliases: ["哪些底线不能交换"] },
  { key: "familiarDescription", aliases: ["熟人通常如何描述我"] },
  { key: "groupRole", aliases: ["我在群体中的典型角色"] },
  { key: "discussionApproach", aliases: ["我喜欢直接讨论还是逐步试探", "喜欢直接讨论还是逐步试探"] },
  { key: "challengedReaction", aliases: ["被质疑时的真实反应"] },
  { key: "disagreementStyle", aliases: ["我如何表达不同意见"] },
  { key: "admiredOpponents", aliases: ["我欣赏什么样的对手"] },
  { key: "angerTriggers", aliases: ["什么沟通方式会激怒我"] },
  { key: "humorPacePhrases", aliases: ["我的幽默、语速和常用表达", "幽默、语速和常用表达"] },
  { key: "proudStory", aliases: ["最骄傲的一次经历"] },
  { key: "failureStory", aliases: ["最重要的一次失败"] },
  { key: "valueChangingEvent", aliases: ["一次改变我价值观的事件", "一次改变价值观的事件"] },
  { key: "minorityChoice", aliases: ["一次与多数人意见不同的选择"] },
  { key: "unresolvedConflict", aliases: ["一个至今仍存在的矛盾或困惑", "至今仍存在的矛盾或困惑"] },
  { key: "storyImpact", aliases: ["以上事件分别如何影响了现在的我", "以上事件如何影响现在的我"] },
  { key: "longTermInterests", aliases: ["长期投入的兴趣"] },
  { key: "recentConcerns", aliases: ["最近持续关注的问题"] },
  { key: "endlessTopics", aliases: ["可以连续聊几个小时的话题"] },
  { key: "temporaryInterests", aliases: ["只是一时感兴趣的话题"] },
  { key: "booksPeopleTheories", aliases: ["喜欢或反对的书、人物、理论及原因"] },
  { key: "goals", aliases: ["未来6～12个月最重要的目标", "未来 6～12 个月最重要的目标", "未来6-12个月最重要的目标"] },
  { key: "constraints", aliases: ["目前最大的限制"] },
  { key: "seeking", aliases: ["正在寻找的人、机会或资源"] },
  { key: "unwantedOpportunities", aliases: ["明确不想要的机会"] },
  { key: "availableCapacity", aliases: ["当前可以投入的时间与精力"] },
  { key: "expiringInfo", aliases: ["哪些信息半年后可能失效"] },
  { key: "desiredPeople", aliases: ["我希望认识什么样的人"] },
  { key: "resonancePeople", aliases: ["容易和我产生共鸣的人"] },
  { key: "complementaryPeople", aliases: ["能和我形成互补的人"] },
  { key: "unacceptableTraits", aliases: ["无法接受的特征"] },
  { key: "firstChatJudgment", aliases: ["我希望Agent首次聊天重点判断什么", "我希望 Agent 首次聊天重点判断什么", "首次聊天重点判断什么"] },
  { key: "commonalityVsComplement", aliases: ["共同点和互补性哪个更重要"] },
  { key: "voiceSamples", aliases: ["提供5～10段你的原话、文章、帖子或聊天表达", "提供 5～10 段你的原话、文章、帖子或聊天表达", "5～10段原话、文章、帖子或聊天表达"] },
  { key: "commonWords", aliases: ["我经常使用的词"] },
  { key: "forbiddenExpressions", aliases: ["我绝不会使用的表达"] },
  { key: "agentSharpness", aliases: ["希望Agent的表达比本人更克制、相同还是更锋利", "希望 Agent 的表达比本人更克制、相同还是更锋利"] },
  { key: "publicInfo", aliases: ["可以公开的信息"] },
  { key: "matchingOnly", aliases: ["只能在匹配时使用、不能直接展示的信息", "只能匹配时使用、不能直接展示的信息"] },
  { key: "forbidden", aliases: ["完全不能使用的信息"] },
  { key: "mayAnswer", aliases: ["Agent可以代我回答的问题", "Agent 可以代我回答的问题"] },
  { key: "mayHypothesizeOnly", aliases: ["Agent只能提出假设、不能代答的问题", "Agent 只能提出假设、不能代答的问题"] },
  { key: "mustEscalate", aliases: ["必须转交本人回答的问题"] },
  { key: "behaviorPermissions", aliases: ["是否允许Agent主动拒绝、批评或承认不知道", "是否允许 Agent 主动拒绝、批评或承认不知道"] },
];

const sections = new Set(profileQuestionnaireSteps.map((step) => normalizeLabel(step.title)));
const aliasToKey = new Map<string, keyof ProfileDraft>();
for (const definition of importFields) {
  for (const alias of definition.aliases) aliasToKey.set(normalizeLabel(alias), definition.key);
}

const questionnaireFieldByKey = new Map(
  profileQuestionnaireSteps.flatMap((step, stepIndex) => step.fields.map((field) => [field.key, {
    label: field.label,
    required: Boolean(field.required),
    stepIndex,
  }] as const)),
);

export function parseProfileQuestionnaire(value: string): ProfileImportResult {
  const draft: ProfileDraft = { ...emptyProfileDraft };
  const recognized = new Set<keyof ProfileDraft>();
  let activeKey: keyof ProfileDraft | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!activeKey) return;
    const answer = trimBlankLines(buffer).join("\n").trim();
    if (answer) draft[activeKey] = answer;
    recognized.add(activeKey);
    buffer = [];
  };

  for (const rawLine of value.replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    const line = rawLine.replace(/\s+$/u, "");
    const candidate = stripMarkdownPrefix(line.trim());
    if (isSectionHeading(candidate)) {
      flush();
      activeKey = null;
      continue;
    }
    const separatorIndex = firstSeparatorIndex(candidate);
    if (separatorIndex >= 0) {
      const label = normalizeLabel(candidate.slice(0, separatorIndex));
      const key = aliasToKey.get(label);
      if (key) {
        flush();
        activeKey = key;
        const inlineAnswer = candidate.slice(separatorIndex + 1).trim();
        buffer = inlineAnswer ? [inlineAnswer] : [];
        continue;
      }
    }
    if (activeKey) buffer.push(line);
  }
  flush();

  const missingRequired: ProfileImportMissingField[] = [];
  for (const [key, field] of questionnaireFieldByKey) {
    if (field.required && !draft[key].trim()) {
      missingRequired.push({ key, label: field.label, stepIndex: field.stepIndex });
    }
  }

  return {
    draft,
    recognizedFields: recognized.size,
    filledFields: [...recognized].filter((key) => draft[key].trim()).length,
    missingRequired,
  };
}

function normalizeLabel(value: string): string {
  return stripMarkdownPrefix(value)
    .replace(/^\d+\s*[.、]\s*/u, "")
    .replace(/[\s，,。；;？?]/gu, "")
    .replace(/[/／]/gu, "/")
    .toLowerCase();
}

function stripMarkdownPrefix(value: string): string {
  return value
    .replace(/^#{1,6}\s*/u, "")
    .replace(/^[-*+]\s+/u, "")
    .trim();
}

function isSectionHeading(value: string): boolean {
  return sections.has(normalizeLabel(value));
}

function firstSeparatorIndex(value: string): number {
  const chinese = value.indexOf("：");
  const ascii = value.indexOf(":");
  if (chinese < 0) return ascii;
  if (ascii < 0) return chinese;
  return Math.min(chinese, ascii);
}

function trimBlankLines(values: string[]): string[] {
  let start = 0;
  let end = values.length;
  while (start < end && !values[start].trim()) start += 1;
  while (end > start && !values[end - 1].trim()) end -= 1;
  return values.slice(start, end);
}
