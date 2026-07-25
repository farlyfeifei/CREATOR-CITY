import { Video } from "@remotion/media";
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ProjectScene as ProjectSceneData } from "../storyboard";
import { clip, colors, enter, fonts, SceneCanvas, SourceBadge } from "./shared";

type Clip = ProjectSceneData["mediaClips"][number];
type StoryBeat = ProjectSceneData["storyBeats"][number];

const phaseLabels: Record<StoryBeat["phase"], string> = {
  hook: "OPENING SIGNAL",
  context: "CONTEXT",
  action: "BUILD",
  evidence: "EVIDENCE",
  result: "OUTCOME",
  reflection: "METHOD",
};

const purposeLabels: Record<string, string> = {
  demo: "LIVE DEMO",
  pitch: "PITCH RECORD",
  evidence: "PROOF",
  process: "PROCESS",
  photo: "VISUAL NOTE",
  document: "DOCUMENT",
  resume: "PROFILE",
};

const mediaSource = (src: string) => src.startsWith("/") ? staticFile(src.slice(1)) : src;
const clampTiming = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const metricTokens = (beat: StoryBeat) => {
  const source = `${beat.title} ${beat.body} ${beat.keywords.join(" ")}`;
  const arrow = source.match(/\d+(?:\.\d+)?\s*(?:→|->)\s*\d+(?:\.\d+)?/);
  if (arrow) return arrow[0].replace("->", "→");
  return source.match(/\d+(?:\.\d+)?(?:\s*(?:%|倍|万|K|k|分|项))?/)?.[0]
    || clip(beat.keywords.find((keyword) => keyword.length <= 12) || beat.keywords[0] || "已完成", 12);
};

const keywordSet = (beat: StoryBeat, scene: ProjectSceneData) => {
  const values = [...beat.keywords, ...scene.tech, ...scene.highlights];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 5);
};

function NetworkGraphic({ beat, scene, frame }: { beat: StoryBeat; scene: ProjectSceneData; frame: number }) {
  const nodes = keywordSet(beat, scene).slice(0, 5);
  const positions = [[18, 24], [68, 16], [78, 66], [34, 76], [48, 45]];
  const lineProgress = interpolate(frame, [5, 34], [0, 1], { ...clampTiming, easing: Easing.bezier(.16, 1, .3, 1) });
  return <div style={{ position: "relative", width: "100%", height: "100%" }}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
      {positions.slice(0, Math.max(2, nodes.length)).map((position, index) => {
        if (index === 0) return null;
        return <line key={index} x1={positions[index - 1][0]} y1={positions[index - 1][1]} x2={position[0]} y2={position[1]} stroke={index % 2 ? scene.accent : scene.secondary} strokeWidth=".7" strokeDasharray="100" strokeDashoffset={100 * (1 - lineProgress)} opacity=".72" />;
      })}
    </svg>
    {nodes.map((node, index) => <div key={`${node}-${index}`} style={{ position: "absolute", left: `${positions[index][0]}%`, top: `${positions[index][1]}%`, maxWidth: 118, borderLeft: `3px solid ${index % 2 ? scene.accent : scene.secondary}`, background: "rgba(8,14,13,.78)", padding: "9px 10px", color: "#f8fbfa", fontSize: 11, fontWeight: 800, lineHeight: 1.3, ...enter(frame, 7 + index * 6, 18) }}><small style={{ display: "block", marginBottom: 4, color: index % 2 ? scene.accent : scene.secondary, fontFamily: fonts.mono, fontSize: 7 }}>NODE {String(index + 1).padStart(2, "0")}</small>{clip(node, 18)}</div>)}
  </div>;
}

function WorkflowGraphic({ beat, scene, frame }: { beat: StoryBeat; scene: ProjectSceneData; frame: number }) {
  const steps = (scene.workflow.length ? scene.workflow : keywordSet(beat, scene)).slice(0, 4);
  const progress = interpolate(frame, [4, 42], [0, 1], { ...clampTiming, easing: Easing.bezier(.16, 1, .3, 1) });
  return <div style={{ position: "relative", display: "grid", width: "100%", height: "100%", alignContent: "center", gap: 12, paddingLeft: 18 }}>
    <div style={{ position: "absolute", left: 31, top: "12%", width: 2, height: `${76 * progress}%`, background: scene.secondary, boxShadow: `0 0 18px ${scene.secondary}` }} />
    {steps.map((step, index) => <div key={`${step}-${index}`} style={{ position: "relative", display: "grid", gridTemplateColumns: "32px 1fr", alignItems: "center", gap: 12, minHeight: 46, color: "#eef5f2", ...enter(frame, 5 + index * 7, 22) }}><span style={{ display: "grid", width: 28, height: 28, placeItems: "center", background: index === 0 ? scene.accent : colors.night, border: `2px solid ${index === 0 ? scene.accent : scene.secondary}`, color: "#fff", fontFamily: fonts.mono, fontSize: 8, fontWeight: 900, rotate: `${index % 2 ? 3 : -3}deg` }}>{index + 1}</span><strong style={{ fontSize: 13, lineHeight: 1.35 }}>{clip(step, 28)}</strong></div>)}
  </div>;
}

function MetricGraphic({ beat, scene, frame }: { beat: StoryBeat; scene: ProjectSceneData; frame: number }) {
  const value = metricTokens(beat);
  const progress = interpolate(frame, [4, 32], [0, 1], { ...clampTiming, easing: Easing.bezier(.16, 1, .3, 1) });
  return <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", flexDirection: "column", justifyContent: "center" }}>
    <div style={{ color: scene.accent, fontFamily: fonts.display, fontSize: value.length > 13 ? 42 : 66, lineHeight: .95, opacity: progress, translate: `${(1 - progress) * -26}px 0` }}>{clip(value, 18)}</div>
    <div style={{ position: "relative", width: "92%", height: 9, marginTop: 23, overflow: "hidden", background: "rgba(255,255,255,.1)" }}><div style={{ width: `${progress * 100}%`, height: "100%", background: scene.secondary }} /></div>
    <div style={{ display: "flex", width: "92%", justifyContent: "space-between", marginTop: 8, color: "rgba(255,255,255,.46)", fontFamily: fonts.mono, fontSize: 8 }}><span>INPUT</span><span>VALIDATED OUTPUT</span></div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>{keywordSet(beat, scene).slice(0, 3).map((keyword, index) => <span key={keyword} style={{ borderBottom: `2px solid ${index === 0 ? scene.accent : scene.secondary}`, padding: "6px 2px", color: "#dce6e2", fontSize: 10, fontWeight: 800, ...enter(frame, 12 + index * 6, 14) }}>{clip(keyword, 16)}</span>)}</div>
  </div>;
}

function CompareGraphic({ beat, scene, frame }: { beat: StoryBeat; scene: ProjectSceneData; frame: number }) {
  const numbers = `${beat.body} ${beat.keywords.join(" ")}`.match(/\d+(?:\.\d+)?(?:%|分)?/g)?.slice(0, 2) || [];
  const labels = keywordSet(beat, scene);
  const values = numbers.length >= 2 ? numbers : [labels[0] || "BASE", labels[1] || "NEXT"];
  return <div style={{ display: "grid", width: "100%", height: "100%", gridTemplateColumns: "1fr 52px 1fr", alignItems: "center" }}>
    {values.map((value, index) => <div key={`${value}-${index}`} style={{ order: index * 2, borderTop: `3px solid ${index ? scene.accent : "rgba(255,255,255,.25)"}`, paddingTop: 18, opacity: interpolate(frame, [5 + index * 10, 28 + index * 10], [0, 1], clampTiming), translate: `${index ? 24 : -24}px 0` }}><small style={{ color: "rgba(255,255,255,.48)", fontFamily: fonts.mono, fontSize: 8 }}>{index ? "AFTER / SIGNAL" : "BEFORE / BASE"}</small><div style={{ marginTop: 10, color: index ? scene.accent : "#f2f6f4", fontFamily: fonts.display, fontSize: value.length > 9 ? 25 : 42, lineHeight: 1 }}>{clip(value, 14)}</div></div>)}
    <div style={{ order: 1, color: scene.secondary, fontFamily: fonts.display, fontSize: 32, textAlign: "center", opacity: interpolate(frame, [22, 38], [0, 1], clampTiming) }}>→</div>
  </div>;
}

function FocusGraphic({ beat, scene, frame }: { beat: StoryBeat; scene: ProjectSceneData; frame: number }) {
  const scan = interpolate(frame % 54, [0, 53], [8, 92]);
  const focus = interpolate(frame, [4, 24], [0, 1], { ...clampTiming, easing: Easing.bezier(.16, 1, .3, 1) });
  const bars = [34, 72, 48, 88, 56, 78, 42, 64, 92, 52, 70, 38];
  return <div style={{ position: "relative", width: "100%", height: "100%", border: "1px solid rgba(255,255,255,.13)", background: "rgba(4,10,9,.38)", opacity: focus }}>
    <div style={{ position: "absolute", left: "12%", top: "17%", width: "62%", height: "48%", border: `2px solid ${scene.secondary}`, boxShadow: `0 0 24px ${scene.secondary}33` }}><span style={{ position: "absolute", left: -2, top: -18, background: scene.secondary, padding: "3px 6px", color: colors.night, fontFamily: fonts.mono, fontSize: 7, fontWeight: 900 }}>INPUT MATCH</span></div>
    <div style={{ position: "absolute", left: `${scan}%`, top: 0, width: 1, height: "100%", background: scene.accent, boxShadow: `0 0 18px ${scene.accent}` }} />
    <div style={{ position: "absolute", left: "12%", right: "8%", bottom: 17, display: "flex", alignItems: "end", gap: 4 }}>{bars.map((height, index) => <span key={index} style={{ flex: 1, height: height * interpolate(frame - index, [0, 18], [.18, 1], clampTiming), background: index % 3 === 0 ? scene.accent : "rgba(255,255,255,.26)" }} />)}</div>
    <div style={{ position: "absolute", right: 12, top: 12, maxWidth: 120, color: "rgba(255,255,255,.58)", fontFamily: fonts.mono, fontSize: 8, lineHeight: 1.5, textAlign: "right" }}>{clip(beat.keywords.join(" / "), 34)}</div>
  </div>;
}

function KineticGraphic({ beat, scene, frame }: { beat: StoryBeat; scene: ProjectSceneData; frame: number }) {
  const words = keywordSet(beat, scene).slice(0, 5);
  return <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
    {words.map((word, index) => {
      const progress = interpolate(frame, [3 + index * 5, 24 + index * 5], [0, 1], { ...clampTiming, easing: Easing.bezier(.16, 1, .3, 1) });
      return <div key={`${word}-${index}`} style={{ position: "absolute", left: `${index % 2 ? 24 : 5}%`, top: `${5 + index * 18}%`, maxWidth: "90%", color: index === 0 ? scene.accent : index === 1 ? scene.secondary : "rgba(255,255,255,.82)", fontFamily: fonts.display, fontSize: index === 0 ? 42 : 24 + (index % 2) * 7, lineHeight: 1, opacity: progress, translate: `${(1 - progress) * (index % 2 ? 64 : -64)}px 0`, whiteSpace: "nowrap" }}>{clip(word, 24)}</div>;
    })}
  </div>;
}

function MotionGraphic({ beat, scene, frame }: { beat: StoryBeat; scene: ProjectSceneData; frame: number }) {
  if (beat.visual === "network") return <NetworkGraphic beat={beat} scene={scene} frame={frame} />;
  if (beat.visual === "workflow") return <WorkflowGraphic beat={beat} scene={scene} frame={frame} />;
  if (beat.visual === "metric") return <MetricGraphic beat={beat} scene={scene} frame={frame} />;
  if (beat.visual === "compare") return <CompareGraphic beat={beat} scene={scene} frame={frame} />;
  if (beat.visual === "media-focus") return <FocusGraphic beat={beat} scene={scene} frame={frame} />;
  return <KineticGraphic beat={beat} scene={scene} frame={frame} />;
}

function DocumentStage({ clipData, beat, frame, scene }: { clipData: Clip; beat: StoryBeat; frame: number; scene: ProjectSceneData }) {
  const page = Math.floor(frame / 58) % 3 + 1;
  const reveal = interpolate(frame % 58, [0, 32], [0, 1], clampTiming);
  const keywords = keywordSet(beat, scene).slice(0, 4);
  return <div style={{ display: "grid", width: "100%", height: "100%", placeItems: "center", background: "#d8dddc", padding: 28 }}>
    <div style={{ position: "relative", width: "72%", height: "92%", overflow: "hidden", background: "#fff", boxShadow: "0 26px 65px rgba(0,0,0,.24)", color: colors.ink, padding: "34px 38px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: scene.accent, fontFamily: fonts.mono, fontSize: 9, fontWeight: 900 }}><span>USER DOCUMENT</span><span>0{page} / 03</span></div>
      <div style={{ marginTop: 14, fontFamily: fonts.display, fontSize: 27, lineHeight: 1.1 }}>{clip(clipData.name.replace(/\.[^.]+$/, ""), 32)}</div>
      <div style={{ width: `${78 * reveal}%`, height: 4, marginTop: 17, background: scene.secondary }} />
      <p style={{ margin: "22px 0 0", color: "#4f5956", fontSize: 12, lineHeight: 1.65 }}>{clip(clipData.excerpt || clipData.comment || beat.body, 180)}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 22 }}>{keywords.map((keyword, index) => <div key={keyword} style={{ borderTop: `2px solid ${index === 0 ? scene.accent : "#c8cfcd"}`, paddingTop: 8, color: "#28312f", fontSize: 10, fontWeight: 800, ...enter(frame % 58, 8 + index * 5, 12) }}>{clip(keyword, 18)}</div>)}</div>
      <div style={{ position: "absolute", left: 38, right: 38, bottom: 28, borderLeft: `3px solid ${scene.accent}`, background: "#f0f3f2", padding: "10px 12px", color: "#4b5652", fontSize: 10, lineHeight: 1.5 }}>{clip(beat.body, 86)}</div>
    </div>
  </div>;
}

function VideoStage({ clipData, beat, segmentIndex, segmentCount }: { clipData: Clip; beat: StoryBeat; segmentIndex: number; segmentCount: number }) {
  const { fps } = useVideoConfig();
  const duration = clipData.durationInSeconds || 0;
  const maxOffset = Math.max(0, duration - 1.25);
  const fallbackOffset = duration > 0
    ? Math.min(maxOffset, (duration * segmentIndex) / Math.max(1, segmentCount))
    : segmentIndex * 1.5;
  const offsetInSeconds = Math.max(0, Math.min(maxOffset || beat.trimStartInSeconds || 0, beat.trimStartInSeconds ?? fallbackOffset));
  const clipDuration = beat.trimDurationInSeconds || 3;
  const trimBefore = Math.max(0, Math.floor(offsetInSeconds * fps));
  const trimAfter = duration > 0 ? Math.max(trimBefore + 1, Math.floor(Math.min(duration, offsetInSeconds + clipDuration) * fps)) : undefined;
  return <div style={{ position: "relative", width: "100%", height: "100%", background: "#050807" }}>
    <Video src={mediaSource(clipData.mediaUrl)} muted loop trimBefore={trimBefore} trimAfter={trimAfter} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", scale: 1.006 }} />
    <div style={{ position: "absolute", left: 14, top: 13, display: "flex", alignItems: "center", gap: 7, background: "rgba(5,8,7,.78)", padding: "6px 8px", color: "#fff", fontFamily: fonts.mono, fontSize: 7, fontWeight: 900 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff5d55", boxShadow: "0 0 12px #ff5d55" }} />USER VIDEO · {offsetInSeconds.toFixed(1)}–{(offsetInSeconds + clipDuration).toFixed(1)}s</div>
  </div>;
}

function ImageStage({ clipData, frame }: { clipData: Clip; frame: number }) {
  return <div style={{ display: "grid", width: "100%", height: "100%", placeItems: "center", overflow: "hidden", background: "#e5e9e8" }}>
    <Img src={mediaSource(clipData.mediaUrl)} style={{ width: "100%", height: "100%", objectFit: "contain", scale: interpolate(frame, [0, 120], [1.035, 1], clampTiming) }} />
  </div>;
}

function MediaStage({ clipData, beat, frame, scene, segmentIndex, segmentCount }: { clipData: Clip; beat: StoryBeat; frame: number; scene: ProjectSceneData; segmentIndex: number; segmentCount: number }) {
  if (clipData.mediaType === "video") return <VideoStage beat={beat} clipData={clipData} segmentCount={segmentCount} segmentIndex={segmentIndex} />;
  if (clipData.mediaType === "image") return <ImageStage clipData={clipData} frame={frame} />;
  return <DocumentStage beat={beat} clipData={clipData} frame={frame} scene={scene} />;
}

function MediaFullBeat({ beat, beatFrame, beatIndex, clipData, scene }: { beat: StoryBeat; beatFrame: number; beatIndex: number; clipData: Clip; scene: ProjectSceneData }) {
  const reveal = interpolate(beatFrame, [0, 16], [0, 1], { ...clampTiming, easing: Easing.bezier(.16, 1, .3, 1) });
  return <SceneCanvas background="#050807" color={colors.paper} dark variant="project" accent={scene.accent}>
    <div style={{ position: "absolute", inset: 0, opacity: reveal }}>
      <MediaStage beat={beat} clipData={clipData} frame={beatFrame} scene={scene} segmentCount={Math.max(1, scene.storyBeats.length - 1)} segmentIndex={Math.max(0, beatIndex - 1)} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(3,7,6,.52),transparent 24%,transparent 62%,rgba(3,7,6,.86))" }} />
      <div style={{ position: "absolute", left: 48, right: 48, top: 34, display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff", fontFamily: fonts.mono, fontSize: 9, fontWeight: 900 }}><span>{scene.eyebrow} / REAL EVIDENCE</span><span>{String(beatIndex + 1).padStart(2, "0")} / {String(scene.storyBeats.length).padStart(2, "0")}</span></div>
      <div style={{ position: "absolute", left: 52, right: 52, bottom: 42, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "end", gap: 30 }}>
        <div style={{ borderLeft: `5px solid ${scene.accent}`, background: "rgba(4,9,8,.82)", padding: "16px 20px", backdropFilter: "blur(14px)" }}><div style={{ color: scene.secondary, fontFamily: fonts.mono, fontSize: 9, fontWeight: 900 }}>UPLOADED VIDEO / SELECTED MOMENT</div><h2 style={{ margin: "7px 0 0", fontFamily: fonts.display, fontSize: 34, fontWeight: 400 }}>{clip(beat.title, 42)}</h2><p style={{ maxWidth: 850, margin: "8px 0 0", color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.5 }}>{clip(beat.body, 142)}</p></div>
        <span style={{ border: `1px solid ${scene.secondary}`, background: "rgba(4,9,8,.76)", padding: "9px 12px", color: scene.secondary, fontFamily: fonts.mono, fontSize: 8, fontWeight: 900 }}>{purposeLabels[clipData.purpose] || "USER SOURCE"}</span>
      </div>
    </div>
  </SceneCanvas>;
}

function MediaWindow({ beat, beatIndex, clipData, frame, scene }: { beat: StoryBeat; beatIndex: number; clipData?: Clip; frame: number; scene: ProjectSceneData }) {
  const scan = interpolate(frame % 70, [0, 69], [4, 96]);
  const focusSeed = beat.keywords.join("").length + beat.title.length;
  const focusLeft = 8 + (focusSeed * 7) % 54;
  const focusTop = 14 + (focusSeed * 11) % 45;
  return <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", border: "1px solid rgba(255,255,255,.24)", borderRadius: 10, background: "#e5e9e8", boxShadow: "0 34px 86px rgba(0,0,0,.48), 0 0 0 1px rgba(255,255,255,.05)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, height: 36, borderBottom: "1px solid rgba(0,0,0,.14)", background: "#f4f5f4", padding: "0 12px" }}>{[scene.accent, "#f1c75b", scene.secondary].map((tone) => <span key={tone} style={{ width: 8, height: 8, borderRadius: "50%", background: tone }} />)}<div style={{ flex: 1, marginLeft: 7, overflow: "hidden", color: "#6d7673", fontFamily: fonts.mono, fontSize: 8, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clipData ? clip(clipData.name, 54) : clip(scene.projectUrl || scene.projectName, 54)}</div><span style={{ color: colors.jade, fontFamily: fonts.mono, fontSize: 7, fontWeight: 900 }}>USER SOURCE / VERIFIED</span></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 36, bottom: 0 }}>
      {clipData ? <MediaStage beat={beat} clipData={clipData} frame={frame} scene={scene} segmentCount={Math.max(1, scene.storyBeats.length - 1)} segmentIndex={Math.max(0, beatIndex - 1)} /> : <div style={{ display: "grid", width: "100%", height: "100%", placeItems: "center", background: colors.night, color: "#fff" }}><MotionGraphic beat={beat} scene={scene} frame={frame} /></div>}
      {clipData && beat.visual === "media-focus" ? <>
        <div style={{ position: "absolute", left: 0, right: 0, top: `${scan}%`, height: 1, background: scene.secondary, boxShadow: `0 0 18px ${scene.secondary}` }} />
        <div style={{ position: "absolute", left: `${focusLeft}%`, top: `${focusTop}%`, width: "28%", height: "24%", border: `2px solid ${scene.accent}`, boxShadow: "0 0 0 999px rgba(4,9,8,.06)" }}><span style={{ position: "absolute", left: -2, top: -17, background: scene.accent, padding: "3px 6px", color: "#fff", fontFamily: fonts.mono, fontSize: 7, fontWeight: 900 }}>{clip(beat.keywords[0] || "EVIDENCE", 16)}</span></div>
      </> : null}
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, borderLeft: `3px solid ${scene.accent}`, background: "rgba(7,12,11,.9)", padding: "10px 13px", color: "#f5f8f7", fontSize: 11, lineHeight: 1.45, backdropFilter: "blur(10px)" }}><strong style={{ color: scene.secondary }}>{clip(beat.title, 34)}</strong><span style={{ marginLeft: 9, color: "rgba(255,255,255,.68)" }}>{clip(beat.body, 72)}</span></div>
      <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 4 }}>{Array.from({ length: scene.storyBeats.length }, (_, index) => <span key={index} style={{ width: index === beatIndex ? 26 : 8, height: 3, background: index === beatIndex ? scene.accent : "rgba(255,255,255,.4)" }} />)}</div>
    </div>
  </div>;
}

function FullscreenBeat({ beat, beatFrame, beatIndex, scene }: { beat: StoryBeat; beatFrame: number; beatIndex: number; scene: ProjectSceneData }) {
  const reveal = interpolate(beatFrame, [0, 24], [0, 1], { ...clampTiming, easing: Easing.bezier(.16, 1, .3, 1) });
  const title = Array.from(clip(beat.title, 36));
  return <SceneCanvas background={colors.night} color={colors.paper} dark variant="project" accent={scene.accent}>
    <div style={{ position: "absolute", inset: "42px 54px 40px 62px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: scene.secondary, fontFamily: fonts.mono, fontSize: 10, fontWeight: 900 }}><span>{scene.eyebrow}</span><span style={{ width: 48, height: 1, background: "rgba(255,255,255,.32)" }} /><span>{phaseLabels[beat.phase]}</span><span style={{ color: "rgba(255,255,255,.36)" }}>{String(beatIndex + 1).padStart(2, "0")} / {String(scene.storyBeats.length).padStart(2, "0")}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.08fr) minmax(390px,.92fr)", gap: 56, height: 590, alignItems: "center" }}>
        <div>
          <div style={{ color: scene.accent, fontFamily: fonts.mono, fontSize: 12, fontWeight: 900 }}>{clip(scene.projectName, 34)} / {beat.visual.toUpperCase()}</div>
          <div style={{ display: "flex", maxWidth: 690, flexWrap: "wrap", marginTop: 18, fontFamily: fonts.display, fontSize: title.length > 25 ? 55 : 66, lineHeight: 1.03 }}>
            {title.map((character, index) => <span key={`${character}-${index}`} style={{ minWidth: character === " " ? 16 : undefined, color: index % 7 === 0 ? scene.accent : "#f7faf8", opacity: interpolate(beatFrame, [index * .7, 16 + index * .7], [0, 1], clampTiming), translate: `0 ${interpolate(beatFrame, [index * .7, 18 + index * .7], [28 + (index % 3) * 8, 0], clampTiming)}px`, rotate: `${(1 - reveal) * (index % 2 ? 2 : -2)}deg` }}>{character}</span>)}
          </div>
          <p style={{ maxWidth: 670, margin: "24px 0 0", color: "rgba(235,242,239,.7)", fontSize: 17, lineHeight: 1.65, opacity: reveal }}>{clip(beat.body, 132)}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>{keywordSet(beat, scene).slice(0, 4).map((keyword, index) => <span key={keyword} style={{ borderBottom: `2px solid ${index === 0 ? scene.accent : scene.secondary}`, padding: "7px 1px", color: "#e7eeeb", fontSize: 11, fontWeight: 800, ...enter(beatFrame, 12 + index * 5, 16) }}>{clip(keyword, 20)}</span>)}</div>
        </div>
        <div style={{ height: 430, opacity: reveal, translate: `${(1 - reveal) * 34}px 0` }}><MotionGraphic beat={beat} scene={scene} frame={beatFrame} /></div>
      </div>
    </div>
    <SourceBadge label={scene.sourceLabel} light />
  </SceneCanvas>;
}

function SplitBeat({ beat, beatFrame, beatIndex, clipData, scene }: { beat: StoryBeat; beatFrame: number; beatIndex: number; clipData?: Clip; scene: ProjectSceneData }) {
  const reveal = interpolate(beatFrame, [0, 22], [0, 1], { ...clampTiming, easing: Easing.bezier(.16, 1, .3, 1) });
  return <SceneCanvas background={colors.night} color={colors.paper} dark variant="project" accent={scene.accent}>
    <div style={{ position: "absolute", inset: "38px 50px 40px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: scene.secondary, fontFamily: fonts.mono, fontSize: 10, fontWeight: 900 }}><span>{scene.eyebrow}</span><span style={{ width: 42, height: 1, background: "rgba(255,255,255,.3)" }} /><span>{phaseLabels[beat.phase]}</span><span style={{ color: "rgba(255,255,255,.36)" }}>{String(beatIndex + 1).padStart(2, "0")} / {String(scene.storyBeats.length).padStart(2, "0")}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(330px,.72fr) minmax(0,1.28fr)", gap: 22, marginTop: 16 }}>
        <div style={{ position: "relative", display: "flex", height: 588, flexDirection: "column", overflow: "hidden", borderTop: `3px solid ${scene.accent}`, padding: "17px 18px 0 0" }}>
          <div style={{ position: "absolute", right: 0, top: 18, bottom: 0, width: 1, background: "rgba(255,255,255,.1)" }} />
          <div style={{ color: scene.accent, fontFamily: fonts.mono, fontSize: 9, fontWeight: 900 }}>{beat.visual.toUpperCase()} / {clip(scene.projectName, 28)}</div>
          <h2 style={{ maxWidth: 420, margin: "12px 0 0", fontFamily: fonts.display, fontSize: beat.title.length > 23 ? 36 : 43, fontWeight: 400, lineHeight: 1.06, opacity: reveal, translate: `0 ${(1 - reveal) * 26}px` }}>{clip(beat.title, 38)}</h2>
          <p style={{ maxWidth: 410, margin: "15px 0 0", color: "rgba(229,237,233,.7)", fontSize: 14, lineHeight: 1.58, opacity: reveal }}>{clip(beat.body, 118)}</p>
          <div style={{ height: 245, marginTop: 15 }}><MotionGraphic beat={beat} scene={scene} frame={beatFrame} /></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto" }}>{keywordSet(beat, scene).slice(0, 4).map((keyword, index) => <span key={keyword} style={{ border: `1px solid ${index === 0 ? scene.accent : "rgba(255,255,255,.18)"}`, borderRadius: 2, padding: "5px 7px", color: index === 0 ? "#fff" : "rgba(255,255,255,.64)", fontFamily: fonts.mono, fontSize: 8, fontWeight: 900, ...enter(beatFrame, 10 + index * 5, 12) }}>{clip(keyword, 17)}</span>)}</div>
        </div>
        <div style={{ height: 588, opacity: reveal, perspective: 1200, translate: `${(1 - reveal) * 42}px 0`, rotate: `y ${(1 - reveal) * -2.5}deg` }}><MediaWindow beat={beat} beatIndex={beatIndex} clipData={clipData} frame={beatFrame} scene={scene} /></div>
      </div>
    </div>
    <SourceBadge label={clipData ? purposeLabels[clipData.purpose] || scene.sourceLabel : scene.sourceLabel} light />
  </SceneCanvas>;
}

function BeatTransition({ frame, accent, secondary, active }: { frame: number; accent: string; secondary: string; active: boolean }) {
  if (!active || frame >= 20) return null;
  const progress = interpolate(frame, [0, 5, 20], [1, 1, 0], { ...clampTiming, easing: Easing.bezier(.76, 0, .24, 1) });
  const tones = [accent, colors.night, secondary];
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 60 }}>
    {tones.map((tone, index) => <div key={tone} style={{ position: "absolute", right: 0, top: `${index * 32}%`, width: `${108 * progress}%`, height: "38%", background: tone, clipPath: "polygon(7% 0,100% 0,100% 100%,0 100%)", translate: `${index * 10 * (1 - progress)}px 0`, opacity: interpolate(frame, [0, 15, 20], [1, 1, 0], clampTiming) }} />)}
    <div style={{ position: "absolute", left: `${progress * 100 - 4}%`, top: 0, width: 4, height: "100%", background: "#fff", opacity: progress }} />
  </div>;
}

export function ProjectScene(scene: ProjectSceneData) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const externalClip: Clip | undefined = scene.mediaUrl && scene.mediaType ? {
    assetId: "external",
    name: scene.projectName,
    mediaUrl: scene.mediaUrl,
    mediaType: scene.mediaType,
    purpose: scene.mediaType === "video" ? "demo" : scene.mediaType === "image" ? "photo" : "document",
    comment: scene.subtitle,
    excerpt: "",
    durationInSeconds: 0,
    narrativeBeats: scene.storyBeats.map(({ mediaIndex: _mediaIndex, ...beat }) => beat),
  } : undefined;
  const clips = scene.mediaClips.length ? scene.mediaClips : externalClip ? [externalClip] : [];
  const beats = scene.storyBeats;
  if (!beats.length) return null;
  const sceneProgress = interpolate(frame, [0, Math.max(1, scene.durationInFrames - 1)], [0, .9999], clampTiming);
  const weights = beats.map((beatItem) => beatItem.layout === "media-full" ? 1.35 : beatItem.layout === "fullscreen" ? .82 : beatItem.phase === "evidence" || beatItem.phase === "result" ? 1.2 : 1.08);
  const requestedHookFrames = Math.min(Math.round(1.9 * fps), Math.max(Math.round(1.5 * fps), Math.round(scene.durationInFrames * .15)));
  const hookFrames = beats.length > 1 && beats[0].layout === "fullscreen"
    ? Math.max(0, Math.min(scene.durationInFrames - (beats.length - 1) * fps, requestedHookFrames))
    : 0;
  const tailWeights = hookFrames ? weights.slice(1) : weights;
  const tailTotalWeight = tailWeights.reduce((total, weight) => total + weight, 0);
  const tailFrames = scene.durationInFrames - hookFrames;
  const ranges = weights.map((weight, index) => {
    if (hookFrames && index === 0) return { start: 0, end: hookFrames };
    const tailIndex = hookFrames ? index - 1 : index;
    const startWeight = tailWeights.slice(0, tailIndex).reduce((total, item) => total + item, 0);
    return {
      start: hookFrames + Math.round(tailFrames * startWeight / Math.max(1, tailTotalWeight)),
      end: hookFrames + Math.round(tailFrames * (startWeight + weight) / Math.max(1, tailTotalWeight)),
    };
  });
  const beatIndex = Math.max(0, ranges.findIndex((range) => frame < range.end));
  const beat = beats[beatIndex];
  const beatFrame = Math.max(0, frame - ranges[beatIndex].start);
  const requestedMediaIndex = beat.mediaIndex ?? Math.min(beatIndex, Math.max(0, clips.length - 1));
  const clipData = clips[Math.min(requestedMediaIndex, Math.max(0, clips.length - 1))];

  return <>
    {beat.layout === "media-full" && clipData
      ? <MediaFullBeat beat={beat} beatFrame={beatFrame} beatIndex={beatIndex} clipData={clipData} scene={scene} />
      : beat.layout === "split" && clipData
        ? <SplitBeat beat={beat} beatFrame={beatFrame} beatIndex={beatIndex} clipData={clipData} scene={scene} />
        : <FullscreenBeat beat={beat} beatFrame={beatFrame} beatIndex={beatIndex} scene={scene} />}
    <BeatTransition accent={beatIndex % 2 ? scene.secondary : scene.accent} secondary={beatIndex % 2 ? scene.accent : scene.secondary} frame={beatFrame} active={beatIndex > 0} />
    <div style={{ position: "absolute", left: 0, bottom: 0, width: `${sceneProgress * 100}%`, height: 4, background: beatIndex % 2 ? scene.secondary : scene.accent, zIndex: 70 }} />
    <div style={{ position: "absolute", right: 18, bottom: 9, color: "rgba(255,255,255,.44)", fontFamily: fonts.mono, fontSize: 7, zIndex: 70 }}>{Math.round(frame / fps * 10) / 10}s</div>
  </>;
}
