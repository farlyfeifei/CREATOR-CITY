import { interpolate, useCurrentFrame } from "remotion";
import type { z } from "zod";
import type { skillsSceneSchema } from "../storyboard";
import { clip, colors, enter, fonts, SceneCanvas, SceneHeading, SourceBadge } from "./shared";

type Props = z.infer<typeof skillsSceneSchema>;

export function SkillsScene(props: Props) {
  const frame = useCurrentFrame();
  return (
    <SceneCanvas background="#8f302b" color={colors.paper} dark variant="skills">
      <div style={{ position: "absolute", inset: "48px 54px" }}>
        <SceneHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} light />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 30 }}>
          {props.skills.map((skill, index) => {
            const width = interpolate(frame - index * 7, [0, 28], [0, skill.level], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return <div key={`${skill.name}-${index}`} style={{ padding: "15px 17px", background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 6, color: colors.ink, boxShadow: "0 15px 36px rgba(0,0,0,.16)", ...enter(frame, 5 + index * 7, 20) }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div style={{ fontSize: 17, fontWeight: 700 }}>{clip(skill.name, 24)}</div><div style={{ color: colors.red, fontFamily: fonts.mono, fontWeight: 700 }}>{Math.round(width)}</div></div><div style={{ height: 7, marginTop: 11, borderRadius: 99, background: "#e6e4de", overflow: "hidden" }}><div style={{ width: `${width}%`, height: "100%", borderRadius: 99, background: index % 2 ? colors.jade : colors.yellow }} /></div><div style={{ marginTop: 9, color: colors.muted, fontSize: 13 }}>{clip(skill.evidence, 50)}</div></div>;
          })}
        </div>
      </div>
      <SourceBadge label={props.sourceLabel} light />
    </SceneCanvas>
  );
}
