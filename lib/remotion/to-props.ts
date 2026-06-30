import { FPS, type GlideVideoProps, type RClip } from "@/remotion/types";
import type { Clip } from "@/lib/firebase/clips";

/** Firebase Clip[] → Remotion 컴포지션 props (미리보기·렌더 공용). */
export function clipsToGlideProps(clips: Clip[]): GlideVideoProps {
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

  return { clips: rclips, audioSrc: audio?.downloadURL ?? null };
}
