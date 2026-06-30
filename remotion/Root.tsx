import { Composition, type CalculateMetadataFunction } from "remotion";
import { GlideVideo } from "./GlideVideo";
import {
  FPS,
  HEIGHT,
  WIDTH,
  totalDurationInFrames,
  type GlideVideoProps,
} from "./types";

const calculateMetadata: CalculateMetadataFunction<GlideVideoProps> = ({
  props,
}) => {
  return {
    durationInFrames: totalDurationInFrames(props.clips),
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
      defaultProps={{ clips: [], audioSrc: null } satisfies GlideVideoProps}
      calculateMetadata={calculateMetadata}
    />
  );
}
