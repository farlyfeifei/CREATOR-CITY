import { useCurrentFrame } from "remotion";
import type { z } from "zod";
import type { timelineSceneSchema } from "../storyboard";
import { clip, colors, enter, fonts, SceneCanvas, SceneHeading, SourceBadge } from "./shared";

type Props = z.infer<typeof timelineSceneSchema>;

export function TimelineScene(props: Props) {
  const frame = useCurrentFrame();
  return (
    <SceneCanvas background="#f3f1ec" variant="timeline">
      <div style={{ position: "absolute", inset: "48px 54px" }}>
        <SceneHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} />
        <div style={{ position: "absolute", left: 12, top: 205, bottom: 12, width: 1, background: "#aeb4bb" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 30px", marginTop: 30, marginLeft: 44 }}>
          {props.items.map((item, index) => (
            <div key={`${item.heading}-${index}`} style={{ position: "relative", border: `1px solid ${colors.line}`, borderRadius: 6, background: colors.paper, boxShadow: "0 15px 38px rgba(18,24,23,.08)", minHeight: 142, padding: "18px 20px", ...enter(frame, 9 + index * 10, 28) }}>
              <div style={{ position: "absolute", left: -39, top: 25, width: 13, height: 13, borderRadius: "50%", background: index % 2 ? colors.red : colors.jade, boxShadow: "0 0 0 5px #f3f1ec" }} />
              <div style={{ color: colors.red, fontFamily: fonts.mono, fontSize: 11, fontWeight: 700 }}>{clip(item.period || "NOW", 18)}</div>
              <div style={{ marginTop: 7, fontFamily: fonts.display, fontSize: 24 }}>{clip(item.heading, 30)}</div>
              <div style={{ marginTop: 4, color: colors.jade, fontSize: 15, fontWeight: 800 }}>{clip(item.meta, 36)}</div>
              <div style={{ marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 1.4 }}>{clip(item.summary, 72)}</div>
            </div>
          ))}
        </div>
      </div>
      <SourceBadge label={props.sourceLabel} />
    </SceneCanvas>
  );
}
