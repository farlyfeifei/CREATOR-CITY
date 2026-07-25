export type CityNewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  category: "AI" | "CODING" | "AGENT" | "GITHUB";
};

export type CityModel = {
  id: string;
  name: string;
  shortName: string;
  org: string;
  coding: number;
  reasoning: number;
  agent: number;
  multimodal: number;
  speed: number;
  overall: number;
  input: number;
  output: number;
  context: number;
  use: string;
  sourceUrl: string;
};

export const newsFallback: CityNewsItem[] = [
  { id: "codex", title: "openai/codex 持续更新本地编码 Agent", url: "https://github.com/openai/codex", source: "GitHub", publishedAt: "2026-07-24", summary: "观察终端执行、权限审批、工具调用与可复现工作流。", category: "CODING" },
  { id: "agents", title: "OpenAI Agent 构建工具与实践", url: "https://openai.com/index/new-tools-for-building-agents/", source: "OpenAI", publishedAt: "2025-03-11", summary: "官方 Agent 产品与开发工具入口。", category: "AGENT" },
  { id: "copilot", title: "GitHub Copilot 与 coding agent 更新", url: "https://github.blog/ai-and-ml/github-copilot/", source: "GitHub Blog", publishedAt: "2026-07", summary: "面向开发流程、代码审查与 Agent 协作的官方更新。", category: "CODING" },
];

export const modelFallback: CityModel[] = [
  { id: "openai/gpt-5.6-sol", name: "GPT-5.6 Sol", shortName: "GPT-5.6 Sol", org: "OpenAI", coding: 98, reasoning: 97, agent: 98, multimodal: 91, speed: 72, overall: 91, input: 5, output: 30, context: 1_050_000, use: "复杂工程与长程 Agent", sourceUrl: "https://openrouter.ai/openai/gpt-5.6-sol" },
  { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5", shortName: "Claude Sonnet 5", org: "Anthropic", coding: 96, reasoning: 96, agent: 95, multimodal: 90, speed: 80, overall: 91, input: 2, output: 10, context: 1_000_000, use: "代码、长文与工具调用", sourceUrl: "https://openrouter.ai/anthropic/claude-sonnet-5" },
  { id: "google/gemini-3.6-flash", name: "Gemini 3.6 Flash", shortName: "Gemini 3.6 Flash", org: "Google", coding: 90, reasoning: 89, agent: 88, multimodal: 96, speed: 96, overall: 92, input: 1.5, output: 7.5, context: 1_048_576, use: "高速多模态与长上下文", sourceUrl: "https://openrouter.ai/google/gemini-3.6-flash" },
  { id: "qwen/qwen3.7-plus", name: "Qwen3.7 Plus", shortName: "Qwen3.7 Plus", org: "Qwen", coding: 91, reasoning: 91, agent: 89, multimodal: 86, speed: 91, overall: 90, input: .32, output: 1.28, context: 1_000_000, use: "中文、工具调用与高性价比", sourceUrl: "https://openrouter.ai/qwen/qwen3.7-plus" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", shortName: "DeepSeek V3.2", org: "DeepSeek", coding: 92, reasoning: 91, agent: 88, multimodal: 70, speed: 90, overall: 86, input: .269, output: .4, context: 163_840, use: "编码与批量文本任务", sourceUrl: "https://openrouter.ai/deepseek/deepseek-v3.2" },
];

export const citySkills = [
  { name: "Remotion Best Practices", type: "VIDEO", source: "remotion-dev/skills", desc: "用帧驱动动画、媒体时间线和可渲染组件生成程序化视频。", tasks: ["个人介绍片", "数据视频", "批量模板"], install: "npx skills add remotion-dev/skills" },
  { name: "Browser Use", type: "AGENT", source: "browser-use/browser-use", desc: "让 Agent 浏览和操作网页，适合调研、测试与流程自动化。", tasks: ["浏览器自动化", "网页测试", "信息采集"], install: "pip install browser-use" },
  { name: "OpenAI Codex", type: "CODING", source: "openai/codex", desc: "在真实仓库中读取、修改和验证代码的编码 Agent。", tasks: ["代码实现", "仓库理解", "测试修复"], install: "npm install -g @openai/codex" },
  { name: "LangGraph", type: "WORKFLOW", source: "langchain-ai/langgraph", desc: "把有状态、可恢复的 Agent 编排成图。", tasks: ["多 Agent", "审批节点", "持久状态"], install: "pip install -U langgraph" },
  { name: "MCP Servers", type: "TOOLS", source: "modelcontextprotocol/servers", desc: "用标准协议把数据源和工具接入模型。", tasks: ["工具连接", "数据边界", "资源发现"], install: "npx @modelcontextprotocol/server-everything" },
  { name: "CrewAI", type: "AGENT", source: "crewAIInc/crewAI", desc: "以角色和任务组织多 Agent 协作流程。", tasks: ["研究团队", "内容流水线", "任务委派"], install: "pip install crewai" },
];

export const hackathonTeams = [
  { name: "中轴叙事引擎", challenge: "AI for Beijing", pitch: "把北京街区史料变成可游玩的多模态路线", stage: "PROTOTYPE", members: ["产品 / 星辰", "Agent 工程 / 北辰"], open: ["交互设计", "北京地方史"], tech: ["Remotion", "RAG", "Map"], deadline: "08.16", progress: 62 },
  { name: "Patchwork Agents", challenge: "Open Source AI Hack", pitch: "能在失败后恢复的浏览器协作 Agent", stage: "BUILD", members: ["Python / Ada", "前端 / Ming"], open: ["Agent 评测", "Demo 叙事"], tech: ["Browser Use", "LangGraph"], deadline: "08.03", progress: 74 },
  { name: "回声档案馆", challenge: "Creative AI Weekend", pitch: "把口述史、照片和地点生成可校对的视频档案", stage: "IDEA", members: ["影像 / Lin", "研究 / Xun"], open: ["全栈开发", "数据治理"], tech: ["Whisper", "Remotion"], deadline: "08.09", progress: 35 },
];

export type DevTask = {
  id: number;
  title: string;
  repo: string;
  type: string;
  reward: number;
  money: string;
  acceptance: string[];
  stack: string[];
  owner: string;
  due: string;
};

export const initialDevTasks: DevTask[] = [
  { id: 1, title: "Remotion 中文长标题极限输入回归", repo: "xingchenyd/creator-city", type: "TEST", reward: 180, money: "¥30", acceptance: ["覆盖 12 组输入", "附 3 张失败截图", "提交复现步骤"], stack: ["Playwright", "Remotion"], owner: "星辰", due: "今天 22:00" },
  { id: 2, title: "Windows 中文路径下的 Electron 打包验证", repo: "qybaihe/mooncut", type: "COMPAT", reward: 320, money: "¥66", acceptance: ["Win 11 实机", "首次启动日志", "给出可复现结论"], stack: ["Electron", "Windows"], owner: "qybaihe", due: "07.27" },
  { id: 3, title: "Browser Agent 登录态恢复测试矩阵", repo: "browser-use/browser-use", type: "QA DESIGN", reward: 240, money: "", acceptance: ["定义 8 个状态", "区分可恢复/不可恢复", "输出测试矩阵"], stack: ["Browser", "Agent"], owner: "北海测试所", due: "07.29" },
];

export const creatorMatches = [
  { name: "星辰", handle: "xingchenyd", title: "数据分析 × AI 产品 × 商业分析", offers: ["产品叙事", "数据分析", "Remotion"], seeks: ["Agent 工程", "交互设计"], projects: ["Creator City", "ColorBook", "Scrap Loop"], match: 96, reason: "你们都在做创作者工具；星辰的产品与叙事能力可补足 Agent 工程。" },
  { name: "qybaihe", handle: "qybaihe", title: "AI 视频与跨端产品构建者", offers: ["Remotion", "FFmpeg", "SwiftUI"], seeks: ["AI 产品", "多模态工作流"], projects: ["MoonCut", "Chat Debate"], match: 92, reason: "视频工作流与 Creator City 的个人主页生成链路高度相关。" },
  { name: "browser-use", handle: "browser-use", title: "Browser agent open-source team", offers: ["Browser Automation", "Python", "Agent"], seeks: ["评测", "生态案例"], projects: ["browser-use"], match: 85, reason: "适合作为浏览器 Agent 工程与可靠执行的公开案例连接。" },
  { name: "OpenHands", handle: "OpenHands", title: "AI-driven development community", offers: ["Agent Runtime", "Developer Tools"], seeks: ["开源贡献", "真实任务"], projects: ["OpenHands"], match: 82, reason: "开发测试桌上的任务可以成为真实 Agent 能力评测样本。" },
];

export type CityHackathonEvent = {
  id: string;
  name: string;
  organizer: string;
  date: string;
  deadline: string;
  location: string;
  mode: "ONLINE" | "HYBRID" | "IN PERSON";
  status: "报名中" | "即将开放" | "活动入口";
  tags: string[];
  registrationUrl: string;
  sourceUrl: string;
};

export const competitions: CityHackathonEvent[] = [
  {
    id: "mlh-global-hack-week-agents",
    name: "Global Hack Week: Agents",
    organizer: "Major League Hacking",
    date: "2026.08.07 - 08.13",
    deadline: "官方报名开放",
    location: "全球线上",
    mode: "ONLINE",
    status: "报名中",
    tags: ["AI AGENT", "GLOBAL", "BEGINNER FRIENDLY"],
    registrationUrl: "https://events.mlh.io/events/14312-global-hack-week-agents",
    sourceUrl: "https://www.mlh.com/seasons/2027/events",
  },
  {
    id: "mlh-global-hack-week-data",
    name: "Global Hack Week: Data",
    organizer: "Major League Hacking",
    date: "2026.09.11 - 09.17",
    deadline: "官方报名开放",
    location: "全球线上",
    mode: "ONLINE",
    status: "报名中",
    tags: ["DATA", "AI", "GLOBAL"],
    registrationUrl: "https://events.mlh.io/events/14416-global-hack-week-data",
    sourceUrl: "https://www.mlh.com/seasons/2027/events",
  },
  {
    id: "devpost-ai-hackathons",
    name: "Devpost AI Hackathons",
    organizer: "Devpost",
    date: "持续更新",
    deadline: "按赛事截止时间排序",
    location: "全球 / 线上与线下",
    mode: "HYBRID",
    status: "活动入口",
    tags: ["MACHINE LEARNING", "OPEN SOURCE", "PRODUCT"],
    registrationUrl: "https://devpost.com/hackathons?themes[]=Machine%20Learning%2FAI",
    sourceUrl: "https://devpost.com/hackathons",
  },
  {
    id: "hackquest-hackathons",
    name: "HackQuest Hackathons",
    organizer: "HackQuest",
    date: "持续更新",
    deadline: "查看当前报名窗口",
    location: "全球 / 线上与线下",
    mode: "HYBRID",
    status: "活动入口",
    tags: ["AI", "WEB3", "OPEN SOURCE"],
    registrationUrl: "https://www.hackquest.io/hackathons",
    sourceUrl: "https://www.hackquest.io/hackathons",
  },
];

export const hallTeamSignals = [
  { name: "Turing Hutong", need: "交互设计", stack: ["Agent", "Next.js"], match: 92 },
  { name: "北海编译所", need: "Python / RAG", stack: ["Research", "Data"], match: 87 },
  { name: "中轴创作组", need: "产品与路演", stack: ["Remotion", "Story"], match: 83 },
];
