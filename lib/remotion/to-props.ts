import {
  FPS,
  type GlideVideoProps,
  type RClip,
  type RSubtitle,
} from "@/remotion/types";
import type { Clip } from "@/lib/firebase/clips";
import type { Caption } from "@/lib/firebase/captions";

/** Firebase Clip[] + 자동 자막 → Remotion 컴포지션 props (미리보기·렌더 공용). */
export function clipsToGlideProps(
  clips: Clip[],
  captions: Caption[] = [],
): GlideVideoProps {
  const visuals = clips.filter((c) => c.type === "image" || c.type === "video");
  const audio = clips.find((c) => c.type === "audio");

  const rclips: RClip[] = visuals.map((c) => ({
    type: c.type as "image" | "video",
    src: c.downloadURL,
    durationInFrames: Math.max(1, Math.round(c.durationSec * FPS)),
    animation: c.animation,
    caption: {
      text: c.caption.text ?? "",
      color: c.caption.overrides?.color,
      bgColor: c.caption.overrides?.bgColor,
      fontSize: c.caption.overrides?.fontSize,
      position: c.caption.overrides?.position,
    },
  }));

  const subtitles: RSubtitle[] = captions.map((c) => ({
    startMs: Math.round(c.start * 1000),
    endMs: Math.round(c.end * 1000),
    text: c.text,
  }));

  return { clips: rclips, audioSrc: audio?.downloadURL ?? null, subtitles };
}
