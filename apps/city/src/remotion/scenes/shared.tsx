import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

export const colors = {
  ink: "#171a1f",
  paper: "#fbfbf8",
  cream: "#f2ede3",
  jade: "#17685b",
  mint: "#75c8b9",
  red: "#d64d43",
  yellow: "#e8c85a",
  blue: "#4f78b8",
  orange: "#d47742",
  night: "#121817",
  muted: "#697386",
  line: "#d7d9dc",
};

export const fonts = {
  display: '"Ma Shan Zheng", "ZCOOL XiaoWei", "Microsoft YaHei", serif',
  body: '"Segoe UI", "Microsoft YaHei", Arial, sans-serif',
  mono: '"Cascadia Mono", Consolas, monospace',
};

export type VideoVisualTheme = "beijing-night" | "paper-archive" | "signal-lab" | "gallery-white";

type ThemePalette = {
  id: VideoVisualTheme;
  light: string;
  dark: string;
  lightText: string;
  darkText: string;
  accent: string;
  secondary: string;
  grid: string;
};

const themePalettes: Record<VideoVisualTheme, ThemePalette> = {
  "beijing-night": { id: "beijing-night", light: "#f3efe6", dark: "#111816", lightText: "#171a1f", darkText: "#fbf6e8", accent: "#d84d42", secondary: "#72c8b4", grid: "square" },
  "paper-archive": { id: "paper-archive", light: "#faf8f2", dark: "#312d28", lightText: "#201d1a", darkText: "#fffaf0", accent: "#bd302d", secondary: "#d2a64b", grid: "paper" },
  "signal-lab": { id: "signal-lab", light: "#eaf2ef", dark: "#080d0c", lightText: "#101916", darkText: "#edf9f5", accent: "#31d3a2", secondary: "#ffb547", grid: "signal" },
  "gallery-white": { id: "gallery-white", light: "#ffffff", dark: "#172137", lightText: "#15171c", darkText: "#ffffff", accent: "#295fd6", secondary: "#f04438", grid: "gallery" },
};

const VideoThemeContext = createContext<ThemePalette>(themePalettes["beijing-night"]);

export function VideoThemeProvider({ theme, children }: { theme: VideoVisualTheme; children: ReactNode }) {
  return <VideoThemeContext.Provider value={themePalettes[theme]}>{children}</VideoThemeContext.Provider>;
}

export const panel: CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 6,
  background: colors.paper,
  boxShadow: "0 24px 60px rgba(18,24,23,.13)",
};

export const enter = (frame: number, delay = 0, distance = 36) => {
  const progress = interpolate(frame - delay, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return { opacity: progress, translate: `0 ${(1 - progress) * distance}px` };
};

export const clip = (value: string, length: number) => value.length > length ? `${value.slice(0, Math.max(1, length - 1))}…` : value;

export type CanvasVariant = "identity" | "timeline" | "evidence" | "project" | "research" | "skills" | "closing";

const variantMeta: Record<CanvasVariant, { code: string; seed: number }> = {
  identity: { code: "IDENTITY", seed: 11 },
  timeline: { code: "TRAJECTORY", seed: 23 },
  evidence: { code: "EVIDENCE", seed: 37 },
  project: { code: "PROJECT FILM", seed: 47 },
  research: { code: "RESEARCH", seed: 59 },
  skills: { code: "CAPABILITY", seed: 71 },
  closing: { code: "NEXT BUILD", seed: 83 },
};

function KineticBackdrop({ dark, variant, accent, theme }: { dark: boolean; variant: CanvasVariant; accent: string; theme: ThemePalette }) {
  const frame = useCurrentFrame();
  const meta = variantMeta[variant];
  const gridShift = interpolate(frame, [0, 360], [0, 180], { extrapolateLeft: "clamp", extrapolateRight: "extend" });
  const sweep = interpolate(frame % 150, [0, 149], [-22, 118]);
  const signal = interpolate(frame % 72, [0, 14, 56, 71], [0.18, 0.72, 0.42, 0.18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = dark ? "rgba(255,255,255,.065)" : "rgba(23,26,31,.065)";
  const quiet = dark ? "rgba(255,255,255,.025)" : "rgba(23,26,31,.025)";
  const label = dark ? "rgba(255,255,255,.045)" : "rgba(23,26,31,.04)";
  const marks = Array.from({ length: 9 }, (_, index) => ({
    left: (meta.seed * (index + 3) * 17) % 94,
    top: (meta.seed * (index + 5) * 13) % 88,
    width: 16 + ((index * 19 + meta.seed) % 54),
  }));

  const paperPattern = theme.grid === "paper"
    ? `repeating-linear-gradient(0deg, transparent 0 35px, ${line} 35px 36px)`
    : theme.grid === "signal"
      ? `radial-gradient(circle, ${line} 1.2px, transparent 1.4px)`
      : theme.grid === "gallery"
        ? `linear-gradient(90deg, ${line} 1px, transparent 1px)`
        : `linear-gradient(90deg, ${line} 1px, transparent 1px), linear-gradient(${line} 1px, transparent 1px)`;
  const paperSize = theme.grid === "paper" ? "100% 36px" : theme.grid === "signal" ? "34px 34px" : theme.grid === "gallery" ? "160px 100%" : "128px 128px";

  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: paperPattern, backgroundPosition: `${gridShift}px ${gridShift * .35}px`, backgroundSize: paperSize, opacity: .72 }} />
    <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(112deg, transparent 0 94px, ${quiet} 94px 96px, transparent 96px 188px)`, translate: `${-gridShift * .22}px 0` }} />
    <div style={{ position: "absolute", left: `${sweep}%`, top: 0, width: 190, height: "100%", background: accent, opacity: dark ? .055 : .035, transform: "skewX(-12deg)" }} />
    {marks.map((mark, index) => <span key={index} style={{ position: "absolute", left: `${mark.left}%`, top: `${mark.top}%`, width: mark.width, height: index % 3 === 0 ? 3 : 1, background: index % 4 === 0 ? accent : line, opacity: index % 4 === 0 ? signal : .7, translate: `${interpolate(frame, [0, 240], [0, (index % 2 ? -1 : 1) * (12 + index * 2)], { extrapolateLeft: "clamp", extrapolateRight: "extend" })}px 0` }} />)}
    <div style={{ position: "absolute", right: -36, top: 92, color: label, fontFamily: fonts.mono, fontSize: 92, fontWeight: 900, lineHeight: 1, rotate: "90deg", transformOrigin: "center", whiteSpace: "nowrap" }}>{meta.code}</div>
    <div style={{ position: "absolute", left: 28, top: 24, width: 18, height: 18, borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }} />
    <div style={{ position: "absolute", right: 28, bottom: 24, width: 18, height: 18, borderRight: `2px solid ${accent}`, borderBottom: `2px solid ${accent}` }} />
  </div>;
}

export function SceneCanvas({ children, background = colors.paper, color = colors.ink, dark = false, variant = "identity", accent = colors.red }: { children: ReactNode; background?: string; color?: string; dark?: boolean; variant?: CanvasVariant; accent?: string }) {
  const theme = useContext(VideoThemeContext);
  const line = dark ? "rgba(255,255,255,.07)" : "rgba(23,26,31,.06)";
  const resolvedBackground = theme.id === "beijing-night" ? background : dark ? theme.dark : theme.light;
  const resolvedColor = theme.id === "beijing-night" ? color : dark ? theme.darkText : theme.lightText;
  const resolvedAccent = accent === colors.red ? theme.accent : accent;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: resolvedBackground, color: resolvedColor, fontFamily: fonts.body, letterSpacing: 0 }}>
      <KineticBackdrop accent={resolvedAccent} dark={dark} variant={variant} theme={theme} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 9, height: "100%", background: resolvedAccent }} />
      <div style={{ position: "absolute", right: 44, top: 0, width: 1, height: "100%", background: line }} />
      <div style={{ position: "absolute", left: 44, right: 44, bottom: 30, height: 1, background: line }} />
      {children}
    </AbsoluteFill>
  );
}

export function SceneHeading({ eyebrow, title, subtitle, light = false }: { eyebrow: string; title: string; subtitle: string; light?: boolean }) {
  const theme = useContext(VideoThemeContext);
  return (
    <div style={{ position: "relative" }}>
      <div style={{ color: light ? theme.secondary : theme.accent, fontFamily: fonts.mono, fontWeight: 700, fontSize: 14 }}>{eyebrow}</div>
      <div style={{ marginTop: 12, maxWidth: 900, fontFamily: fonts.display, fontWeight: 400, fontSize: 48, lineHeight: 1.08 }}>{clip(title, 48)}</div>
      <div style={{ marginTop: 13, maxWidth: 900, color: light ? "#c5cfcc" : colors.muted, fontSize: 17, lineHeight: 1.55 }}>{clip(subtitle, 120)}</div>
    </div>
  );
}

export function SourceBadge({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <div style={{ position: "absolute", right: 58, top: 42, border: `1px solid ${light ? "rgba(255,255,255,.28)" : colors.line}`, borderRadius: 99, padding: "7px 12px", background: light ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.84)", color: light ? colors.paper : colors.ink, fontFamily: fonts.mono, fontSize: 11, fontWeight: 700 }}>
      SOURCE · {clip(label, 18)}
    </div>
  );
}

export function CreatorMonogram({ name, frame, tone = colors.red }: { name: string; frame: number; tone?: string }) {
  const scale = interpolate(frame, [0, 28], [0.82, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const rotate = interpolate(frame, [0, 70], [-8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ display: "grid", width: 242, height: 242, placeItems: "center", border: "1px solid rgba(255,255,255,.25)", borderRadius: "50%", background: tone, boxShadow: "0 30px 90px rgba(0,0,0,.28)", fontFamily: fonts.display, fontSize: 110, scale, rotate: `${rotate}deg` }}>{name.slice(0, 1)}</div>;
}
