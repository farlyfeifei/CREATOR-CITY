import { useCurrentFrame } from "remotion";
import type { z } from "zod";
import type { researchSceneSchema } from "../storyboard";
import { clip, colors, enter, fonts, SceneCanvas, SceneHeading, SourceBadge } from "./shared";

type Props = z.infer<typeof researchSceneSchema>;

export function ResearchScene(props: Props) {
  const frame = useCurrentFrame();
  return (
    <SceneCanvas background={colors.night} color={colors.paper} dark variant="research">
      <div style={{ position: "absolute", inset: "48px 54px" }}>
        <SceneHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} light />
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, props.papers.length)}, 1fr)`, gap: 18, marginTop: 34 }}>
          {props.papers.map((paper, index) => <div key={`${paper.title}-${index}`} style={{ minHeight: 330, padding: 22, background: index === 0 ? colors.cream : colors.paper, border: `1px solid ${colors.line}`, borderRadius: 6, boxShadow: "0 24px 60px rgba(0,0,0,.26)", color: colors.ink, ...enter(frame, index * 12, 30) }}><div style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", background: index === 0 ? colors.red : colors.jade, color: colors.paper, fontFamily: fonts.mono, fontWeight: 700 }}>P{index + 1}</div><div style={{ marginTop: 20, fontFamily: fonts.display, fontSize: 24, lineHeight: 1.28 }}>{clip(paper.title, 78)}</div><div style={{ marginTop: 14, color: colors.red, fontFamily: fonts.mono, fontSize: 11, fontWeight: 700 }}>{clip(paper.venue, 30)}</div><div style={{ marginTop: 22, borderTop: `1px solid ${colors.line}`, paddingTop: 18, color: colors.muted, fontSize: 15, lineHeight: 1.55 }}>{clip(paper.contribution, 105)}</div></div>)}
        </div>
      </div>
      <SourceBadge label={props.sourceLabel} light />
    </SceneCanvas>
  );
}
