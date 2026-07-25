import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { z } from "zod";
import type { identitySceneSchema } from "../storyboard";
import { clip, colors, CreatorMonogram, enter, fonts, SceneCanvas, SourceBadge } from "./shared";

type Props = z.infer<typeof identitySceneSchema>;

export function IdentityScene(props: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wordShift = interpolate(frame, [0, 2.8 * fps], [80, -18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <SceneCanvas background={colors.night} color={colors.paper} dark variant="identity">
      <div style={{ position: "absolute", left: 64, top: 56, color: colors.mint, fontFamily: fonts.mono, fontSize: 14, fontWeight: 700 }}>{props.eyebrow}</div>
      <div style={{ position: "absolute", left: 62, top: 92, width: 760, ...enter(frame, 3, 36) }}>
        <div style={{ fontFamily: fonts.display, fontSize: 116, lineHeight: .88 }}>{clip(props.name, 12)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 26 }}><span style={{ width: 72, height: 2, background: colors.red }} /><span style={{ color: colors.mint, fontSize: 19, fontWeight: 700 }}>{clip(props.role, 28)}</span></div>
        <div style={{ marginTop: 38, maxWidth: 720, fontFamily: fonts.display, fontSize: 37, lineHeight: 1.22 }}>{clip(props.title, 68)}</div>
        <div style={{ marginTop: 20, maxWidth: 700, color: "#aeb9b6", fontSize: 16, lineHeight: 1.65 }}>{clip(props.subtitle, 108)}</div>
      </div>
      <div style={{ position: "absolute", right: 92, top: 188 }}><CreatorMonogram name={props.name} frame={frame} /></div>
      <div style={{ position: "absolute", left: wordShift, bottom: 38, color: "rgba(255,255,255,.055)", fontFamily: fonts.display, fontSize: 126, whiteSpace: "nowrap" }}>IDEA · SYSTEM · STORY · IMPACT</div>
      <div style={{ position: "absolute", left: 64, bottom: 42, display: "flex", gap: 8 }}>{["作品", "研究", "过程"].map((item, index) => <span key={item} style={{ border: "1px solid rgba(255,255,255,.22)", borderRadius: 99, padding: "7px 12px", color: index === 0 ? colors.paper : "#9ba7a4", fontSize: 12 }}>{item}</span>)}</div>
      <SourceBadge label={props.sourceLabel} light />
    </SceneCanvas>
  );
}
