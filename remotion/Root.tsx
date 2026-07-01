import { Composition, type CalculateMetadataFunction } from "remotion";
import { GlideVideo } from "./GlideVideo";
import {
  DIMENSIONS,
  FPS,
  HEIGHT,
  TRANSITION_FRAMES_BY_SPEED,
  WIDTH,
  totalDurationInFrames,
  type GlideVideoProps,
} from "./types";

const calculateMetadata: CalculateMetadataFunction<GlideVideoProps> = ({
  props,
}) => {
  const transitionFrames =
    props.transitionType === "none" ? 0 : props.transitionDurationInFrames;
  const { width, height } = DIMENSIONS[props.aspectRatio] ?? DIMENSIONS["16:9"];
  return {
    durationInFrames: totalDurationInFrames(props.clips, transitionFrames),
    fps: FPS,
    width,
    height,
  };
};

export function RemotionRoot() {
  return (
    <Composition
      id="GlideVideo"
      component={GlideVideo}
      durationInFrames={1}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={
        {
          clips: [],
          audioTracks: [],
          subtitles: [],
          transitionType: "fade",
          transitionDirection: "from-left",
          transitionDurationInFrames: TRANSITION_FRAMES_BY_SPEED.normal,
          aspectRatio: "16:9",
        } satisfies GlideVideoProps
      }
      calculateMetadata={calculateMetadata}
    />
  );
}
