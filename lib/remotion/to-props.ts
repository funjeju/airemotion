import {
  FPS,
  TRANSITION_FRAMES_BY_SPEED,
  type AspectRatio,
  type GlideVideoProps,
  type RClip,
  type RSubtitle,
  type RTransitionDirection,
  type RTransitionType,
  type TransitionSpeed,
} from "@/remotion/types";
import { clipPlaybackSec, type Clip } from "@/lib/firebase/clips";
import type { Caption } from "@/lib/firebase/captions";

export type TransitionSettings = {
  type: RTransitionType;
  direction: RTransitionDirection;
  speed: TransitionSpeed;
};

export const DEFAULT_TRANSITION: TransitionSettings = {
  type: "fade",
  direction: "from-left",
  speed: "normal",
};

/** Firebase Clip[] + 자동 자막 + 전환 설정 → Remotion 컴포지션 props (미리보기·렌더 공용). */
export function clipsToGlideProps(
  clips: Clip[],
  captions: Caption[] = [],
  transition: TransitionSettings = DEFAULT_TRANSITION,
  aspectRatio: AspectRatio = "16:9",
): GlideVideoProps {
  const visuals = clips.filter((c) => c.type === "image" || c.type === "video");
  const audio = clips.find((c) => c.type === "audio");

  const rclips: RClip[] = visuals.map((c) => ({
    type: c.type as "image" | "video",
    src: c.downloadURL,
    durationInFrames: Math.max(1, Math.round(clipPlaybackSec(c) * FPS)),
    animation: c.animation,
    caption: {
      text: c.caption.text ?? "",
      color: c.caption.overrides?.color,
      bgColor: c.caption.overrides?.bgColor,
      fontSize: c.caption.overrides?.fontSize,
      position: c.caption.overrides?.position,
    },
    scale: c.scale,
    overlays: c.overlays,
    trimStartSec: c.type === "video" ? (c.trimStart ?? 0) : undefined,
  }));

  const subtitles: RSubtitle[] = captions.map((c) => ({
    startMs: Math.round(c.start * 1000),
    endMs: Math.round(c.end * 1000),
    text: c.text,
  }));

  return {
    clips: rclips,
    audioSrc: audio?.downloadURL ?? null,
    subtitles,
    transitionType: transition.type,
    transitionDirection: transition.direction,
    transitionDurationInFrames: TRANSITION_FRAMES_BY_SPEED[transition.speed],
    aspectRatio,
  };
}
