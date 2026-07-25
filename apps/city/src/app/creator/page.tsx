"use client";

import { Player } from "@remotion/player";
import { ArrowLeft, ArrowUpRight, Clapperboard, GitFork as Github, Grid2X2, Play, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { publicProfiles } from "@/data/publicProfiles";
import { CreatorIntro, type CreatorIntroProps } from "@/remotion/CreatorIntro";
import { buildCreatorStoryboard, getStoryboardDuration } from "@/remotion/storyboard";

export default function CreatorGalleryPage() {
  const [activeId, setActiveId] = useState(publicProfiles[0].id);
  const [view, setView] = useState<"film" | "archive">("film");
  const active = publicProfiles.find((profile) => profile.id === activeId) || publicProfiles[0];
  const storyboard = useMemo(() => buildCreatorStoryboard(active), [active]);
  const props: CreatorIntroProps = { storyboard };
  return <main className="creator-gallery min-h-screen bg-[#0c1211] text-white">
    <header><div><p>CREATOR FILM ARCHIVE / PUBLIC GITHUB CASES</p><h1>创作者展厅</h1><span>动态主页影片与结构化项目档案并列展示</span></div><a href="/city/neon"><ArrowLeft size={16} />返回城市</a></header>
    <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-9">
      <div className="gallery-tabs"><button className={view === "film" ? "active" : ""} onClick={() => setView("film")}><Clapperboard size={17} />影片放映</button><button className={view === "archive" ? "active" : ""} onClick={() => setView("archive")}><Grid2X2 size={17} />静态档案</button><span><UsersRound size={16} />{publicProfiles.length} 位创作者 / 团队</span></div>
      <nav className="creator-rail">{publicProfiles.map((profile, index) => <button key={profile.id} onClick={() => setActiveId(profile.id)} className={active.id === profile.id ? "active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><b>{profile.name}</b><small>{profile.title}</small><Play size={15} /></button>)}</nav>
      {view === "film" ? <section className="gallery-screen"><div className="gallery-player"><Player component={CreatorIntro} inputProps={props} durationInFrames={getStoryboardDuration(storyboard)} fps={storyboard.fps} compositionWidth={1280} compositionHeight={720} controls loop style={{ width: "100%", aspectRatio: "16 / 9" }} /></div><aside><p>NOW SCREENING</p><h2>{active.name}</h2><strong>{active.title}</strong><span>{active.bio}</span><dl>{active.metrics.slice(0, 3).map((metric) => <div key={metric.id}><dt>{metric.label}</dt><dd>{metric.value}</dd><small>{metric.context}</small></div>)}</dl><a href={`https://github.com/${active.githubUsername}`} target="_blank" rel="noreferrer"><Github size={16} />{active.githubUsername}<ArrowUpRight size={15} /></a></aside></section> : <section className="creator-archive"><header><div><p>SELECTED PROFILE</p><h2>{active.name}</h2><span>{active.narrative}</span></div><a href={`https://github.com/${active.githubUsername}`} target="_blank" rel="noreferrer">公开 GitHub <ArrowUpRight size={16} /></a></header><div>{active.projects.map((project, index) => <article key={project.id}><span>{String(index + 1).padStart(2, "0")}</span><div><p>{project.role}</p><h3>{project.name}</h3><b>{project.desc}</b><div>{project.tech.map((tech) => <small key={tech}>{tech}</small>)}</div></div>{project.mediaType === "image" && project.mediaUrl ? <img src={project.mediaUrl} alt="" /> : <div className="archive-flow">{project.architecture.slice(0, 4).map((node) => <i key={node}>{node}</i>)}</div>}<a href={project.url} target="_blank" rel="noreferrer"><ArrowUpRight size={18} /></a></article>)}</div></section>}
      <p className="gallery-source-note">档案只引用公开 GitHub 仓库信息；星标是标注日期的快照。qybaihe、OpenHands、browser-use 与 Creator City 无隶属或合作背书关系。</p>
    </div>
  </main>;
}
