import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  useCurrentFrame,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  HEIGHT,
  TRANSITION_FRAMES,
  type GlideVideoProps,
  type RClip,
} from "./types";

/** 켄 번스 변환 — CSS 애니메이션 금지, useCurrentFrame+interpolate로 매 프레임 계산. */
function kenBurnsTransform(clip: RClip, frame: number): string {
  if (clip.type !== "image" || !clip.animation) return "scale(1.02)";
  const p = interpolate(frame, [0, clip.durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  switch (clip.animation) {
    case "zoomIn":
      return `scale(${1.04 + 0.12 * p})`;
    case "zoomOut":
      return `scale(${1.16 - 0.12 * p})`;
    case "pan":
      return `scale(1.1) translateX(${-3 + 6 * p}%)`;
    default:
      return "scale(1.02)";
  }
}

function ClipView({ clip }: { clip: RClip }) {
  const frame = useCurrentFrame();
  const transform = kenBurnsTransform(clip, frame);

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", transform }}>
        {clip.type === "image" ? (
          <Img
            src={clip.src}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <OffthreadVideo
            src={clip.src}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
      {clip.caption.text ? <CaptionView caption={clip.caption} /> : null}
    </AbsoluteFill>
  );
}

function CaptionView({ caption }: { caption: RClip["caption"] }) {
  const pos = caption.position ?? "bottom";
  const justify =
    pos === "top" ? "flex-start" : pos === "center" ? "center" : "flex-end";
  // fontSize는 1080 기준 px. 미리보기/렌더 모두 동일 비율로 스케일됨.
  const fontSize = caption.fontSize ?? Math.round(HEIGHT * 0.045);
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
        alignItems: "center",
        padding: HEIGHT * 0.06,
      }}
    >
      <span
        style={{
          maxWidth: "85%",
          textAlign: "center",
          color: caption.color ?? "#ffffff",
          backgroundColor: caption.bgColor ?? "rgba(0,0,0,0.45)",
          fontSize,
          lineHeight: 1.3,
          fontWeight: 600,
          padding: "0.2em 0.5em",
          borderRadius: 8,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {caption.text}
      </span>
    </AbsoluteFill>
  );
}

export function GlideVideo({ clips, audioSrc }: GlideVideoProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {clips.flatMap((clip, i) => {
          const seq = (
            <TransitionSeries.Sequence
              key={`s-${i}`}
              durationInFrames={clip.durationInFrames}
            >
              <ClipView clip={clip} />
            </TransitionSeries.Sequence>
          );
          if (i === clips.length - 1) return [seq];
          const trans = (
            <TransitionSeries.Transition
              key={`t-${i}`}
              presentation={fade()}
              timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
            />
          );
          return [seq, trans];
        })}
      </TransitionSeries>
      {audioSrc ? <Audio src={audioSrc} loop /> : null}
    </AbsoluteFill>
  );
}
