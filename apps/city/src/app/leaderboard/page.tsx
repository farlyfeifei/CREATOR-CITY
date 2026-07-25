"use client";

import { ArrowLeft, ArrowUpRight, BrainCircuit, Braces, CircleDollarSign, Gauge, Layers3, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Model = { id: string; name: string; shortName: string; org: string; coding: number; reasoning: number; agent: number; multimodal: number; speed: number; overall: number; input: number; output: number; context: number; use: string; sourceUrl: string };
type RankKey = "overall" | "coding" | "reasoning" | "agent" | "multimodal" | "speed" | "input" | "output" | "context";

const fallback: Model[] = [
  { id: "openai/gpt-5.6-sol", name: "GPT-5.6 Sol", shortName: "GPT-5.6 Sol", org: "OpenAI", coding: 98, reasoning: 97, agent: 98, multimodal: 91, speed: 72, overall: 91, input: 5, output: 30, context: 1050000, use: "复杂工程与长程 Agent", sourceUrl: "https://openrouter.ai/openai/gpt-5.6-sol" },
  { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5", shortName: "Claude Sonnet 5", org: "Anthropic", coding: 96, reasoning: 96, agent: 95, multimodal: 90, speed: 80, overall: 91, input: 2, output: 10, context: 1000000, use: "代码、长文与工具调用", sourceUrl: "https://openrouter.ai/anthropic/claude-sonnet-5" },
  { id: "google/gemini-3.6-flash", name: "Gemini 3.6 Flash", shortName: "Gemini 3.6 Flash", org: "Google", coding: 90, reasoning: 89, agent: 88, multimodal: 96, speed: 96, overall: 92, input: 1.5, output: 7.5, context: 1048576, use: "高速多模态与长上下文", sourceUrl: "https://openrouter.ai/google/gemini-3.6-flash" },
  { id: "qwen/qwen3.7-plus", name: "Qwen3.7 Plus", shortName: "Qwen3.7 Plus", org: "Qwen", coding: 91, reasoning: 91, agent: 89, multimodal: 86, speed: 91, overall: 90, input: .32, output: 1.28, context: 1000000, use: "中文、工具调用与高性价比", sourceUrl: "https://openrouter.ai/qwen/qwen3.7-plus" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", shortName: "DeepSeek V3.2", org: "DeepSeek", coding: 92, reasoning: 91, agent: 88, multimodal: 70, speed: 90, overall: 86, input: .269, output: .4, context: 163840, use: "编码与批量文本任务", sourceUrl: "https://openrouter.ai/deepseek/deepseek-v3.2" },
];

const ranks: { id: RankKey; label: string; note: string; icon: typeof Sparkles; lowWins?: boolean }[] = [
  { id: "overall", label: "综合榜", note: "五维均衡", icon: Sparkles }, { id: "coding", label: "编程榜", note: "仓库与代码", icon: Braces }, { id: "reasoning", label: "推理榜", note: "复杂分析", icon: BrainCircuit },
  { id: "agent", label: "Agent 榜", note: "工具与规划", icon: Layers3 }, { id: "multimodal", label: "多模态榜", note: "图文理解", icon: Gauge }, { id: "input", label: "输入价格榜", note: "低价优先", icon: CircleDollarSign, lowWins: true },
  { id: "speed", label: "速度榜", note: "响应效率", icon: Gauge }, { id: "output", label: "输出价格榜", note: "低价优先", icon: CircleDollarSign, lowWins: true }, { id: "context", label: "上下文榜", note: "容量优先", icon: Layers3 },
];

const formatPrice = (value: number) => `$${value < 1 ? value.toFixed(3) : value.toFixed(2)}`;
const formatContext = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(value % 1_000_000 ? 2 : 0)}M` : `${Math.round(value / 1000)}K`;

export default function LeaderboardPage() {
  const [models, setModels] = useState(fallback);
  const [rank, setRank] = useState<RankKey>("overall");
  const [selectedId, setSelectedId] = useState(fallback[0].id);
  const [source, setSource] = useState("OpenRouter snapshot");
  const [fetchedAt, setFetchedAt] = useState("");

  useEffect(() => { fetch("/api/models").then((response) => response.json()).then((result) => { if (result.ok && result.data?.length) { setModels(result.data); setSource(result.source); setFetchedAt(result.fetchedAt); } }).catch(() => undefined); }, []);
  const activeRank = ranks.find((item) => item.id === rank)!;
  const sorted = useMemo(() => [...models].sort((a, b) => activeRank.lowWins ? a[rank] - b[rank] : b[rank] - a[rank]), [models, rank, activeRank.lowWins]);
  const selected = models.find((model) => model.id === selectedId) || sorted[0];
  const valueFor = (model: Model) => rank === "input" || rank === "output" ? formatPrice(model[rank]) : rank === "context" ? formatContext(model.context) : String(model[rank]);

  return <main className="model-arena min-h-screen bg-[#f4f1e8] text-[#18231f]">
    <header className="border-b border-[#18231f]/20 bg-[#132621] text-white"><div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-5 px-5 py-7 sm:px-9"><div><p className="text-xs font-bold text-[#79d8c3]">MODEL ARENA / LIVE CATALOG</p><h1 className="mt-2 text-3xl font-bold sm:text-5xl">不是一张总榜，而是九种选择模型的方法</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">价格与上下文来自 OpenRouter 公开目录；能力分数是 Creator City 编辑评测样本，用于产品选型对比，不代表官方 benchmark。</p></div><a className="studio-button light" href="/city/neon"><ArrowLeft size={16} />返回城市</a></div></header>
    <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-9">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ranks.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setRank(item.id)} className={`model-rank-tab ${rank === item.id ? "active" : ""}`}><Icon size={19} /><span><strong>{item.label}</strong><small>{item.note}</small></span></button>; })}</section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#607068]"><span>价格单位：USD / 1M tokens · 数据：{source}</span><span>{fetchedAt ? `刷新于 ${new Date(fetchedAt).toLocaleString("zh-CN")}` : "正在连接公开目录"}</span></div>
      <section className="mt-3 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-x-auto border border-[#18231f]/20 bg-white"><table className="w-full min-w-[1050px] border-collapse text-left text-sm"><thead><tr><th>排名</th><th>模型</th><th>{activeRank.label}</th><th>编程</th><th>推理</th><th>Agent</th><th>多模态</th><th>速度</th><th>输入</th><th>输出</th><th>上下文</th></tr></thead><tbody>{sorted.map((model, index) => <tr key={model.id} onClick={() => setSelectedId(model.id)} className={selected.id === model.id ? "selected" : ""}><td><strong>{String(index + 1).padStart(2, "0")}</strong></td><td><b>{model.shortName}</b><small>{model.org}</small></td><td><span className="rank-value">{valueFor(model)}</span></td><td>{model.coding}</td><td>{model.reasoning}</td><td>{model.agent}</td><td>{model.multimodal}</td><td>{model.speed}</td><td>{formatPrice(model.input)}</td><td>{formatPrice(model.output)}</td><td>{formatContext(model.context)}</td></tr>)}</tbody></table></div>
        <aside className="model-dossier xl:sticky xl:top-5"><div className="flex items-center justify-between"><span>{selected.org}</span><b>#{sorted.findIndex((item) => item.id === selected.id) + 1}</b></div><h2>{selected.shortName}</h2><p>{selected.use}</p><div className="model-radar-grid">{(["coding", "reasoning", "agent", "multimodal", "speed"] as const).map((key) => <div key={key}><span>{({ coding: "编程", reasoning: "推理", agent: "Agent", multimodal: "多模态", speed: "速度" })[key]}</span><i><em style={{ width: `${selected[key]}%` }} /></i><b>{selected[key]}</b></div>)}</div><dl><div><dt>输入价格</dt><dd>{formatPrice(selected.input)}</dd></div><div><dt>输出价格</dt><dd>{formatPrice(selected.output)}</dd></div><div><dt>上下文</dt><dd>{formatContext(selected.context)}</dd></div></dl><a href={selected.sourceUrl} target="_blank" rel="noreferrer">查看目录与供应商 <ArrowUpRight size={16} /></a></aside>
      </section>
      <p className="mt-6 flex items-center gap-2 text-xs text-[#607068]"><RefreshCw size={14} />能力维度是站内演示性评测，可在后续接入 Artificial Analysis、SWE-bench 或团队自己的任务集。</p>
    </div>
  </main>;
}
