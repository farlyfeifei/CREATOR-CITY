"use client";

import Image from "next/image";
import { useState } from "react";
import { projectsMuseum } from "@/data/mockData";

const competitions = [
  { name: "Agent 城市挑战赛", date: "07.26 - 07.28", reward: "¥ 30,000", theme: "多 Agent 协作", people: 186, status: "报名中" },
  { name: "开源创作周末", date: "08.02 - 08.03", reward: "10,000 积分", theme: "创作者工具", people: 94, status: "组队中" },
  { name: "AI for Beijing", date: "08.16 - 08.18", reward: "Demo Day", theme: "城市公共体验", people: 238, status: "即将开始" },
];

const teamSignals = [
  { name: "Turing Hutong", need: "交互设计", stack: ["Agent", "Next.js"], match: 92 },
  { name: "北海编译所", need: "Python / RAG", stack: ["Research", "Data"], match: 87 },
  { name: "中轴创作组", need: "产品与路演", stack: ["Remotion", "Story"], match: 83 },
];

export default function ProjectsPage() {
  const [view, setView] = useState<"board" | "teams" | "demos">("board");
  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-[#18231f] pb-4"><div><p className="font-mono text-xs font-black text-[#d94b3f]">HACKATHON HUB</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">黑客松会馆</h1></div><a className="pixel-button secondary inline-flex min-h-11 items-center px-4 text-sm" href="/city/neon">← 返回城市</a></header>
        <nav className="mt-6 flex flex-wrap gap-2">{[["board", "比赛公告"], ["teams", "AI 组队"], ["demos", "Demo 展示"]].map(([id, label]) => <button key={id} type="button" onClick={() => setView(id as "board" | "teams" | "demos")} className={`min-h-11 border-[3px] border-[#18231f] px-4 font-black ${view === id ? "bg-[#ffd64f] shadow-[3px_3px_0_#18231f]" : "bg-white"}`}>{label}</button>)}</nav>

        {view === "board" && <section className="mt-7 grid gap-4 lg:grid-cols-3">{competitions.map((competition, index) => <article className="pixel-panel overflow-hidden" key={competition.name}><div className={`h-4 ${index === 0 ? "bg-[#d94b3f]" : index === 1 ? "bg-[#42c8c4]" : "bg-[#7256a8]"}`} /><div className="p-5"><div className="flex items-start justify-between gap-3"><span className="pixel-chip bg-[#fff9df]">{competition.status}</span><Image src="/pixel-icons/gift.png" width={36} height={36} className="pixel-icon" alt="" /></div><h2 className="mt-4 text-xl font-black">{competition.name}</h2><p className="mt-1 font-mono text-xs font-black text-[#d94b3f]">{competition.date}</p><dl className="mt-5 space-y-3 border-t-[3px] border-[#18231f] pt-4 text-sm"><div className="flex justify-between"><dt className="font-bold text-[#607068]">主题</dt><dd className="font-black">{competition.theme}</dd></div><div className="flex justify-between"><dt className="font-bold text-[#607068]">奖励</dt><dd className="font-black text-[#d94b3f]">{competition.reward}</dd></div><div className="flex justify-between"><dt className="font-bold text-[#607068]">报名</dt><dd className="font-mono font-black">{competition.people} 人</dd></div></dl><button className="pixel-button red mt-5 w-full px-4" type="button">查看赛题并报名</button></div></article>)}</section>}

        {view === "teams" && <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_330px]"><div className="space-y-3">{teamSignals.map((team) => <article className="grid gap-4 border-[3px] border-[#18231f] bg-white p-5 shadow-[3px_3px_0_#18231f] sm:grid-cols-[1fr_auto] sm:items-center" key={team.name}><div><p className="font-mono text-[10px] font-black text-[#236b5b]">TEAM SIGNAL</p><h2 className="mt-1 text-lg font-black">{team.name}</h2><p className="mt-2 text-sm font-bold text-[#607068]">当前缺口：<span className="text-[#d94b3f]">{team.need}</span></p><div className="mt-3 flex gap-2">{team.stack.map((item) => <span className="pixel-chip bg-[#edf6f0]" key={item}>{item}</span>)}</div></div><div className="text-center"><div className="font-mono text-3xl font-black text-[#236b5b]">{team.match}%</div><div className="text-xs font-bold text-[#607068]">能力匹配</div><button className="pixel-button mt-3 px-4 text-sm" type="button">申请加入</button></div></article>)}</div><aside className="pixel-panel pixel-panel-cool p-5"><Image src="/pixel-icons/robot.png" width={46} height={46} className="pixel-icon" alt="" /><h2 className="mt-3 text-lg font-black">AI 组队助手</h2><p className="mt-2 text-sm leading-6 text-[#607068]">依据技能、项目方向与兴趣，从报名者中找出互补队友。</p><button className="pixel-button jade mt-5 w-full px-4 text-sm" type="button">读取我的档案</button></aside></section>}

        {view === "demos" && <section className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{projectsMuseum.map((project, index) => <article className="pixel-panel bg-white p-5" key={project.id}><div className="flex items-center justify-between"><div className="grid h-12 w-12 place-items-center border-[3px] border-[#18231f] font-mono text-lg font-black text-white" style={{ backgroundColor: project.cover }}>{String(index + 1).padStart(2, "0")}</div><span className="pixel-chip bg-[#fff9df]">{project.category}</span></div><h2 className="mt-4 text-lg font-black">{project.title}</h2><p className="text-xs font-bold text-[#236b5b]">BY {project.author}</p><p className="mt-3 text-sm leading-6 text-[#607068]">{project.desc}</p><div className="mt-4 flex flex-wrap gap-2">{project.tech.map((tech) => <span className="pixel-chip bg-[#dff5f2]" key={tech}>{tech}</span>)}</div><button className="pixel-button secondary mt-5 w-full px-4 text-sm" type="button">查看 Demo →</button></article>)}</section>}
      </div>
    </main>
  );
}
