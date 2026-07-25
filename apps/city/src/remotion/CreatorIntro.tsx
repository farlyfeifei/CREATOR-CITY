import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { z } from "zod";
import { ClosingScene } from "./scenes/ClosingScene";
import { EvidenceScene } from "./scenes/EvidenceScene";
import { IdentityScene } from "./scenes/IdentityScene";
import { ProjectScene } from "./scenes/ProjectScene";
import { ResearchScene } from "./scenes/ResearchScene";
import { SkillsScene } from "./scenes/SkillsScene";
import { TimelineScene } from "./scenes/TimelineScene";
import { VideoThemeProvider, type VideoVisualTheme } from "./scenes/shared";
import { creatorStoryboardSchema } from "./storyboard";

export const CreatorIntroSchema = z.object({
  storyboard: creatorStoryboardSchema,
});

export type CreatorIntroProps = z.infer<typeof CreatorIntroSchema>;

function SceneRenderer({ scene }: { scene: CreatorIntroProps["storyboard"]["scenes"][number] }) {
  switch (scene.type) {
    case "identity": return <IdentityScene {...scene} />;
    case "timeline": return <TimelineScene {...scene} />;
    case "evidence": return <EvidenceScene {...scene} />;
    case "project": return <ProjectScene {...scene} />;
    case "research": return <ResearchScene {...scene} />;
    case "skills": return <SkillsScene {...scene} />;
    case "closing": return <ClosingScene {...scene} />;
  }
}

const transitionTones: Record<VideoVisualTheme, [string, string, string]> = {
  "beijing-night": ["#d84d42", "#78d7c2", "#f1c75b"],
  "paper-archive": ["#bd302d", "#d2a64b", "#efe8d8"],
  "signal-lab": ["#31d3a2", "#ffb547", "#ecf7f3"],
  "gallery-white": ["#295fd6", "#f04438", "#ffd338"],
};

function SceneCut({ durationInFrames, index, theme }: { durationInFrames: number; index: number; theme: VideoVisualTheme }) {
  const frame = useCurrentFrame();
  const enterProgress = index === 0 ? 0 : interpolate(frame, [0, 6, 20], [1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(.76, 0, .24, 1),
  });
  const exitProgress = interpolate(frame, [Math.max(0, durationInFrames - 16), Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(.76, 0, .24, 1),
  });
  const progress = Math.max(enterProgress, exitProgress);
  const tones = transitionTones[theme];
  const exiting = exitProgress > enterProgress;
  return <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
    {tones.map((tone, bandIndex) => <div key={tone} style={{ position: "absolute", top: `${bandIndex * 32}%`, left: exiting ? 0 : undefined, right: exiting ? undefined : 0, width: `${progress * 108}%`, height: "38%", background: bandIndex === 1 ? "#0a100e" : tone, clipPath: exiting ? "polygon(0 0,93% 0,100% 100%,0 100%)" : "polygon(7% 0,100% 0,100% 100%,0 100%)", opacity: progress }} />)}
    <div style={{ position: "absolute", top: 0, bottom: 0, left: exiting ? `${progress * 100 - 1}%` : undefined, right: exiting ? undefined : `${progress * 100 - 1}%`, width: 3, background: tones[index % tones.length], opacity: progress }} />
  </AbsoluteFill>;
}

export const CreatorIntro: FC<CreatorIntroProps> = ({ storyboard }) => {
  let cursor = 0;
  return (
    <VideoThemeProvider theme={storyboard.visualTheme}>
      <AbsoluteFill>
        {storyboard.scenes.map((scene, index) => {
          const from = cursor;
          cursor += scene.durationInFrames;
          return (
            <Sequence key={scene.id} from={from} durationInFrames={scene.durationInFrames} premountFor={scene.type === "project" ? 90 : 30}>
              <SceneRenderer scene={scene} />
              <SceneCut durationInFrames={scene.durationInFrames} index={index} theme={storyboard.visualTheme} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </VideoThemeProvider>
  );
};
