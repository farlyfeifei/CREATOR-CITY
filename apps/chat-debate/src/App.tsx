import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  Award,
  Bot,
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  MessageCircleMore,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { ProfileWizard } from "@/components/ProfileWizard";
import { profileToAgent, roundtableAgents, sampleProfile, sampleProfiles } from "@/data/agents";
import { compileProfile } from "@/lib/profileCompiler";
import { buildOriginalTurnSchedule, type ScheduledTurn } from "@/lib/turnSchedule";
import { generateDiscussionVerdict, generatePhase, generateScheduledBatch } from "@/services/roundtable";
import type {
  Agent,
  AgentRuntimeState,
  ChatMessage,
  DiscussionVerdict,
  PersonalAgentProfile,
  ProfileDraft,
  RoundtablePhase,
} from "@/types";

const STORAGE_KEY = "agent-group-chat.personal-profiles.v1";
export function App() {
  const [savedProfiles, setSavedProfiles] = useState<PersonalAgentProfile[]>(loadProfiles);
  const personalAgents = useMemo(
    () => [...sampleProfiles.map(profileToAgent), ...savedProfiles.map(profileToAgent)],
    [savedProfiles],
  );
  const allAgents = useMemo(() => [...personalAgents, ...roundtableAgents], [personalAgents]);
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "claude", "doubao", "zhangyiming", "lin-ran", "meng-yuxuan", "li-minghan",
  ]);
  const [topicDraft, setTopicDraft] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [view, setView] = useState<"setup" | "chat">("setup");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runtime, setRuntime] = useState<Record<string, AgentRuntimeState>>({});
  const [schedule, setSchedule] = useState<ScheduledTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgentId, setLoadingAgentId] = useState("");
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const [composer, setComposer] = useState("");
  const [replyTargetId, setReplyTargetId] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const [verdict, setVerdict] = useState<DiscussionVerdict | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const generationLockRef = useRef(false);
  const verdictLockRef = useRef(false);
  const sessionIdRef = useRef(0);
  const failedUserReplyRef = useRef<FailedUserReply | null>(null);

  const selectedAgents = useMemo(
    () => selectedIds.map((id) => allAgents.find((agent) => agent.id === id)).filter((agent): agent is Agent => Boolean(agent)),
    [allAgents, selectedIds],
  );
  const turnCount = messages.filter((message) => message.scheduledIndex !== undefined).length;
  const activePhase = schedule[Math.max(0, turnCount - 1)]?.phase ?? null;

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, verdict, verdictLoading]);

  useEffect(() => {
    if (!replyTargetId && selectedAgents[0]) setReplyTargetId(selectedAgents[0].id);
  }, [replyTargetId, selectedAgents]);

  const toggleAgent = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.length > 2 ? current.filter((value) => value !== id) : current;
      return current.length < 6 ? [...current, id] : current;
    });
  };

  const saveProfile = (draft: ProfileDraft) => {
    const profile = compileProfile(draft);
    const next = [...savedProfiles, profile];
    setSavedProfiles(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelectedIds((current) => [...current.filter((id) => id !== sampleProfile.id), profile.id].slice(0, 6));
    setReplyTargetId(profile.id);
    setWizardOpen(false);
  };

  const removeProfile = (id: string) => {
    const next = savedProfiles.filter((profile) => profile.id !== id);
    setSavedProfiles(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelectedIds((current) => current.filter((value) => value !== id));
  };

  const startChat = () => {
    const topic = topicDraft.trim();
    if (!topic || selectedAgents.length < 2 || selectedAgents.length > 6 || generationLockRef.current) return;
    const originalSchedule = buildOriginalTurnSchedule(selectedAgents);
    const systemMessage: ChatMessage = {
      id: crypto.randomUUID(),
      speakerId: "moderator",
      speakerName: "群助手",
      role: "system",
      text: `群聊已创建 · 议题：${topic}`,
      createdAt: new Date().toISOString(),
    };
    sessionIdRef.current += 1;
    generationLockRef.current = false;
    failedUserReplyRef.current = null;
    setActiveTopic(topic);
    setMessages([systemMessage]);
    setRuntime({});
    setSchedule(originalSchedule);
    setError("");
    setLoading(false);
    setLoadingAgentId("");
    setAutoRunning(true);
    setVerdict(null);
    setVerdictLoading(false);
    setView("chat");
  };

  const nextTurns = useCallback(async () => {
    if (generationLockRef.current || turnCount >= schedule.length) return;
    const sessionId = sessionIdRef.current;
    const batch = schedule.slice(turnCount, turnCount + 1);
    if (!batch.length) return;
    generationLockRef.current = true;
    failedUserReplyRef.current = null;
    setError("");
    setLoadingAgentId(batch[0]?.agent.id ?? "");
    setLoading(true);
    try {
      const output = await generateScheduledBatch({
        topic: activeTopic,
        schedule: batch,
        allAgents: selectedAgents,
        runtime,
        messages,
      });
      if (sessionIdRef.current !== sessionId) return;
      setMessages((current) => [...current, ...output.messages]);
      setRuntime(output.runtime);
      setModel(output.model);
    } catch (reason) {
      if (sessionIdRef.current !== sessionId) return;
      setError(errorMessage(reason));
      setAutoRunning(false);
    } finally {
      if (sessionIdRef.current === sessionId) {
        generationLockRef.current = false;
        setLoading(false);
        setLoadingAgentId("");
      }
    }
  }, [activeTopic, messages, runtime, schedule, selectedAgents, turnCount]);

  const runUserReply = useCallback(async (input: FailedUserReply) => {
    if (generationLockRef.current) return;
    const sessionId = sessionIdRef.current;
    generationLockRef.current = true;
    setError("");
    setLoadingAgentId(input.target.id);
    setLoading(true);
    try {
      const output = await generatePhase({
        topic: input.topic,
        phase: input.phase,
        agents: input.agents,
        runtime: input.runtime,
        messages: input.messages,
        userTurn: {
          id: input.userMessage.id,
          text: input.userMessage.text,
          targetAgentId: input.target.id,
          targetAgentName: input.target.name,
        },
      });
      if (sessionIdRef.current !== sessionId) return;
      setMessages((current) => [...current, ...output.messages]);
      setRuntime((current) => ({ ...current, ...output.runtime }));
      setModel(output.model);
      failedUserReplyRef.current = null;
    } catch (reason) {
      if (sessionIdRef.current !== sessionId) return;
      failedUserReplyRef.current = input;
      setError(errorMessage(reason));
      setAutoRunning(false);
    } finally {
      if (sessionIdRef.current === sessionId) {
        generationLockRef.current = false;
        setLoading(false);
        setLoadingAgentId("");
      }
    }
  }, []);

  const sendUserMessage = () => {
    const text = composer.trim();
    const target = selectedAgents.find((agent) => agent.id === replyTargetId) ?? selectedAgents[0];
    if (!text || !target || generationLockRef.current) return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      speakerId: "user",
      speakerName: "你",
      role: "user",
      text,
      targetName: target.name,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setVerdict(null);
    setComposer("");
    const request: FailedUserReply = {
      topic: activeTopic,
      phase: activePhase === "closing" ? "closing" : "rebuttal",
      agents: selectedAgents,
      runtime,
      messages: nextMessages,
      userMessage,
      target,
    };
    void runUserReply(request);
  };

  const retryFailedMessage = () => {
    setAutoRunning(true);
    const failedUserReply = failedUserReplyRef.current;
    if (failedUserReply) {
      void runUserReply(failedUserReply);
      return;
    }
    void nextTurns();
  };

  useEffect(() => {
    if (
      view !== "chat"
      || !autoRunning
      || loading
      || error
      || composer.trim()
      || turnCount >= schedule.length
    ) return;
    const timer = window.setTimeout(() => void nextTurns(), 600);
    return () => window.clearTimeout(timer);
  }, [autoRunning, composer, error, loading, nextTurns, schedule.length, turnCount, view]);

  useEffect(() => {
    if (view === "chat" && schedule.length > 0 && turnCount >= schedule.length) {
      setAutoRunning(false);
    }
  }, [schedule.length, turnCount, view]);

  const generateVerdict = useCallback(async () => {
    if (verdictLockRef.current || loading || verdict || turnCount < schedule.length || schedule.length === 0) return;
    const sessionId = sessionIdRef.current;
    verdictLockRef.current = true;
    setVerdictLoading(true);
    try {
      const result = await generateDiscussionVerdict({
        topic: activeTopic,
        agents: selectedAgents,
        messages,
      });
      if (sessionIdRef.current !== sessionId) return;
      setVerdict(result);
      if (result.model) setModel(result.model);
    } catch {
      if (sessionIdRef.current === sessionId) {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
      }
    } finally {
      if (sessionIdRef.current === sessionId) setVerdictLoading(false);
      verdictLockRef.current = false;
    }
  }, [activeTopic, loading, messages, schedule.length, selectedAgents, turnCount, verdict]);

  useEffect(() => {
    if (view !== "chat" || loading || verdict || verdictLoading || turnCount < schedule.length || schedule.length === 0) return;
    const timer = window.setTimeout(() => void generateVerdict(), 500);
    return () => window.clearTimeout(timer);
  }, [generateVerdict, loading, schedule.length, turnCount, verdict, verdictLoading, view]);

  const resetChat = () => {
    sessionIdRef.current += 1;
    generationLockRef.current = false;
    verdictLockRef.current = false;
    failedUserReplyRef.current = null;
    setView("setup");
    setMessages([]);
    setRuntime({});
    setSchedule([]);
    setActiveTopic("");
    setError("");
    setModel("");
    setComposer("");
    setLoading(false);
    setLoadingAgentId("");
    setAutoRunning(false);
    setVerdict(null);
    setVerdictLoading(false);
  };

  return (
    <div className="app-viewport">
      <div className="app-shell">
        <aside className="rail">
          <img src="/assets/brand/app-icon.png" className="brand-mark" alt="Agent 群聊" />
          <button className="rail-button is-active" title="群聊"><MessageCircleMore size={21} /></button>
          <button className="rail-button" title="创建个人 Agent" onClick={() => setWizardOpen(true)}><UserRoundPlus size={21} /></button>
          <span className="rail-spacer" />
          <button className="rail-button" title="设置"><Settings2 size={20} /></button>
        </aside>

        <aside className="conversation-sidebar">
          <div className="sidebar-title"><span>消息</span><button className="icon-button dark" title="新群聊" onClick={resetChat}><Plus size={18} /></button></div>
          <button className="conversation-item is-active">
            <div className="conversation-avatar"><Users size={20} /></div>
            <div><strong>Agent 群聊</strong><span>{view === "chat" ? activeTopic : "新讨论"}</span></div>
            <time>{view === "chat" ? "刚刚" : ""}</time>
          </button>
          <div className="sidebar-section-title">个人 Agent</div>
          {personalAgents.map((agent) => (
            <div className="mini-agent" key={agent.id}>
              <AgentAvatar agent={agent} size={34} />
              <div><strong>{agent.name}</strong><span>{agent.role}</span></div>
              {savedProfiles.some((profile) => profile.id === agent.id) && <button title="删除" onClick={() => removeProfile(agent.id)}><X size={14} /></button>}
            </div>
          ))}
          <button className="add-agent-row" onClick={() => setWizardOpen(true)}><Plus size={16} />创建个人 Agent</button>
        </aside>

        <main className="chat-panel">
          <header className="chat-header">
            <button className="mobile-only icon-button" title="返回" onClick={resetChat}><ArrowLeft size={20} /></button>
            <div className="chat-heading">
              <h1>Agent 群聊 <span>({selectedAgents.length})</span></h1>
              <p>{view === "chat" ? "群聊讨论中" : "选择成员与议题"}</p>
            </div>
            <div className="header-actions">
              <button className="icon-button" title="创建个人 Agent" onClick={() => setWizardOpen(true)}><UserRoundPlus size={19} /></button>
              <button className="icon-button mobile-only" title="群成员" onClick={() => setMobileMembersOpen(true)}><Users size={19} /></button>
              {view === "chat" && !error && turnCount < schedule.length && (
                <button
                  className={`icon-button auto-toggle ${autoRunning ? "is-running" : ""}`}
                  title={autoRunning ? "暂停自动讨论" : "继续自动讨论"}
                  onClick={() => setAutoRunning((value) => !value)}
                >
                  {autoRunning ? <Pause size={18} /> : <Play size={18} />}
                </button>
              )}
              {view === "chat" && <button className="icon-button" title="重新开始" onClick={resetChat}><RotateCcw size={18} /></button>}
              <button className="icon-button" title="更多"><MoreHorizontal size={20} /></button>
            </div>
          </header>

          {view === "setup" ? (
            <SetupPanel
              personalAgents={personalAgents}
              roundtableAgents={roundtableAgents}
              selectedIds={selectedIds}
              topic={topicDraft}
              onTopicChange={setTopicDraft}
              onToggle={toggleAgent}
              onCreate={() => setWizardOpen(true)}
              onStart={startChat}
            />
          ) : (
            <>
              <div className="topic-strip"><span>{activeTopic}</span><button title="群成员" onClick={() => setMobileMembersOpen(true)}><Users size={15} />{selectedAgents.length}</button></div>
              <section className="messages" aria-label="群聊消息">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} agents={selectedAgents} />
                ))}
                {loading && <TypingRow agent={selectedAgents.find((agent) => agent.id === loadingAgentId) ?? selectedAgents[0]} />}
                {error && <div className="error-row"><CircleAlert size={16} /><span>{error}</span><button onClick={retryFailedMessage}>重试</button></div>}
                {verdictLoading && <VerdictLoadingRow />}
                {verdict && <DiscussionVerdictCard verdict={verdict} />}
                <div ref={messageEndRef} />
              </section>

              <div className="composer">
                <select value={replyTargetId} onChange={(event) => setReplyTargetId(event.target.value)} aria-label="选择回应 Agent">
                  {selectedAgents.map((agent) => <option key={agent.id} value={agent.id}>@{agent.name}</option>)}
                </select>
                <textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendUserMessage();
                    }
                  }}
                  placeholder="发送消息"
                  rows={1}
                />
                <button className="send-button" title="发送" disabled={!composer.trim() || loading} onClick={sendUserMessage}><Send size={18} /></button>
              </div>
            </>
          )}
        </main>

        <MemberPanel agents={selectedAgents} model={model} topic={view === "chat" ? activeTopic : topicDraft} />
      </div>

      {wizardOpen && <ProfileWizard onClose={() => setWizardOpen(false)} onSave={saveProfile} />}
      {mobileMembersOpen && (
        <div className="mobile-members-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setMobileMembersOpen(false)}>
          <div className="mobile-members-sheet">
            <header><strong>群成员 ({selectedAgents.length})</strong><button className="icon-button" onClick={() => setMobileMembersOpen(false)}><X size={18} /></button></header>
            <MemberList agents={selectedAgents} />
          </div>
        </div>
      )}
    </div>
  );
}

function SetupPanel({
  personalAgents,
  roundtableAgents: publicAgents,
  selectedIds,
  topic,
  onTopicChange,
  onToggle,
  onCreate,
  onStart,
}: {
  personalAgents: Agent[];
  roundtableAgents: Agent[];
  selectedIds: string[];
  topic: string;
  onTopicChange: (value: string) => void;
  onToggle: (id: string) => void;
  onCreate: () => void;
  onStart: () => void;
}) {
  return (
    <div className="setup-scroll">
      <section className="setup-section">
        <div className="section-heading"><div><span>群成员</span><small>已选 {selectedIds.length} 位 · 可选 2–6 位</small></div><button onClick={onCreate}><UserRoundPlus size={16} />创建</button></div>
        <div className="agent-selector-grid">
          {personalAgents.map((agent) => <AgentChoice key={agent.id} agent={agent} selected={selectedIds.includes(agent.id)} onClick={() => onToggle(agent.id)} />)}
          <button className="agent-choice create-choice" onClick={onCreate}><span><Plus size={21} /></span><strong>新的我</strong><small>填写问卷</small></button>
        </div>
      </section>
      <section className="setup-section">
        <div className="section-heading"><div><span>内置 Agent</span><small>可直接加入群聊</small></div></div>
        <div className="agent-selector-grid">
          {publicAgents.map((agent) => <AgentChoice key={agent.id} agent={agent} selected={selectedIds.includes(agent.id)} onClick={() => onToggle(agent.id)} />)}
        </div>
      </section>
      <section className="setup-section topic-compose">
        <div className="section-heading"><div><span>讨论议题</span><small>本次群聊</small></div></div>
        <textarea value={topic} onChange={(event) => onTopicChange(event.target.value)} placeholder="输入一个具体问题，例如：为了高薪长期加班，值得吗？" />
        <div className="start-row"><span>本次成员 · {selectedIds.length} 位</span><button className="primary-button" disabled={selectedIds.length < 2 || selectedIds.length > 6 || !topic.trim()} onClick={onStart}><Sparkles size={17} />创建群聊</button></div>
      </section>
    </div>
  );
}

function AgentChoice({ agent, selected, onClick }: { agent: Agent; selected: boolean; onClick: () => void }) {
  return (
    <button className={`agent-choice ${selected ? "is-selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      <AgentAvatar agent={agent} size={48} />
      <strong>{agent.name}</strong>
      <small>{agent.role}</small>
      <i>{selected && <Check size={12} />}</i>
    </button>
  );
}

function MessageBubble({ message, agents }: { message: ChatMessage; agents: Agent[] }) {
  if (message.role === "system") return <div className="system-message">{message.text}</div>;
  if (message.role === "user") {
    return (
      <article className="message-row is-user">
        <div className="message-content"><div className="message-name">你 · 回复 {message.targetName}</div><div className="bubble user-bubble">{message.text}</div></div>
        <div className="user-avatar">你</div>
      </article>
    );
  }
  const agent = agents.find((item) => item.id === message.speakerId) ?? {
    id: message.speakerId,
    name: message.speakerName,
    role: "Agent",
    kind: "personal" as const,
    coreBelief: "",
    speechStyle: "",
    debateStyle: "",
    accent: "#777",
  };
  return (
    <article className="message-row">
      <AgentAvatar agent={agent} size={44} />
      <div className="message-content">
        <div className="message-name">{message.speakerName} · {agent.role}</div>
        <div className="bubble agent-bubble">
          <p>{displayMessageText(message.text)}</p>
          {message.targetName && <footer>
            {message.targetName && <span>回复 {message.targetName}</span>}
          </footer>}
        </div>
      </div>
    </article>
  );
}

function TypingRow({ agent }: { agent?: Agent }) {
  if (!agent) return null;
  return <article className="message-row"><AgentAvatar agent={agent} speaking size={44} /><div className="message-content"><div className="message-name">{agent.name}</div><div className="bubble agent-bubble typing"><i /><i /><i /></div></div></article>;
}

function VerdictLoadingRow() {
  return (
    <div className="verdict-loading" role="status">
      <LoaderCircle size={15} />
      <span>正在整理讨论结论…</span>
    </div>
  );
}

function DiscussionVerdictCard({ verdict }: { verdict: DiscussionVerdict }) {
  return (
    <section className="verdict-card" aria-label="讨论结论">
      <header>
        <div><Check size={16} /><strong>讨论结论</strong></div>
        <span><Award size={13} />{verdict.winnerAgentName} 的观点最有说服力</span>
      </header>
      <p className="verdict-conclusion">{verdict.conclusion}</p>
      <div className="verdict-columns">
        <div>
          <strong>共同判断</strong>
          <ul>{verdict.consensus.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <strong>仍有分歧</strong>
          <ul>{verdict.disagreements.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      <p className="winner-reason">{verdict.winnerReason}</p>
      <details className="judge-details">
        <summary>查看裁判评分</summary>
        <div className="judge-score-list">
          {verdict.scores.map((score, index) => (
            <div className="judge-score" key={score.agentId}>
              <span>{index + 1}</span>
              <div><strong>{score.agentName}</strong><small>{score.comment}</small></div>
              <div className="score-meter"><i style={{ width: `${Math.round(score.overallScore * 100)}%` }} /></div>
              <em>{Math.round(score.overallScore * 100)}</em>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function MemberPanel({ agents, model, topic }: { agents: Agent[]; model: string; topic: string }) {
  return (
    <aside className="member-panel">
      <div className="member-panel-heading"><strong>群聊信息</strong><Info size={17} /></div>
      <div className="member-topic"><span>讨论议题</span><p>{topic || "尚未填写"}</p></div>
      <div className="member-panel-label">群成员 · {agents.length}</div>
      <MemberList agents={agents} />
      <div className="core-status"><Bot size={16} /><div><strong>对话服务</strong><span>{model ? `${model} · 已连接` : "等待讨论"}</span></div><i className={model ? "online" : ""} /></div>
    </aside>
  );
}

function MemberList({ agents }: { agents: Agent[] }) {
  return <div className="member-list">{agents.map((agent) => <div key={agent.id} className="member-row"><AgentAvatar agent={agent} size={38} /><div><strong>{agent.name}</strong><span>{agent.role}</span></div><em>{agent.kind === "personal" ? "个人" : "内置"}</em></div>)}</div>;
}

function loadProfiles(): PersonalAgentProfile[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as PersonalAgentProfile[] : [];
  } catch {
    return [];
  }
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "群聊生成失败，请重试。";
}

function displayMessageText(text: string): string {
  return text
    .replace(/\[[\w.-]+\]/gu, "")
    .replace(/〔\s*\d+\s*〕/gu, "")
    .replace(/(?:来源|结论|引用)\s*\d+\s*[、，,:：;；]?/gu, "")
    .replace(/\s+([，。！？；：])/gu, "$1")
    .trim();
}

interface FailedUserReply {
  topic: string;
  phase: RoundtablePhase;
  agents: Agent[];
  runtime: Record<string, AgentRuntimeState>;
  messages: ChatMessage[];
  userMessage: ChatMessage;
  target: Agent;
}
