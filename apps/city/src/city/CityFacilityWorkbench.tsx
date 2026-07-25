"use client";

import { Player } from "@remotion/player";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Coins,
  Copy,
  ExternalLink,
  Globe2,
  GitFork as Github,
  LoaderCircle,
  MapPin,
  Play,
  RefreshCw,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  Upload,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  citySkills,
  competitions,
  creatorMatches,
  hallTeamSignals,
  initialDevTasks,
  modelFallback,
  newsFallback,
  type CityHackathonEvent,
  type CityModel,
  type CityNewsItem,
  type DevTask,
} from "@/data/cityFacilities";
import { CITY_NPCS } from "@/city/config/npcs";
import { projectsMuseum } from "@/data/mockData";
import { publicProfiles } from "@/data/publicProfiles";
import { loadProfile } from "@/features/profile";
import type { SceneObjectDef, SceneObjectId } from "@/features/types";
import { CreatorIntro, type CreatorIntroProps } from "@/remotion/CreatorIntro";
import { buildCreatorStoryboard, getStoryboardDuration } from "@/remotion/storyboard";

type Props = { facility: SceneObjectDef; onClose: () => void };

const facilityMeta: Record<SceneObjectId, { icon: string; eyebrow: string; status: string; mark: string; ticker: string }> = {
  studio: { icon: "/pixel-icons/play.png", eyebrow: "REMOTION PROFILE STUDIO", status: "视频界面可打开", mark: "映", ticker: "PROFILE · STORY · MOTION · MEDIA · VIDEO" },
  homepage: { icon: "/pixel-icons/upload-file.png", eyebrow: "STATIC PERSONAL HOMEPAGE", status: "静态档案可查看", mark: "档", ticker: "PROFILE · EXPERIENCE · PROJECT · EVIDENCE · HOMEPAGE" },
  bulletin: { icon: "/pixel-icons/newspaper.png", eyebrow: "LIVE SIGNAL WALL", status: "公开源已接入", mark: "报", ticker: "AI · CODING · AGENT · GITHUB · LIVE SIGNAL" },
  leaderboard: { icon: "/pixel-icons/chart-up.png", eyebrow: "MODEL ARENA", status: "OpenRouter 目录", mark: "榜", ticker: "REASONING · CODING · PRICE · SPEED · CONTEXT" },
  skillgarden: { icon: "/pixel-icons/plant-pot.png", eyebrow: "WORKFLOW GARDEN", status: "安装入口可用", mark: "技", ticker: "SKILL · WORKFLOW · TOOL · INSTALL · PRACTICE" },
  "table-dev": { icon: "/pixel-icons/terminal.png", eyebrow: "BUILD & TEST DESK", status: "悬赏工作台在线", mark: "验", ticker: "BUILD · TEST · REWARD · EVIDENCE · REVIEW" },
  "table-social": { icon: "/pixel-icons/handshake-trim.png", eyebrow: "CREATOR MATCH", status: "匹配条件可编辑", mark: "遇", ticker: "PROFILE · EVIDENCE · MATCH · INVITE · MEET" },
  agentroundtable: { icon: "/pixel-icons/robot.png", eyebrow: "CHAT DEBATE HALL", status: "辩论群聊已接入", mark: "议", ticker: "AGENT · TOPIC · ARGUMENT · EVIDENCE · VERDICT" },
  hackathon: { icon: "/pixel-icons/team-trim.png", eyebrow: "HACKATHON HUB", status: "官方报名源在线", mark: "赛", ticker: "UPCOMING · REGISTER · BUILD · SHIP · DEMO DAY" },
  agenthub: { icon: "/pixel-icons/play.png", eyebrow: "CREATOR FILM ARCHIVE", status: "Remotion 播放器在线", mark: "映", ticker: "CREATOR · FILM · PROJECT · STORY · SIGNAL" },
};

const formatDate = (value: string) => {
  if (!value) return "持续更新";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("zh-CN");
};

function NewsWorkbench() {
  const [items, setItems] = useState<CityNewsItem[]>(newsFallback);
  const [filter, setFilter] = useState<"ALL" | CityNewsItem["category"]>("ALL");
  const [fetchedAt, setFetchedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/news", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok || !Array.isArray(result.data)) throw new Error("资讯源暂时不可用");
      setItems(result.data);
      setFetchedAt(result.fetchedAt || new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "资讯源暂时不可用");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => filter === "ALL" ? items : items.filter((item) => item.category === filter), [filter, items]);

  return <div className="city-bench-news">
    <div className="city-bench-toolbar">
      <div className="city-bench-tabs" aria-label="资讯分类">{(["ALL", "AI", "CODING", "AGENT", "GITHUB"] as const).map((item) => <button type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
      <button className="city-bench-icon-button" type="button" onClick={() => void load()} disabled={loading} title="刷新公开资讯源"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /><span>{loading ? "刷新中" : "刷新"}</span></button>
    </div>
    <div className="city-bench-source"><span><i />OpenAI RSS · GitHub Blog RSS · GitHub Search API</span><time>{fetchedAt ? `更新于 ${new Date(fetchedAt).toLocaleString("zh-CN")}` : "正在读取公开源"}</time></div>
    {error && <p className="city-bench-notice">{error}，当前展示最近一次可用快照。</p>}
    <section className="city-news-list" aria-live="polite">{visible.map((item, index) => <article key={item.id}>
      <span className="city-news-index">{String(index + 1).padStart(2, "0")}</span>
      <div><p><b>{item.category}</b>{item.source} · {formatDate(item.publishedAt)}</p><h3>{item.title}</h3><span>{item.summary || "打开来源查看完整内容。"}</span></div>
      <a href={item.url} target="_blank" rel="noreferrer" title="打开原始来源"><ArrowUpRight size={18} /></a>
    </article>)}</section>
  </div>;
}

type RankKey = "overall" | "coding" | "reasoning" | "agent" | "multimodal" | "speed" | "input" | "output" | "context";
const rankOptions: { id: RankKey; label: string; lowWins?: boolean }[] = [
  { id: "overall", label: "综合" }, { id: "coding", label: "编程" }, { id: "reasoning", label: "推理" },
  { id: "agent", label: "Agent" }, { id: "multimodal", label: "多模态" }, { id: "speed", label: "速度" },
  { id: "input", label: "输入价格", lowWins: true }, { id: "output", label: "输出价格", lowWins: true }, { id: "context", label: "上下文" },
];
const formatPrice = (value: number) => `$${value < 1 ? value.toFixed(3) : value.toFixed(2)}`;
const formatContext = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(value % 1_000_000 ? 2 : 0)}M` : `${Math.round(value / 1000)}K`;

function ModelWorkbench() {
  const [models, setModels] = useState<CityModel[]>(modelFallback);
  const [rank, setRank] = useState<RankKey>("overall");
  const [selectedId, setSelectedId] = useState(modelFallback[0].id);
  const [source, setSource] = useState("OpenRouter snapshot");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/models", { cache: "no-store" }).then((response) => response.json()).then((result) => {
      if (!active || !result.ok || !Array.isArray(result.data) || !result.data.length) return;
      setModels(result.data);
      setSource(result.source || "OpenRouter live catalog");
    }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const option = rankOptions.find((item) => item.id === rank)!;
  const sorted = useMemo(() => [...models].sort((a, b) => option.lowWins ? a[rank] - b[rank] : b[rank] - a[rank]), [models, option.lowWins, rank]);
  const selected = models.find((model) => model.id === selectedId) || sorted[0];
  const showValue = (model: CityModel) => rank === "input" || rank === "output" ? formatPrice(model[rank]) : rank === "context" ? formatContext(model.context) : model[rank];

  return <div className="city-bench-models">
    <div className="city-bench-toolbar"><div className="city-bench-tabs model-tabs" aria-label="模型排行维度">{rankOptions.map((item) => <button type="button" className={rank === item.id ? "active" : ""} onClick={() => setRank(item.id)} key={item.id}>{item.label}</button>)}</div><span className="city-bench-loading">{loading ? <><LoaderCircle size={14} className="animate-spin" />连接目录</> : source}</span></div>
    <div className="city-model-layout">
      <div className="city-model-table-wrap"><table><thead><tr><th>#</th><th>模型</th><th>{option.label}</th><th>编程</th><th>推理</th><th>Agent</th><th>输入</th><th>输出</th><th>上下文</th></tr></thead><tbody>{sorted.map((model, index) => <tr className={selected.id === model.id ? "selected" : ""} key={model.id} onClick={() => setSelectedId(model.id)}><td>{String(index + 1).padStart(2, "0")}</td><td><b>{model.shortName}</b><small>{model.org}</small></td><td><strong>{showValue(model)}</strong></td><td>{model.coding}</td><td>{model.reasoning}</td><td>{model.agent}</td><td>{formatPrice(model.input)}</td><td>{formatPrice(model.output)}</td><td>{formatContext(model.context)}</td></tr>)}</tbody></table></div>
      <aside className="city-model-dossier"><span>{selected.org} · #{sorted.findIndex((model) => model.id === selected.id) + 1}</span><h3>{selected.shortName}</h3><p>{selected.use}</p><div>{(["coding", "reasoning", "agent", "multimodal", "speed"] as const).map((key) => <label key={key}><span>{({ coding: "编程", reasoning: "推理", agent: "Agent", multimodal: "多模态", speed: "速度" })[key]}</span><i><em style={{ width: `${selected[key]}%` }} /></i><b>{selected[key]}</b></label>)}</div><a href={selected.sourceUrl} target="_blank" rel="noreferrer">OpenRouter 模型页 <ExternalLink size={14} /></a></aside>
    </div>
  </div>;
}

function SkillsWorkbench() {
  const [copied, setCopied] = useState("");
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(""), 1800);
  };
  return <section className="city-skills-grid">{citySkills.map((skill, index) => <article key={skill.name}>
    <header><img src="/pixel-icons/plant-pot.png" alt="" /><span>{skill.type} · {String(index + 1).padStart(2, "0")}</span></header>
    <h3>{skill.name}</h3><p>{skill.desc}</p><div>{skill.tasks.map((task) => <b key={task}>{task}</b>)}</div>
    <footer><code>{skill.install}</code><button type="button" onClick={() => void copy(skill.install)} title="复制安装命令">{copied === skill.install ? <Check size={16} /> : <Copy size={16} />}</button><a href={`https://github.com/${skill.source}`} target="_blank" rel="noreferrer" title="打开来源仓库"><Github size={15} /></a></footer>
  </article>)}</section>;
}

function GalleryWorkbench() {
  const [activeId, setActiveId] = useState(publicProfiles[0].id);
  const [view, setView] = useState<"film" | "projects">("film");
  const active = publicProfiles.find((profile) => profile.id === activeId) || publicProfiles[0];
  const storyboard = useMemo(() => buildCreatorStoryboard(active), [active]);
  const props: CreatorIntroProps = { storyboard };

  return <div className="city-gallery-bench">
    <div className="city-bench-toolbar"><div className="city-bench-tabs"><button type="button" className={view === "film" ? "active" : ""} onClick={() => setView("film")}><Play size={14} />主页影片</button><button type="button" className={view === "projects" ? "active" : ""} onClick={() => setView("projects")}><ClipboardCheck size={14} />项目档案</button></div><span>{publicProfiles.length} 位公开创作者 / 团队</span></div>
    <nav className="city-gallery-rail">{publicProfiles.map((profile, index) => <button type="button" className={active.id === profile.id ? "active" : ""} onClick={() => setActiveId(profile.id)} key={profile.id}><span>{String(index + 1).padStart(2, "0")}</span><b>{profile.name}</b><small>{profile.title}</small></button>)}</nav>
    {view === "film" ? <section className="city-gallery-screen"><div><Player component={CreatorIntro} inputProps={props} durationInFrames={getStoryboardDuration(storyboard)} fps={storyboard.fps} compositionWidth={1280} compositionHeight={720} controls loop style={{ width: "100%", aspectRatio: "16 / 9" }} /></div><aside><p>NOW SCREENING</p><h3>{active.name}</h3><strong>{active.title}</strong><span>{active.bio}</span><dl>{active.metrics.slice(0, 3).map((metric) => <div key={metric.id}><dt>{metric.label}</dt><dd>{metric.value}</dd><small>{metric.context}</small></div>)}</dl><a href={`https://github.com/${active.githubUsername}`} target="_blank" rel="noreferrer"><Github size={15} />{active.githubUsername}<ArrowUpRight size={14} /></a></aside></section> : <section className="city-gallery-projects">{active.projects.map((project, index) => <article key={project.id}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{project.role}</small><h3>{project.name}</h3><p>{project.desc}</p><div>{project.tech.map((tech) => <b key={tech}>{tech}</b>)}</div></div><a href={project.url} target="_blank" rel="noreferrer" title="打开项目来源"><ArrowUpRight size={18} /></a></article>)}</section>}
    <p className="city-bench-footnote">档案只引用公开 GitHub 信息；qybaihe、OpenHands、browser-use 与 Creator City 无隶属或合作背书关系。</p>
  </div>;
}

function StudioWorkbench() {
  const [hasProfile, setHasProfile] = useState(false);
  useEffect(() => { setHasProfile(Boolean(loadProfile())); }, []);
  return <div className="city-studio-bench">
    <motion.section className="city-studio-stage" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .45 }}>
      <div className="city-studio-lens" aria-hidden="true"><i /><i /><i /><span>36s</span></div>
      <div><p>LIVE REMOTION PIPELINE</p><h3>任何履历，都先变成有证据的故事</h3><span>项目视频、路演、图片、PDF 与 GitHub 会按“问题—行动—证据—结果—复盘”重新编排，不播放统一底片。</span></div>
      <b><Radio size={13} />USER-SPECIFIC RENDER</b>
    </motion.section>
    <section className="city-studio-flow">
      <article><span>01</span><img src="/pixel-icons/upload-file.png" alt="" /><div><b>输入与绑定</b><p>上传项目素材，并说明它对应哪段经历与哪一个时间点。</p></div></article>
      <article><span>02</span><img src="/pixel-icons/sparkle-star.png" alt="" /><div><b>叙事与分镜</b><p>从事实中提取命题、职责、行动和可核验结果，再决定 Motion 节拍。</p></div></article>
      <article><span>03</span><img src="/pixel-icons/play.png" alt="" /><div><b>现场生成</b><p>左侧 Motion、右侧真实素材协同演示，Remotion 按当前用户数据渲染。</p></div></article>
    </section>
    <footer className="city-studio-actions">
      <a className={!hasProfile ? "primary" : ""} href="/onboarding">{hasProfile ? "编辑个人简历" : "创建个人简历"}</a>
      {hasProfile && <a href="/profile">查看个人主页</a>}
      {hasProfile && <a className="primary" href="/video"><Play size={15} />打开主页影片工作台</a>}
    </footer>
  </div>;
}

function AgentRoundtableWorkbench() {
  const agents = CITY_NPCS.filter((agent) => agent.id !== "tea-steward").slice(0, 7);
  const [focusedId, setFocusedId] = useState(agents[0]?.id || "");
  const focused = agents.find((agent) => agent.id === focusedId) || agents[0];
  return <div className="city-agent-roundtable-bench">
    <section className="city-agent-orbit-board">
      <div className="city-agent-orbit-core"><img src="/pixel-icons/robot.png" alt="" /><b>AGENT BUS</b><span>接口层</span></div>
      {agents.map((agent, index) => <button type="button" className={agent.id === focused?.id ? "active" : ""} style={{ "--agent-index": index } as CSSProperties} onClick={() => setFocusedId(agent.id)} key={agent.id}><i /><b>{agent.nameCn}</b><span>{agent.role}</span></button>)}
    </section>
    {focused && <motion.aside key={focused.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
      <p><Radio size={12} />READ-ONLY CONNECTION PROFILE</p><h3>{focused.nameCn}</h3><strong>{focused.role}</strong><span>{focused.desc}</span>
      <dl><div><dt>当前状态</dt><dd>地图行为已接入</dd></div><div><dt>交互边界</dt><dd>暂不启用自主对话</dd></div><div><dt>后续负责人</dt><dd>Agent 协作队友</dd></div></dl>
      <div>{focused.dialogue.map((line) => <blockquote key={line}>{line}</blockquote>)}</div>
      <small><ShieldCheck size={13} />本区只展示能力、状态与接口边界；Agent 通信逻辑保持独立模块。</small>
    </motion.aside>}
  </div>;
}

function DevWorkbench() {
  const [tasks, setTasks] = useState<DevTask[]>(initialDevTasks);
  const [claimed, setClaimed] = useState<number[]>([]);
  const [proofs, setProofs] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<number[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [reward, setReward] = useState(100);
  const [money, setMoney] = useState(0);
  const [published, setPublished] = useState("");

  const publish = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !detail.trim()) return;
    const task: DevTask = { id: Math.max(0, ...tasks.map((item) => item.id)) + 1, title: title.trim(), repo: "xingchenyd/creator-city", type: "NEW", reward, money: money ? `¥${money}` : "", acceptance: detail.split(/\n|；|;/).map((item) => item.trim()).filter(Boolean), stack: ["待补充"], owner: "星辰", due: "待协商" };
    setTasks((current) => [task, ...current]);
    setPublished(task.title);
    setTitle("");
    setDetail("");
  };

  return <div className="city-dev-bench">
    <div className="city-bench-toolbar"><span><img src="/pixel-icons/terminal.png" alt="" />真实领取、上传和发布状态保留在当前会话</span><button type="button" onClick={() => setShowRules((current) => !current)}><ShieldCheck size={15} />{showRules ? "收起规则" : "验收规则"}</button></div>
    {showRules && <div className="city-dev-rules"><b>验收原则</b><span>任务必须写明环境、交付物和判定条件；积分与红包只在发布者确认后结算，初版不产生真实支付。</span></div>}
    <div className="city-dev-layout">
      <section className="city-dev-lane"><h3>待领取 <span>{tasks.filter((task) => !claimed.includes(task.id)).length}</span></h3>{tasks.filter((task) => !claimed.includes(task.id)).map((task) => <article key={task.id}><header><span>{task.type}</span><b><Coins size={13} />{task.reward} 积分 {task.money}</b></header><h4>{task.title}</h4><a href={`https://github.com/${task.repo}`} target="_blank" rel="noreferrer"><Github size={13} />{task.repo}</a><dl>{task.acceptance.map((item) => <dd key={item}><CheckCircle2 size={11} />{item}</dd>)}</dl><footer><span><Clock3 size={12} />{task.due}</span><button type="button" onClick={() => setClaimed((current) => [...current, task.id])}>领取任务</button></footer></article>)}</section>
      <section className="city-dev-lane active"><h3>我的工作台 <span>{claimed.length}</span></h3>{claimed.length ? tasks.filter((task) => claimed.includes(task.id)).map((task) => <article key={task.id}><header><span>{submitted.includes(task.id) ? "SUBMITTED" : "IN PROGRESS"}</span><b>{task.reward} 积分</b></header><h4>{task.title}</h4><label className="city-proof-upload"><Upload size={15} /><span>{proofs[task.id] || "选择截图、日志或说明文件"}</span><input type="file" accept="image/*,.txt,.md,.log,.pdf" onChange={(event) => setProofs((current) => ({ ...current, [task.id]: event.target.files?.[0]?.name || "" }))} /></label><button type="button" className="submit-proof" disabled={!proofs[task.id] || submitted.includes(task.id)} onClick={() => setSubmitted((current) => [...current, task.id])}>{submitted.includes(task.id) ? <><Check size={14} />已提交验收</> : "提交验收证据"}</button></article>) : <div className="city-empty-state"><img src="/pixel-icons/code.png" alt="" /><b>还没有领取任务</b><span>从左侧选择一个验收条件明确的任务。</span></div>}</section>
      <form className="city-dev-publish" onSubmit={publish}><img src="/pixel-icons/gift.png" alt="" /><h3>发布悬赏</h3><label>任务标题<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：移动端上传流程回归" /></label><label>验收标准<textarea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="每行一条可核验的交付标准" /></label><div><label>积分<input type="number" min="0" value={reward} onChange={(event) => setReward(Number(event.target.value))} /></label><label>红包 ¥<input type="number" min="0" value={money} onChange={(event) => setMoney(Number(event.target.value))} /></label></div><button type="submit" disabled={!title.trim() || !detail.trim()}>发布到开发桌</button>{published && <p><CheckCircle2 size={13} />“{published}”已进入待领取区</p>}</form>
    </div>
  </div>;
}

function SocialWorkbench() {
  const [criteria, setCriteria] = useState("希望遇见懂 Agent 工程、愿意做开源产品、重视用户体验的人");
  const [agentOn, setAgentOn] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  const ranked = useMemo(() => {
    const terms = criteria.toLowerCase().split(/[\s、，,。]+/).filter((term) => term.length > 1);
    return creatorMatches.map((person) => {
      const searchable = [...person.offers, ...person.seeks, ...person.projects, person.title].join(" ").toLowerCase();
      const evidence = terms.filter((term) => searchable.includes(term)).length;
      return { ...person, liveMatch: Math.min(99, person.match + Math.min(3, evidence)) };
    }).sort((a, b) => b.liveMatch - a.liveMatch);
  }, [criteria]);

  return <div className="city-social-bench">
    <motion.aside initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 180, damping: 22 }}>
      <div className="city-social-orbit" aria-hidden="true"><i /><i /><i /></div>
      <img src="/pixel-icons/handshake-trim.png" alt="" />
      <p className="city-social-kicker"><Radio size={12} />MATCH AGENT / LISTENING</p>
      <h3>我想遇见</h3>
      <textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} aria-label="交友匹配条件" />
      <div className="city-criteria-signal"><span>关键词信号</span><div>{criteria.split(/[\s、，,。]+/).filter((term) => term.length > 1).slice(0, 4).map((term) => <b key={term}>{term}</b>)}</div></div>
      <label className="city-agent-toggle"><span><b>离线时继续寻找</b><small>只计算匹配并通知，不让 Agent 私自对话</small></span><input type="checkbox" checked={agentOn} onChange={(event) => setAgentOn(event.target.checked)} /></label>
      <AnimatePresence>{agentOn && <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><Sparkles size={13} />条件已保存；有新候选时会在城内通知。</motion.p>}</AnimatePresence>
    </motion.aside>
    <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08, duration: .45 }}>
      <header><div><Search size={17} /><span><b>推荐会面</b><small>依据公开作品与能力证据实时重排</small></span></div><span>{ranked.length} 位候选</span></header>
      <AnimatePresence mode="popLayout">{ranked.map((person, index) => <motion.article layout key={person.handle} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }} whileHover={{ x: 6 }}>
        <div className="city-match-score"><b>{person.liveMatch}</b><small>MATCH</small><i><em style={{ height: `${person.liveMatch}%` }} /></i></div>
        <div><span>PUBLIC GITHUB PROFILE</span><h3>{person.name}</h3><p>{person.title}</p><div>{person.offers.map((item) => <b key={item}>{item}</b>)}</div><blockquote>{person.reason}</blockquote><small>作品证据：{person.projects.join(" / ")}</small></div>
        <footer><a href={`https://github.com/${person.handle}`} target="_blank" rel="noreferrer"><Github size={14} />GitHub</a><button type="button" onClick={() => setInvited((current) => current.includes(person.handle) ? current : [...current, person.handle])}>{invited.includes(person.handle) ? <><Check size={13} />邀请已发出</> : <><Send size={13} />发起会面</>}</button></footer>
      </motion.article>)}</AnimatePresence>
    </motion.section>
  </div>;
}

function HackathonHubWorkbench() {
  const [view, setView] = useState<"board" | "teams" | "demos">("board");
  const [events, setEvents] = useState<CityHackathonEvent[]>(competitions);
  const [eventSource, setEventSource] = useState("官方报名入口快照");
  const [fetchedAt, setFetchedAt] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [applied, setApplied] = useState<string[]>([]);
  const [selectedDemo, setSelectedDemo] = useState(projectsMuseum[0].id);
  const demo = projectsMuseum.find((project) => project.id === selectedDemo) || projectsMuseum[0];
  const featured = events[0];

  useEffect(() => {
    let active = true;
    fetch("/api/hackathons", { cache: "no-store" }).then((response) => response.json()).then((result) => {
      if (!active || !result.ok || !Array.isArray(result.data) || !result.data.length) return;
      setEvents(result.data);
      setEventSource(result.source || "官方报名入口");
      setFetchedAt(result.fetchedAt || "");
    }).catch(() => undefined).finally(() => { if (active) setLoadingEvents(false); });
    return () => { active = false; };
  }, []);

  return <div className="city-hub-bench">
    {featured && <motion.section className="city-hub-command" initial={{ opacity: 0, y: -22 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 180, damping: 22 }}>
      <div className="city-hub-radar" aria-hidden="true"><span /><i /><b><Zap size={22} /></b></div>
      <div className="city-hub-feature"><p><Radio size={12} />NEXT REGISTRATION SIGNAL</p><h3>{featured.name}</h3><div><span><CalendarDays size={13} />{featured.date}</span><span><MapPin size={13} />{featured.location}</span></div></div>
      <a href={featured.registrationUrl} target="_blank" rel="noreferrer"><span>官方报名</span><ArrowUpRight size={19} /></a>
      <aside><b>{loadingEvents ? <LoaderCircle size={15} className="animate-spin" /> : <Globe2 size={15} />}{eventSource}</b><small>{fetchedAt ? `更新 ${new Date(fetchedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "正在同步赛事源"}</small></aside>
    </motion.section>}
    <div className="city-bench-tabs hub-tabs" role="tablist"><button type="button" className={view === "board" ? "active" : ""} onClick={() => setView("board")}><CalendarDays size={14} />近期赛事</button><button type="button" className={view === "teams" ? "active" : ""} onClick={() => setView("teams")}><UsersRound size={14} />AI 组队</button><button type="button" className={view === "demos" ? "active" : ""} onClick={() => setView("demos")}><Play size={14} />Demo 展示</button></div>
    <AnimatePresence mode="wait">
      {view === "board" && <motion.section key="board" className="city-hackathon-board" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .28 }}>
        <header className="city-event-board-head"><div><Trophy size={18} /><span><b>正在报名与即将开放</b><small>点击卡片的报名按钮直接前往主办方官方页面</small></span></div><a href="https://www.mlh.com/seasons/2027/events" target="_blank" rel="noreferrer">全部官方赛程<ExternalLink size={13} /></a></header>
        <div className="city-competition-grid">{events.map((competition, index) => <motion.article key={competition.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .055 }} whileHover={{ y: -7, rotate: index % 2 ? .35 : -.35 }}>
          <header><span>{String(index + 1).padStart(2, "0")}</span><b><i />{competition.status}</b></header>
          <p>{competition.organizer}</p><h3>{competition.name}</h3><time><Timer size={13} />{competition.date}</time>
          <div className="city-event-route"><span>{competition.mode}</span><b>{competition.location}</b></div>
          <div className="city-event-tags">{competition.tags.map((tag) => <small key={tag}>{tag}</small>)}</div>
          <footer><a className="city-event-source" href={competition.sourceUrl} target="_blank" rel="noreferrer" title="查看赛事来源"><Globe2 size={14} />官方源</a><a className="city-event-register" href={competition.registrationUrl} target="_blank" rel="noreferrer">查看详情并报名<ArrowUpRight size={16} /></a></footer>
        </motion.article>)}</div>
      </motion.section>}
      {view === "teams" && <motion.section key="teams" className="city-hub-teams" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>{hallTeamSignals.map((team, index) => <motion.article initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .07 }} whileHover={{ x: 5 }} key={team.name}><div><span>TEAM SIGNAL</span><h3>{team.name}</h3><p>当前缺口：<b>{team.need}</b></p><div>{team.stack.map((item) => <small key={item}>{item}</small>)}</div></div><aside><strong>{team.match}%</strong><span>能力匹配</span><button type="button" onClick={() => setApplied((current) => current.includes(team.name) ? current : [...current, team.name])}>{applied.includes(team.name) ? "申请已提交" : "申请加入"}</button></aside></motion.article>)}</motion.section>}
      {view === "demos" && <motion.section key="demos" className="city-demo-layout" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}><nav>{projectsMuseum.map((project) => <button type="button" className={project.id === demo.id ? "active" : ""} onClick={() => setSelectedDemo(project.id)} key={project.id}><span style={{ backgroundColor: project.cover }} /> <b>{project.title}</b><small>{project.category}</small></button>)}</nav><motion.article key={demo.id} initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }}><span>{demo.category} · BY {demo.author}</span><h3>{demo.title}</h3><p>{demo.desc}</p><div>{demo.tech.map((tech) => <b key={tech}>{tech}</b>)}</div><dl><div><dt>项目仓库</dt><dd>{demo.github}</dd></div>{demo.demo && <div><dt>在线 Demo</dt><dd>{demo.demo}</dd></div>}</dl><button type="button"><Play size={15} />在会馆大屏预览</button></motion.article></motion.section>}
    </AnimatePresence>
  </div>;
}

function FacilityContent({ id }: { id: SceneObjectId }) {
  switch (id) {
    case "studio": return <StudioWorkbench />;
    case "homepage": return <StudioWorkbench />;
    case "bulletin": return <NewsWorkbench />;
    case "leaderboard": return <ModelWorkbench />;
    case "skillgarden": return <SkillsWorkbench />;
    case "agenthub": return <GalleryWorkbench />;
    case "table-dev": return <DevWorkbench />;
    case "table-social": return <SocialWorkbench />;
    case "agentroundtable": return <AgentRoundtableWorkbench />;
    case "hackathon": return <HackathonHubWorkbench />;
  }
}

export function CityFacilityWorkbench({ facility, onClose }: Props) {
  const meta = facilityMeta[facility.id];
  const openedAt = useRef(Date.now());
  return <motion.div className="city-workbench-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .28 }} onMouseDown={(event) => { if (event.currentTarget === event.target && Date.now() - openedAt.current > 350) onClose(); }}>
    <motion.section initial={{ opacity: 0, y: 38, scale: .965 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 165, damping: 22 }} className={`city-workbench city-workbench-${facility.id}`} data-testid="city-facility-workbench" data-facility={facility.id} data-mark={meta.mark} role="dialog" aria-modal="true" aria-label={facility.nameCn}>
      <div className="city-workbench-eaves" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <header className="city-workbench-header"><div className="city-workbench-icon"><img src={meta.icon} alt="" /></div><div><p>{meta.eyebrow}</p><h2>{facility.nameCn}</h2><span>{facility.desc}</span></div><aside><span><i />{meta.status}</span><button type="button" onClick={onClose} title="返回院落" aria-label="关闭功能区"><X size={20} /></button></aside></header>
      <div className="city-workbench-ticker" aria-hidden="true"><span>{meta.ticker} · {meta.ticker} · {meta.ticker}</span></div>
      <motion.div className="city-workbench-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .16, duration: .36 }}><FacilityContent id={facility.id} /></motion.div>
    </motion.section>
  </motion.div>;
}
