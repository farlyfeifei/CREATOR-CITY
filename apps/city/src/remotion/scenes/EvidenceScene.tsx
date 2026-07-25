import { interpolate, useCurrentFrame } from "remotion";
import type { z } from "zod";
import type { evidenceSceneSchema } from "../storyboard";
import { clip, colors, enter, fonts, panel, SceneCanvas, SceneHeading, SourceBadge } from "./shared";

type Props = z.infer<typeof evidenceSceneSchema>;

export function EvidenceScene(props: Props) {
  const frame = useCurrentFrame();
  return (
    <SceneCanvas background="#e8f1ef" variant="evidence">
      <div style={{ position: "absolute", inset: "48px 54px" }}>
        <SceneHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} />
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 28, marginTop: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {(props.metrics.length ? props.metrics : [{ value: "01", label: "正在积累", context: "第一个可验证结果" }]).map((metric, index) => {
              const count = interpolate(frame - index * 8, [0, 26], [0, Number.parseFloat(metric.value) || 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const displayed = /^\d+(\.\d+)?$/.test(metric.value) ? (metric.value.includes(".") ? count.toFixed(1) : Math.round(count).toString()) : metric.value;
              return <div key={`${metric.label}-${index}`} style={{ ...panel, minHeight: 138, padding: "18px 20px", ...enter(frame, 8 + index * 8, 24) }}><div style={{ color: colors.red, fontFamily: fonts.display, fontSize: 48 }}>{clip(displayed, 9)}</div><div style={{ fontSize: 17, fontWeight: 700 }}>{clip(metric.label, 18)}</div><div style={{ marginTop: 7, color: colors.muted, fontSize: 13 }}>{clip(metric.context, 38)}</div></div>;
            })}
          </div>
          <div style={{ ...panel, padding: "18px 20px", ...enter(frame, 16, 24) }}>
            <div style={{ fontFamily: fonts.mono, color: colors.jade, fontSize: 12, fontWeight: 700 }}>AWARD CABINET</div>
            <div style={{ display: "grid", gap: 11, marginTop: 14 }}>
              {(props.awards.length ? props.awards : [{ title: "继续构建中", issuer: "Creator City", date: "NOW" }]).map((award, index) => <div key={`${award.title}-${index}`} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", alignItems: "center", gap: 12, borderTop: index ? `1px solid ${colors.line}` : undefined, paddingTop: index ? 11 : 0 }}><div style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: "50%", background: colors.yellow, fontWeight: 700 }}>★</div><div><div style={{ fontSize: 16, fontWeight: 700 }}>{clip(award.title, 26)}</div><div style={{ marginTop: 3, color: colors.muted, fontSize: 12 }}>{clip(award.issuer, 24)}</div></div><div style={{ color: colors.red, fontFamily: fonts.mono, fontSize: 11, fontWeight: 700 }}>{clip(award.date, 10)}</div></div>)}
            </div>
          </div>
        </div>
      </div>
      <SourceBadge label={props.sourceLabel} />
    </SceneCanvas>
  );
}
