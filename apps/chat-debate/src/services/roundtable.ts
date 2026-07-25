import type {
  Agent,
  AgentRuntimeState,
  ChatMessage,
  DiscussionVerdict,
  RoundtablePhase,
  Stance,
} from "@/types";
import type { ScheduledTurn } from "@/lib/turnSchedule";

interface OriginalTurn {
  expertId: string;
  expertName: string;
  targetExpertId?: string | null;
  targetExpertName?: string | null;
  stance: Stance;
  shortQuote: string;
  text: string;
  disclosure: string;
  primaryEvidenceIds?: string[];
  userImpact?: {
    argumentAfter: string;
    stanceAfter: Stance;
  } | null;
}

interface ReplyResponse {
  result: {
    phase: RoundtablePhase;
    turns: OriginalTurn[];
  };
  model: string;
  provider: string;
}

interface EvidenceDisplayItem {
  ownerName: string;
  kind: string;
  claim: string;
}

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

const VALIDATION_RETRY_DELAY_MS = 450;

export interface GenerateInput {
  topic: string;
  phase: RoundtablePhase;
  agents: Agent[];
  runtime: Record<string, AgentRuntimeState>;
  messages: ChatMessage[];
  userTurn?: {
    id: string;
    text: string;
    targetAgentId: string;
    targetAgentName: string;
  };
}

export interface GenerateOutput {
  messages: ChatMessage[];
  runtime: Record<string, AgentRuntimeState>;
  model: string;
}

interface RequestedSlot {
  agent: Agent;
  target: Agent | null;
  scheduledIndex?: number;
  thread?: ChatMessage["thread"];
}

export async function generateScheduledBatch(input: {
  topic: string;
  schedule: ScheduledTurn[];
  allAgents: Agent[];
  runtime: Record<string, AgentRuntimeState>;
  messages: ChatMessage[];
}): Promise<GenerateOutput> {
  if (!input.schedule.length) return { messages: [], runtime: input.runtime, model: "" };
  const phase = input.schedule[0].phase;
  if (input.schedule.some((turn) => turn.phase !== phase)) {
    throw new Error("同一生成批次不能跨越讨论阶段。");
  }
  return generateSlots({
    topic: input.topic,
    phase,
    slots: input.schedule.map((turn) => ({
      agent: turn.agent,
      target: turn.target,
      scheduledIndex: turn.index,
      thread: turn.thread,
    })),
    allAgents: input.allAgents,
    runtime: input.runtime,
    messages: input.messages,
  });
}

export async function generatePhase(input: GenerateInput): Promise<GenerateOutput> {
  const target = input.userTurn
    ? input.agents.find((agent) => agent.id === input.userTurn?.targetAgentId)
    : undefined;
  const slots: RequestedSlot[] = target
    ? [{ agent: target, target: null }]
    : input.agents.slice(0, 3).map((agent) => ({ agent, target: null }));
  return generateSlots({
    topic: input.topic,
    phase: input.phase,
    slots,
    allAgents: input.agents,
    runtime: input.runtime,
    messages: input.messages,
    userTurn: input.userTurn,
  });
}

export async function generateDiscussionVerdict(input: {
  topic: string;
  agents: Agent[];
  messages: ChatMessage[];
}): Promise<DiscussionVerdict> {
  const response = await fetch("/api/chat/discussion/verdict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: input.topic,
      agents: input.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
      })),
      messages: input.messages
        .filter((message) => message.role !== "system")
        .slice(-60)
        .map((message) => ({
          speakerId: message.speakerId,
          speakerName: message.speakerName,
          role: message.role,
          text: message.text,
          targetName: message.targetName ?? null,
          evidenceIds: message.evidenceIds ?? [],
        })),
    }),
  });
  const payload = await response.json().catch(() => ({})) as DiscussionVerdict & ErrorPayload;
  if (response.ok) return payload;
  throw new Error(payload.error?.message || "讨论结论暂时无法生成，请稍后重试。");
}

async function generateSlots(input: {
  topic: string;
  phase: RoundtablePhase;
  slots: RequestedSlot[];
  allAgents: Agent[];
  runtime: Record<string, AgentRuntimeState>;
  messages: ChatMessage[];
  userTurn?: GenerateInput["userTurn"];
}): Promise<GenerateOutput> {
  const evidenceCatalog = buildEvidenceCatalog(input.allAgents);
  const response = await postReply(input);
  let runtime = { ...input.runtime };
  const messages = response.result.turns.map((turn, index): ChatMessage => {
    const slot = input.slots[index];
    runtime = {
      ...runtime,
      [turn.expertId]: {
        stance: turn.userImpact?.stanceAfter ?? turn.stance,
        argument: turn.userImpact?.argumentAfter ?? turn.shortQuote,
      },
    };
    return {
      id: crypto.randomUUID(),
      speakerId: turn.expertId,
      speakerName: turn.expertName,
      role: "expert",
      text: naturalizeEvidenceText(
        normalizeSpokenText(turn.text),
        turn.primaryEvidenceIds ?? [],
        evidenceCatalog,
        turn.expertName,
      ),
      shortQuote: turn.shortQuote,
      stance: turn.stance,
      phase: input.phase,
      scheduledIndex: slot?.scheduledIndex,
      thread: slot?.thread,
      targetName: turn.targetExpertName,
      disclosure: turn.disclosure,
      evidenceIds: turn.primaryEvidenceIds ?? [],
      createdAt: new Date().toISOString(),
    };
  });
  return { messages, runtime, model: response.model };
}

async function postReply(input: {
  topic: string;
  phase: RoundtablePhase;
  slots: RequestedSlot[];
  allAgents: Agent[];
  runtime: Record<string, AgentRuntimeState>;
  messages: ChatMessage[];
  userTurn?: GenerateInput["userTurn"];
}): Promise<ReplyResponse> {
  const relevantAgentIds = new Set(input.slots.flatMap((slot) =>
    slot.target ? [slot.agent.id, slot.target.id] : [slot.agent.id],
  ));
  const evidenceItems = input.allAgents
    .filter((agent) => relevantAgentIds.has(agent.id))
    .flatMap((agent) => (agent.profile?.evidence ?? [])
        .filter((item) => item.visibility === "public" || item.visibility === "public_demo")
        .map((item) => ({
          id: item.id,
          sourceKind: "user_input",
          sourceTitle: `${agent.name} 的本人授权资料`,
          sourceAuthor: agent.name,
          sourceOwnerId: agent.id,
          sourceOwnerName: agent.name,
          exactQuote: item.claim,
          excerpt: item.claim,
          relation: item.kind === "boundary" ? "boundary" : "context",
          credibilityGrade: "C",
          credibilityScore: 0.5,
          credibilityReasons: ["user_supplied", "not_independently_verified"],
        })),
    );
  const requestedTurns = input.slots.map((slot, index) => {
    const agent = slot.agent;
    const prior = input.runtime[agent.id] ?? {
      stance: defaultStance(input.allAgents.indexOf(agent)),
      argument: agent.coreBelief.slice(0, 480),
    };
    const target = slot.target;
    return {
      expert_id: agent.id,
      client_expert_id: agent.id,
      expert_name: agent.name,
      side: prior.stance,
      role: agent.role,
      debate_role: phaseRole(input.phase, agent, target),
      thesis: prior.argument,
      weak_point: "哪些事实会改变当前判断，仍需在对话中验证。",
      prior_stance: prior.stance,
      prior_argument: prior.argument,
      required_target_id: input.userTurn && index === 0 ? null : target?.id ?? null,
      required_target_name: input.userTurn && index === 0 ? null : target?.name ?? null,
      persona_profile: agent.profile?.runtime ?? {},
    };
  });
  const request = {
    topic: input.topic,
    title: input.topic,
    phase: input.phase,
    user_message: input.userTurn?.text ?? "无",
    latest_interjection: input.userTurn?.text ?? null,
    latest_user_turn: input.userTurn
      ? {
          id: input.userTurn.id,
          sequence: input.messages.filter((message) => message.role === "user").length + 1,
          text: input.userTurn.text,
          intent: "free",
          target_expert_id: input.userTurn.targetAgentId,
          target_expert_name: input.userTurn.targetAgentName,
          modality: "text",
        }
      : null,
    source_claims: [],
    evidence_items: evidenceItems,
    transcript_segments: [],
    media_duration_ms: 0,
    stance_ledger: Object.entries(input.runtime).map(([id, state]) => `${id}: ${state.stance} | ${state.argument}`),
    requested_turns: requestedTurns,
    conversation_history: input.messages.slice(-40).map((message) => ({
      role: message.role === "user" ? "user" : message.role === "system" ? "moderator" : "expert",
      content: message.text.slice(0, 2000),
      expert_id: message.role === "expert" ? message.speakerId : null,
    })),
    personal_context: null,
  };

  const body = JSON.stringify({
    request,
    profiles: input.allAgents.flatMap((agent) => agent.profile ? [agent.profile] : []),
  });
  while (true) {
    const response = await fetch("/api/chat/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const payload = await response.json().catch(() => ({})) as ReplyResponse & ErrorPayload;
    if (response.ok) return payload;
    if (payload.error?.code === "upstream_response_invalid") {
      await delay(VALIDATION_RETRY_DELAY_MS);
      continue;
    }
    if (payload.error?.code === "upstream_ai_error" || payload.error?.code === "upstream_ai_rate_limited") {
      throw new Error("模型服务暂时不可用，之前的对话不会丢失。");
    }
    throw new Error(payload.error?.message || `对话服务异常（HTTP ${response.status}）`);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function defaultStance(index: number): Stance {
  return (["support", "oppose", "swing"] as const)[index % 3];
}

function phaseRole(phase: RoundtablePhase, agent: Agent, target: Agent | null): string {
  const targetRule = target
    ? `当前需要回应 ${target.name}，称呼对方时只使用这个显示名称，不自行添加“小、老、阿姨、老师、婶”等关系称呼。`
    : "当前不需要点名其他人，直接陈述自己的判断。";
  const naturalLanguageRule = `只用正常口语表达，只输出 ${agent.name} 本人会直接说出口的话。第一人称“我”始终只能代表 ${agent.name}（${agent.role}），绝不能切换成议题中的违法者、受害者、对手或其他被讨论对象；描述其他人的行为时必须明确说“对方”“当事人”或其显示名称。不得写“某某对着某某说/讲”“某某说道”等旁白，不得在正文前添加自己的姓名或角色标签。${targetRule}正文不得出现 Turn、阶段名、support/oppose/swing、选边、撤回编号、状态码或字段名；观点改变时直接说明改变的内容和原因。必须结合 RecentHistory 推进一个新的事实、条件、反驳或具体方案，不得照抄或近义复述自己或他人已经说过的整句。若使用个人资料证据，要把来源类型和内容自然写进句子，不要机械套用固定来源话术；不得输出 evidenceId、方括号编号、来源1、结论2或引用数量。`;
  if (phase === "stance") return `从自己的职业、经历和判断方式出发，提出独立的判断标准和处置重点；不要回应、赞同或改写前面任何人的开场。${naturalLanguageRule}`;
  if (phase === "rebuttal") return `准确回应指定对象并推进真实分歧。${naturalLanguageRule}`;
  return `说明最终判断、仍有的分歧和改变判断的条件。${naturalLanguageRule}`;
}

function normalizeSpokenText(text: string): string {
  return text
    .replace(/(?:选边|立场)\s*\d+\s*[、，,；;]?\s*撤回\s*\d+\s*[：:、，,；;]?/g, "我调整一下刚才的判断：")
    .replace(/(?:选边|立场)\s*\d+\s*[：:、，,；;]?/g, "")
    .replace(/撤回\s*\d+\s*[：:、，,；;]?/g, "我收回刚才的部分判断：")
    .replace(/\bTurn\s*\d+(?:\s*\/\s*\d+)?\b[：:、，,；;]?/gi, "")
    .replace(/\b(?:support|oppose|swing)\b[：:、，,；;]?/gi, "")
    .replace(/^[\s、，,；;：:]+/, "")
    .trim();
}

function buildEvidenceCatalog(agents: Agent[]): Map<string, EvidenceDisplayItem> {
  return new Map(agents.flatMap((agent) =>
    (agent.profile?.evidence ?? []).map((item) => [item.id, {
      ownerName: agent.name,
      kind: item.kind,
      claim: item.claim,
    }] as const),
  ));
}

function naturalizeEvidenceText(
  text: string,
  evidenceIds: string[],
  catalog: Map<string, EvidenceDisplayItem>,
  speakerName: string,
): string {
  const items = evidenceIds
    .map((id) => catalog.get(id))
    .filter((item): item is EvidenceDisplayItem => Boolean(item));
  const hadOpaqueMarker = evidenceIds.some((id) => text.includes(`[${id}]`))
    || /〔\s*\d+\s*〕|(?:来源|结论|引用)\s*\d+/u.test(text);

  let cleaned = evidenceIds.reduce(
    (value, id) => value.replaceAll(`[${id}]`, ""),
    text,
  )
    .replace(/〔\s*\d+\s*〕/gu, "")
    .replace(/(?:来源|结论|引用)\s*\d+\s*[、，,:：;；]?/gu, "")
    .replace(/\s+([，。！？；：])/gu, "$1")
    .replace(/([，、；：]){2,}/gu, "$1")
    .replace(/^[\s、，,；;：:]+/u, "")
    .trim();

  if (hadOpaqueMarker && items.length > 0 && !hasNaturalSourcePhrase(cleaned)) {
    cleaned = `${evidenceLead(items[0], speakerName)}${cleaned}`;
  }
  return cleaned;
}

function hasNaturalSourcePhrase(text: string): boolean {
  return /(?:个人问卷|本人提供|自述|尚未独立核验|确认的判断|资料中提到)/u.test(text);
}

function evidenceLead(item: EvidenceDisplayItem, speakerName: string): string {
  const owner = item.ownerName === speakerName ? "我" : item.ownerName;
  if (/value|principle|decision/u.test(item.kind)) {
    return `按${owner}在个人问卷中确认的判断标准，`;
  }
  if (/experience|achievement|project|story/u.test(item.kind)) {
    return `结合${owner}本人提供、尚未独立核验的经历，`;
  }
  if (/ability/u.test(item.kind)) {
    return `结合${owner}对自身能力的说明，`;
  }
  if (/current|matching/u.test(item.kind)) {
    return `根据${owner}在问卷中说明的当前情况，`;
  }
  if (/voice|interaction|expression/u.test(item.kind)) {
    return `按照${owner}确认的表达和互动偏好，`;
  }
  return `根据${owner}本人提供的资料，`;
}
