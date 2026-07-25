import { Composition, type CalculateMetadataFunction } from "remotion";
import { createDemoProfile } from "../features/profile";
import { CreatorIntro, CreatorIntroSchema, type CreatorIntroProps } from "./CreatorIntro";
import { buildCreatorStoryboard, getStoryboardDuration } from "./storyboard";

const defaultProps: CreatorIntroProps = {
  storyboard: buildCreatorStoryboard(createDemoProfile()),
};

const calculateMetadata: CalculateMetadataFunction<CreatorIntroProps> = ({ props }) => ({
  durationInFrames: getStoryboardDuration(props.storyboard),
  defaultOutName: `${props.storyboard.title.replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "creator-signal"}.mp4`,
});

export const RemotionRoot: React.FC = () => (
  <Composition
    id="CreatorIntro"
    component={CreatorIntro}
    durationInFrames={getStoryboardDuration(defaultProps.storyboard)}
    fps={defaultProps.storyboard.fps}
    width={1280}
    height={720}
    defaultProps={defaultProps}
    schema={CreatorIntroSchema}
    calculateMetadata={calculateMetadata}
  />
);
