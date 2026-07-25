"use client";

import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, Code2, Coins, FlaskConical, GitFork as Github, HeartHandshake, Search, ShieldCheck, Sparkles, Target, TestTube2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Zone = "hackathon" | "dev" | "social";
const zones = [
  { id: "hackathon" as const, name: "黑客松组队桌", note: "赛题、能力席位、Demo 里程碑", icon: UsersRound },
  { id: "dev" as const, name: "开发测试悬赏桌", note: "复现、验收、积分与红包", icon: TestTube2 },
  { id: "social" as const, name: "创作者会面桌", note: "公开作品、互补能力、Agent 匹配", icon: HeartHandshake },
];
const teams = [
  { name: "中轴叙事引擎", challenge: "AI for Beijing", pitch: "把北京街区史料变成可游玩的多模态路线", stage: "PROTOTYPE", members: ["产品 / 星辰", "Agent 工程 / 北辰"], open: ["交互设计", "北京地方史"], tech: ["Remotion", "RAG", "Map"], deadline: "08.16", progress: 62 },
  { name: "Patchwork Agents", challenge: "Open Source AI Hack", pitch: "能在失败后恢复的浏览器协作 Agent", stage: "BUILD", members: ["Python / Ada", "前端 / Ming"], open: ["Agent 评测", "Demo 叙事"], tech: ["Browser Use", "LangGraph"], deadline: "08.03", progress: 74 },
  { name: "回声档案馆", challenge: "Creative AI Weekend", pitch: "把口述史、照片和地点生成可校对的视频档案", stage: "IDEA", members: ["影像 / Lin", "研究 / Xun"], open: ["全栈开发", "数据治理"], tech: ["Whisper", "Remotion"], deadline: "08.09", progress: 35 },
];
const tasks = [
  { id: 1, title: "Remotion 中文长标题极限输入回归", repo: "xingchenyd/creator-city", type: "TEST", reward: 180, money: "¥30", acceptance: ["覆盖 12 组输入", "附 3 张失败截图", "提交复现步骤"], stack: ["Playwright", "Remotion"], owner: "星辰", due: "今天 22:00" },
  { id: 2, title: "Windows 中文路径下的 Electron 打包验证", repo: "qybaihe/mooncut", type: "COMPAT", reward: 320, money: "¥66", acceptance: ["Win 11 实机", "首次启动日志", "给出可复现结论"], stack: ["Electron", "Windows"], owner: "qybaihe", due: "07.27" },
  { id: 3, title: "Browser Agent 登录态恢复测试矩阵", repo: "browser-use/browser-use", type: "QA DESIGN", reward: 240, money: "", acceptance: ["定义 8 个状态", "区分可恢复/不可恢复", "输出测试矩阵"], stack: ["Browser", "Agent"], owner: "北海测试所", due: "07.29" },
];
const people = [
  { name: "星辰", handle: "xingchenyd", title: "数据分析 × AI 产品 × 商业分析", offers: ["产品叙事", "数据分析", "Remotion"], seeks: ["Agent 工程", "交互设计"], projects: ["Creator City", "ColorBook", "Scrap Loop"], match: 96, reason: "你们都在做创作者工具；星辰的产品与叙事能力可补足 Agent 工程。" },
  { name: "qybaihe", handle: "qybaihe", title: "AI 视频与跨端产品构建者", offers: ["Remotion", "FFmpeg", "SwiftUI"], seeks: ["AI 产品", "多模态工作流"], projects: ["MoonCut", "Roundtable"], match: 92, reason: "视频工作流与 Creator City 的个人主页生成链路高度相关。" },
  { name: "browser-use", handle: "browser-use", title: "Browser agent open-source team", offers: ["Browser Automation", "Python", "Agent"], seeks: ["评测", "生态案例"], projects: ["browser-use"], match: 85, reason: "适合作为浏览器 Agent 工程与可靠执行的公开案例连接。" },
  { name: "OpenHands", handle: "OpenHands", title: "AI-driven development community", offers: ["Agent Runtime", "Developer Tools"], seeks: ["开源贡献", "真实任务"], projects: ["OpenHands"], match: 82, reason: "开发测试桌上的任务可以成为真实 Agent 能力评测样本。" },
];

export default function CollaborationPage() {
  const [zone, setZone] = useState<Zone>("hackathon");
  const [claimed, setClaimed] = useState<number[]>([]);
  const [joined, setJoined] = useState<string[]>([]);
  const [criteria, setCriteria] = useState("希望遇见懂 Agent 工程、愿意做开源产品、重视用户体验的人");
  const [agentOn, setAgentOn] = useState(false);
  const [skill, setSkill] = useState("全部席位");
  useEffect(() => { const value = new URLSearchParams(window.location.search).get("zone"); if (value === "hackathon" || value === "dev" || value === "social") setZone(value); }, []);
  const visibleTeams = useMemo(() => skill === "全部席位" ? teams : teams.filter((team) => team.open.includes(skill)), [skill]);
  const active = zones.find((item) => item.id === zone)!;
  return <main className={`roundtable-space roundtable-${zone} min-h-screen`}>
    <header><div><p>BEIJING CREATOR COURTYARD / TABLE {zone.toUpperCase()}</p><h1>{active.name}</h1><span>{active.note}</span></div><a href="/city/neon"><ArrowLeft size={16} />返回院落</a></header>
    <nav>{zones.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setZone(item.id)} className={zone === item.id ? "active" : ""}><Icon size={20} /><span><b>{item.name}</b><small>{item.note}</small></span></button>; })}</nav>

    {zone === "hackathon" && <section className="hackathon-table"><div className="table-toolbar"><div><Target size={18} /><b>正在组队的项目</b><span>{visibleTeams.length} 支队伍</span></div><label>按空缺席位<select value={skill} onChange={(event) => setSkill(event.target.value)}>{["全部席位", "交互设计", "北京地方史", "Agent 评测", "Demo 叙事", "全栈开发", "数据治理"].map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="team-board">{visibleTeams.map((team) => <article key={team.name}><div className="team-stage"><span>{team.challenge}</span><b>{team.stage}</b></div><h2>{team.name}</h2><p>{team.pitch}</p><div className="team-progress"><i><em style={{ width: `${team.progress}%` }} /></i><span>Demo {team.progress}%</span><time>{team.deadline}</time></div><div className="seat-map"><div><small>已就座</small>{team.members.map((member) => <b key={member}><CheckCircle2 size={13} />{member}</b>)}</div><div><small>空缺席位</small>{team.open.map((seat) => <b className="open" key={seat}><UsersRound size={13} />{seat}</b>)}</div></div><footer><div>{team.tech.map((item) => <span key={item}>{item}</span>)}</div><button onClick={() => setJoined((current) => current.includes(team.name) ? current : [...current, team.name])}>{joined.includes(team.name) ? "已提交档案" : "用我的档案申请席位"}</button></footer></article>)}</div><aside><Sparkles size={22} /><h2>组队建议</h2><p>先看队伍已有能力和下一次 Demo 里程碑，再决定加入。这里只提交个人档案，不会自动代表你报名外部比赛。</p><dl><div><dt>你的优势</dt><dd>AI 产品 / 数据 / 叙事</dd></div><div><dt>优先席位</dt><dd>产品、路演、数据验证</dd></div><div><dt>最匹配队伍</dt><dd>中轴叙事引擎 · 94%</dd></div></dl></aside></section>}

    {zone === "dev" && <section className="dev-bounty-table"><header><div><FlaskConical size={21} /><span><b>可领取的验证任务</b><small>奖励在验收后结算，演示版不产生真实支付</small></span></div><button><ShieldCheck size={16} />查看验收规则</button></header><div className="bounty-lanes"><div className="bounty-column"><h2>待领取 <span>{tasks.filter((task) => !claimed.includes(task.id)).length}</span></h2>{tasks.filter((task) => !claimed.includes(task.id)).map((task) => <article key={task.id}><div><span>{task.type}</span><b><Coins size={14} />{task.reward} 积分 {task.money}</b></div><h3>{task.title}</h3><a href={`https://github.com/${task.repo}`} target="_blank" rel="noreferrer"><Github size={14} />{task.repo}</a><dl><dt>验收条件</dt>{task.acceptance.map((item) => <dd key={item}><CheckCircle2 size={12} />{item}</dd>)}</dl><footer><span><Clock3 size={13} />{task.due}</span><button onClick={() => setClaimed((current) => [...current, task.id])}>领取任务</button></footer></article>)}</div><div className="bounty-column active"><h2>我的工作台 <span>{claimed.length}</span></h2>{claimed.length ? tasks.filter((task) => claimed.includes(task.id)).map((task) => <article key={task.id}><div><span>IN PROGRESS</span><b>{task.reward} 积分</b></div><h3>{task.title}</h3><p>负责人：{task.owner}</p><label>上传证据<input type="file" accept="image/*,.txt,.md,.log" /></label><button className="submit-proof">提交验收证据</button></article>) : <div className="empty-bench"><Code2 size={28} /><b>还没有领取任务</b><span>从左侧选择一个有明确验收条件的任务。</span></div>}</div></div><aside><BriefcaseBusiness size={22} /><h2>发布悬赏</h2><input placeholder="任务标题" /><textarea placeholder="写清复现环境、交付物和验收标准" /><div><label>积分<input type="number" defaultValue={100} /></label><label>红包 ¥<input type="number" defaultValue={0} /></label></div><button>发布到开发桌</button></aside></section>}

    {zone === "social" && <section className="social-match-table"><aside><div><Search size={20} /><span><b>离线匹配 Agent</b><small>依据公开主页与作品标签初筛</small></span></div><label>我想遇见<textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} /></label><label className="agent-switch"><span><b>离线时继续寻找</b><small>首版只计算匹配，不让 Agent 私自对话</small></span><input type="checkbox" checked={agentOn} onChange={(event) => setAgentOn(event.target.checked)} /></label>{agentOn && <p><Sparkles size={14} />Agent 已记录条件；有新候选时将在城内通知。</p>}</aside><div className="match-list"><header><div><HeartHandshake size={20} /><span><b>推荐会面</b><small>匹配原因必须能落到作品与能力证据</small></span></div><span>{people.length} 位候选</span></header>{people.map((person) => <article key={person.handle}><div className="match-score"><b>{person.match}</b><small>MATCH</small></div><div className="match-person"><span>PUBLIC GITHUB PROFILE</span><h2>{person.name}</h2><p>{person.title}</p><div>{person.offers.map((item) => <b key={item}>{item}</b>)}</div><blockquote>{person.reason}</blockquote><dl><div><dt>可以提供</dt><dd>{person.offers.join(" / ")}</dd></div><div><dt>正在寻找</dt><dd>{person.seeks.join(" / ")}</dd></div><div><dt>作品证据</dt><dd>{person.projects.join(" / ")}</dd></div></dl></div><div className="match-actions"><a href={`/creator`}><UsersRound size={15} />查看展厅档案</a><a href={`https://github.com/${person.handle}`} target="_blank" rel="noreferrer"><Github size={15} />GitHub</a><button>发起会面邀请</button></div></article>)}</div></section>}
  </main>;
}
