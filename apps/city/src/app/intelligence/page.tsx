"use client";

import { ArrowLeft, ArrowUpRight, Bot, Code2, Newspaper, Radio, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { githubRadar } from "@/data/mockData";

type NewsItem = { id: string; title: string; url: string; source: string; publishedAt: string; summary: string; category: "AI" | "CODING" | "AGENT" | "GITHUB" };
type Repo = { id: string | number; name: string; url?: string; stars: number; forks: number; lang: string; summary: string; tags: string[]; pushedAt?: string };
const snapshots: NewsItem[] = [
  { id: "codex", title: "openai/codex 持续更新本地编码 Agent", url: "https://github.com/openai/codex", source: "GitHub", publishedAt: "2026-07-24", summary: "观察终端执行、权限审批、工具调用与可复现工作流。", category: "CODING" },
  { id: "agents", title: "OpenAI Agent 构建工具与实践", url: "https://openai.com/index/new-tools-for-building-agents/", source: "OpenAI", publishedAt: "2025-03-11", summary: "官方 Agent 产品与开发工具入口。", category: "AGENT" },
  { id: "copilot", title: "GitHub Copilot 与 coding agent 更新", url: "https://github.blog/ai-and-ml/github-copilot/", source: "GitHub Blog", publishedAt: "2026-07", summary: "面向开发流程、代码审查与 Agent 协作的官方更新。", category: "CODING" },
];
const filters = ["ALL", "AI", "CODING", "AGENT", "GITHUB"] as const;

export default function IntelligencePage() {
  const [news, setNews] = useState(snapshots);
  const [repos, setRepos] = useState<Repo[]>(githubRadar.map((item) => ({ ...item, url: `https://github.com/${item.name}` })));
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const [fetchedAt, setFetchedAt] = useState("");
  useEffect(() => { Promise.allSettled([fetch("/api/news").then((r) => r.json()), fetch("/api/github/trending").then((r) => r.json())]).then(([newsResult, repoResult]) => { if (newsResult.status === "fulfilled" && newsResult.value.ok) { setNews(newsResult.value.data); setFetchedAt(newsResult.value.fetchedAt); } if (repoResult.status === "fulfilled" && repoResult.value.ok) setRepos(repoResult.value.data.flatMap((group: { repos: Repo[] }) => group.repos).slice(0, 10)); }); }, []);
  const visible = useMemo(() => filter === "ALL" ? news : news.filter((item) => item.category === filter), [news, filter]);
  return <main className="intel-desk min-h-screen bg-[#eef0eb] text-[#18231f]">
    <header><div><p>AI / CODING / AGENT SIGNAL DESK</p><h1>最新资讯不是公告，是可追溯的信号流</h1><span>聚合 OpenAI RSS、GitHub Blog RSS 与 GitHub Search API</span></div><a href="/city/neon"><ArrowLeft size={16} />返回城市</a></header>
    <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-9">
      <div className="flex flex-wrap items-center justify-between gap-4"><nav>{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}</button>)}</nav><small className="flex items-center gap-2"><RefreshCw size={13} />{fetchedAt ? new Date(fetchedAt).toLocaleString("zh-CN") : "读取公开源中"}</small></div>
      <section className="intel-stream mt-6"><div className="intel-lead"><Radio size={20} /><span>LIVE SIGNAL</span><b>{visible.length}</b></div>{visible.map((item, index) => <article key={item.id}><div className="intel-index">{String(index + 1).padStart(2, "0")}</div><div><p><span>{item.category}</span>{item.source} · {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("zh-CN") : "持续更新"}</p><h2>{item.title}</h2><p className="summary">{item.summary || "打开来源查看完整内容。"}</p></div><a href={item.url} target="_blank" rel="noreferrer" title="打开原始来源"><ArrowUpRight size={20} /></a></article>)}</section>
      <section className="github-radar"><div className="section-title"><div><Code2 size={20} /><span>GITHUB PUSH RADAR</span></div><p>按 AI Agent、AI Coding、RAG、Multimodal 主题读取公开仓库</p></div><div className="github-radar-grid">{repos.map((repo) => <article key={`${repo.id}-${repo.name}`}><div><Bot size={18} /><span>{repo.lang}</span><b>★ {repo.stars.toLocaleString()}</b></div><a href={repo.url} target="_blank" rel="noreferrer">{repo.name}</a><p>{repo.summary}</p><footer>{repo.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}{repo.pushedAt && <time>{new Date(repo.pushedAt).toLocaleDateString("zh-CN")}</time>}</footer></article>)}</div></section>
      <a className="skill-garden-callout" href="/skills"><Newspaper size={22} /><span><b>Skill 花园已经独立开放</b><small>工作流、适用任务、安装命令与来源仓库</small></span><ArrowUpRight size={18} /></a>
    </div>
  </main>;
}
