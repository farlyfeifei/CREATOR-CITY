"use client";
import { ArrowLeft, ArrowUpRight, Check, Copy, Flower2, Sprout } from "lucide-react";
import { useState } from "react";

const skills = [
  { name: "Remotion Best Practices", type: "VIDEO", source: "remotion-dev/skills", desc: "用帧驱动动画、媒体时间线和可渲染组件生成程序化视频。", tasks: ["个人介绍片", "数据视频", "批量模板"], install: "npx skills add remotion-dev/skills" },
  { name: "Browser Use", type: "AGENT", source: "browser-use/browser-use", desc: "让 Agent 浏览和操作网页，适合调研、测试与流程自动化。", tasks: ["浏览器自动化", "网页测试", "信息采集"], install: "pip install browser-use" },
  { name: "OpenAI Codex", type: "CODING", source: "openai/codex", desc: "在真实仓库中读取、修改和验证代码的编码 Agent。", tasks: ["代码实现", "仓库理解", "测试修复"], install: "npm install -g @openai/codex" },
  { name: "LangGraph", type: "WORKFLOW", source: "langchain-ai/langgraph", desc: "把有状态、可恢复的 Agent 编排成图。", tasks: ["多 Agent", "审批节点", "持久状态"], install: "pip install -U langgraph" },
  { name: "MCP Servers", type: "TOOLS", source: "modelcontextprotocol/servers", desc: "用标准协议把数据源和工具接入模型。", tasks: ["工具连接", "数据边界", "资源发现"], install: "npx @modelcontextprotocol/server-everything" },
  { name: "CrewAI", type: "AGENT", source: "crewAIInc/crewAI", desc: "以角色和任务组织多 Agent 协作流程。", tasks: ["研究团队", "内容流水线", "任务委派"], install: "pip install crewai" },
];
export default function SkillsPage() { const [copied, setCopied] = useState(""); const copy = async (value: string) => { await navigator.clipboard.writeText(value); setCopied(value); }; return <main className="skill-garden-page min-h-screen"><header><div><Flower2 size={27} /><span><small>WORKFLOW BOTANICAL GARDEN</small><h1>Skill 花园</h1><p>每一株都对应一个真实工作流、来源仓库和安装入口。</p></span></div><a href="/city/neon"><ArrowLeft size={16} />返回城市</a></header><section>{skills.map((skill, index) => <article key={skill.name}><div className="skill-stem"><Sprout size={28} /><i style={{ height: `${45 + index * 7}px` }} /></div><div className="skill-copy"><span>{skill.type} / SPECIMEN {String(index + 1).padStart(2, "0")}</span><h2>{skill.name}</h2><p>{skill.desc}</p><div>{skill.tasks.map((task) => <b key={task}>{task}</b>)}</div><footer><code>{skill.install}</code><button onClick={() => copy(skill.install)} title="复制安装命令">{copied === skill.install ? <Check size={16} /> : <Copy size={16} />}</button><a href={`https://github.com/${skill.source}`} target="_blank" rel="noreferrer">{skill.source}<ArrowUpRight size={14} /></a></footer></div></article>)}</section></main>; }
