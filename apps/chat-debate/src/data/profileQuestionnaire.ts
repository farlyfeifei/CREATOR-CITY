import type { ProfileDraft } from "@/types";

export interface ProfileQuestionnaireField {
  key: keyof ProfileDraft;
  label: string;
  placeholder: string;
  multiline?: boolean;
  tall?: boolean;
  required?: boolean;
}

export interface ProfileQuestionnaireStep {
  title: string;
  description: string;
  fields: ProfileQuestionnaireField[];
}

const structuredExperience = "时间：\n当时在做什么：\n我的具体责任：\n结果：\n学到了什么：\n可验证材料/链接：";
const structuredProject = "要解决的问题：\n我实际做了什么：\n最困难的部分：\n可量化结果：\n团队成果与我的贡献：\n证据或链接：";

export const profileQuestionnaireSteps: ProfileQuestionnaireStep[] = [
  {
    title: "基本身份",
    description: "只填写愿意交给 Agent 使用的身份信息。",
    fields: [
      { key: "displayName", label: "显示名称", placeholder: "例如：林然", required: true },
      { key: "headline", label: "一句话介绍自己", placeholder: "用一句话说明你是谁、在做什么", required: true },
      { key: "role", label: "当前主要身份 / 职业", placeholder: "例如：产品经理、研究生、创业者", required: true },
      { key: "domains", label: "长期生活或工作的领域", placeholder: "每行一项", multiline: true },
      { key: "preferredName", label: "希望别人如何称呼你", placeholder: "称呼、昵称或沟通礼仪" },
      { key: "privateIdentity", label: "不希望公开的身份信息", placeholder: "只用于约束 Agent，不会进入公开证据", multiline: true },
    ],
  },
  {
    title: "经历时间线",
    description: "最多填写三段关键经历；不知道的部分可以留空，不要补写。",
    fields: [
      { key: "experience1", label: "经历 1", placeholder: structuredExperience, multiline: true, tall: true, required: true },
      { key: "experience2", label: "经历 2", placeholder: structuredExperience, multiline: true, tall: true },
      { key: "experience3", label: "经历 3", placeholder: structuredExperience, multiline: true, tall: true },
    ],
  },
  {
    title: "代表性成果",
    description: "区分团队结果和个人贡献，量化数据没有证据时请明确写“未核验”。",
    fields: [
      { key: "project1", label: "项目或作品 1", placeholder: structuredProject, multiline: true, tall: true, required: true },
      { key: "project2", label: "项目或作品 2", placeholder: structuredProject, multiline: true, tall: true },
      { key: "project3", label: "项目或作品 3", placeholder: structuredProject, multiline: true, tall: true },
    ],
  },
  {
    title: "能力画像",
    description: "能力必须尽量对应真实任务或材料。",
    fields: [
      { key: "strengths", label: "我确认擅长的能力", placeholder: "每行一项", multiline: true, required: true },
      { key: "strengthEvidence", label: "每项能力对应的实际证据", placeholder: "能力：对应经历、成果或链接", multiline: true },
      { key: "commonRequests", label: "别人经常找我解决的问题", placeholder: "每行一项", multiline: true },
      { key: "falseStrengths", label: "不擅长但容易被误认为擅长的事", placeholder: "说明误解和真实边界", multiline: true },
      { key: "learningAbilities", label: "正在学习的能力", placeholder: "每行一项", multiline: true },
      { key: "retiredAbilities", label: "已经过时或不再想使用的能力", placeholder: "每行一项", multiline: true },
    ],
  },
  {
    title: "价值观与判断方式",
    description: "这些内容决定 Agent 如何权衡，而不只是决定它支持什么。",
    fields: [
      { key: "principles", label: "最重要的 5 个原则", placeholder: "每行一项，按重要性排序", multiline: true, required: true },
      { key: "efficiencyFairness", label: "效率与公平冲突时如何选择", placeholder: "说明条件和边界", multiline: true },
      { key: "gainRisk", label: "收益与风险冲突时如何选择", placeholder: "说明可逆与不可逆风险", multiline: true },
      { key: "freedomStability", label: "自由与稳定冲突时如何选择", placeholder: "说明不同情境下的判断", multiline: true },
      { key: "firstDecisionFactor", label: "重大决定最先看什么", placeholder: "最先检查的变量、事实或底线", multiline: true },
      { key: "changeEvidence", label: "什么证据会让我改变观点", placeholder: "每行一项", multiline: true },
      { key: "nonNegotiables", label: "哪些底线不能交换", placeholder: "每行一项", multiline: true },
    ],
  },
  {
    title: "个性与互动方式",
    description: "用于还原真实的交流节奏、冲突反应和群体角色。",
    fields: [
      { key: "familiarDescription", label: "熟人通常如何描述我", placeholder: "尽量使用熟人的真实评价", multiline: true, required: true },
      { key: "groupRole", label: "我在群体中的典型角色", placeholder: "例如：推动者、协调者、质疑者", multiline: true },
      { key: "discussionApproach", label: "喜欢直接讨论还是逐步试探", placeholder: "说明通常的进入方式" },
      { key: "challengedReaction", label: "被质疑时的真实反应", placeholder: "先防御、追问、沉默还是验证", multiline: true },
      { key: "disagreementStyle", label: "我如何表达不同意见", placeholder: "措辞、顺序和力度", multiline: true },
      { key: "admiredOpponents", label: "我欣赏什么样的对手", placeholder: "哪些品质会让你认真倾听", multiline: true },
      { key: "angerTriggers", label: "什么沟通方式会激怒我", placeholder: "每行一项", multiline: true },
      { key: "humorPacePhrases", label: "幽默、语速和常用表达", placeholder: "幽默风格、句子长度、语速与口头禅", multiline: true },
    ],
  },
  {
    title: "人生故事",
    description: "故事用于解释现在的判断方式，不能被 Agent 当作外部已核验事实。",
    fields: [
      { key: "proudStory", label: "最骄傲的一次经历", placeholder: "发生了什么，为什么重要", multiline: true, tall: true, required: true },
      { key: "failureStory", label: "最重要的一次失败", placeholder: "失败、责任和后续改变", multiline: true, tall: true },
      { key: "valueChangingEvent", label: "一次改变价值观的事件", placeholder: "事件与前后变化", multiline: true, tall: true },
      { key: "minorityChoice", label: "一次与多数人意见不同的选择", placeholder: "当时的判断、代价与结果", multiline: true, tall: true },
      { key: "unresolvedConflict", label: "至今仍存在的矛盾或困惑", placeholder: "不要强行给出已经解决的答案", multiline: true, tall: true },
      { key: "storyImpact", label: "以上事件如何影响现在的我", placeholder: "对应到原则、行为和沟通方式", multiline: true, tall: true },
    ],
  },
  {
    title: "兴趣与关注",
    description: "区分长期投入、近期关注和短暂兴趣。",
    fields: [
      { key: "longTermInterests", label: "长期投入的兴趣", placeholder: "每行一项", multiline: true, required: true },
      { key: "recentConcerns", label: "最近持续关注的问题", placeholder: "每行一项", multiline: true },
      { key: "endlessTopics", label: "可以连续聊几个小时的话题", placeholder: "每行一项", multiline: true },
      { key: "temporaryInterests", label: "只是一时感兴趣的话题", placeholder: "每行一项", multiline: true },
      { key: "booksPeopleTheories", label: "喜欢或反对的书、人物、理论及原因", placeholder: "对象：喜欢或反对的原因", multiline: true, tall: true },
    ],
  },
  {
    title: "当前状态",
    description: "当前状态默认六个月后需要重新确认。",
    fields: [
      { key: "goals", label: "未来 6～12 个月最重要的目标", placeholder: "每行一项", multiline: true, required: true },
      { key: "constraints", label: "目前最大的限制", placeholder: "时间、能力、资源或现实责任", multiline: true },
      { key: "seeking", label: "正在寻找的人、机会或资源", placeholder: "每行一项", multiline: true },
      { key: "unwantedOpportunities", label: "明确不想要的机会", placeholder: "每行一项", multiline: true },
      { key: "availableCapacity", label: "当前可以投入的时间与精力", placeholder: "只写愿意用于匹配和协作判断的粒度", multiline: true },
      { key: "expiringInfo", label: "哪些信息半年后可能失效", placeholder: "每行一项", multiline: true },
    ],
  },
  {
    title: "匹配偏好",
    description: "用于判断共鸣、互补和不适配边界。",
    fields: [
      { key: "desiredPeople", label: "我希望认识什么样的人", placeholder: "每行一项", multiline: true, required: true },
      { key: "resonancePeople", label: "容易和我产生共鸣的人", placeholder: "价值观、经历或表达方式", multiline: true },
      { key: "complementaryPeople", label: "能和我形成互补的人", placeholder: "能力、资源或性格上的互补", multiline: true },
      { key: "unacceptableTraits", label: "无法接受的特征", placeholder: "每行一项", multiline: true },
      { key: "firstChatJudgment", label: "首次聊天重点判断什么", placeholder: "最先识别的信号和问题", multiline: true },
      { key: "commonalityVsComplement", label: "共同点和互补性哪个更重要", placeholder: "说明不同关系中的选择", multiline: true },
    ],
  },
  {
    title: "表达样本",
    description: "原话比抽象的“表达风格”更能还原一个人。",
    fields: [
      { key: "voiceSamples", label: "5～10 段原话、文章、帖子或聊天表达", placeholder: "每段之间空一行；请勿放入第三方隐私", multiline: true, tall: true, required: true },
      { key: "commonWords", label: "我经常使用的词", placeholder: "每行一项", multiline: true },
      { key: "forbiddenExpressions", label: "我绝不会使用的表达", placeholder: "每行一项", multiline: true },
      { key: "agentSharpness", label: "希望 Agent 比本人更克制、相同还是更锋利", placeholder: "说明期望程度和例外情况", multiline: true },
    ],
  },
  {
    title: "Agent 权限",
    description: "权限优先级高于人物模仿；禁止信息不会进入公开对话。",
    fields: [
      { key: "publicInfo", label: "可以公开的信息", placeholder: "每行一项", multiline: true, required: true },
      { key: "matchingOnly", label: "只能匹配时使用、不能直接展示的信息", placeholder: "每行一项", multiline: true },
      { key: "forbidden", label: "完全不能使用的信息", placeholder: "每行一项", multiline: true, required: true },
      { key: "mayAnswer", label: "Agent 可以代我回答的问题", placeholder: "每行一项", multiline: true },
      { key: "mayHypothesizeOnly", label: "只能提出假设、不能代答的问题", placeholder: "每行一项", multiline: true },
      { key: "mustEscalate", label: "必须转交本人回答的问题", placeholder: "每行一项", multiline: true, required: true },
      { key: "behaviorPermissions", label: "是否允许 Agent 主动拒绝、批评或承认不知道", placeholder: "例如：三项都允许；批评观点但不攻击个人", multiline: true },
    ],
  },
];
