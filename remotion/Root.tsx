import { Composition, type CalculateMetadataFunction } from "remotion";
import { GlideVideo } from "./GlideVideo";
import {
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
  return {
    durationInFrames: totalDurationInFrames(props.clips, transitionFrames),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
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
          audioSrc: null,
          subtitles: [],
          transitionType: "fade",
          transitionDurationInFrames: TRANSITION_FRAMES_BY_SPEED.normal,
        } satisfies GlideVideoProps
      }
      calculateMetadata={calculateMetadata}
    />
  );
}
