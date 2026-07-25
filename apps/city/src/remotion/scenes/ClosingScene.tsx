import { useCurrentFrame } from "remotion";
import type { z } from "zod";
import type { closingSceneSchema } from "../storyboard";
import { clip, colors, CreatorMonogram, enter, fonts, SceneCanvas, SourceBadge } from "./shared";

type Props = z.infer<typeof closingSceneSchema>;

export function ClosingScene(props: Props) {
  const frame = useCurrentFrame();
  return (
    <SceneCanvas background={colors.jade} color={colors.paper} dark variant="closing">
      <div style={{ position: "absolute", left: 72, top: 88, width: 790, ...enter(frame, 4, 34) }}>
        <div style={{ color: colors.mint, fontFamily: fonts.mono, fontSize: 15, fontWeight: 700 }}>{props.eyebrow}</div>
        <div style={{ marginTop: 26, fontFamily: fonts.display, fontSize: 72, lineHeight: 1.04 }}>{clip(props.title, 48)}</div>
        <div style={{ marginTop: 28, maxWidth: 760, color: "#d2e3df", fontSize: 20, lineHeight: 1.6 }}>{clip(props.lookingFor || props.subtitle, 120)}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 34 }}>{props.links.map((link) => <div key={link} style={{ border: "1px solid rgba(255,255,255,.3)", borderRadius: 99, padding: "9px 13px", background: "rgba(255,255,255,.08)", fontFamily: fonts.mono, fontSize: 12 }}>{clip(link.replace(/^https?:\/\//, ""), 38)}</div>)}</div>
      </div>
      <div style={{ position: "absolute", right: 82, top: 190, ...enter(frame, 14, 28) }}><CreatorMonogram name={props.name} frame={frame} tone={colors.red} /><div style={{ marginTop: 22, textAlign: "center", fontFamily: fonts.display, fontSize: 25 }}>{clip(props.name, 20)}</div></div>
      <div style={{ position: "absolute", left: 72, bottom: 50, width: 850, height: 1, background: "rgba(255,255,255,.25)" }} />
      <SourceBadge label={props.sourceLabel} light />
    </SceneCanvas>
  );
}
