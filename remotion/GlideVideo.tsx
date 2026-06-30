import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import {
  HEIGHT,
  type GlideVideoProps,
  type RClip,
  type RSubtitle,
  type RTransitionType,
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

/** Whisper 자동 자막 — 전역 타임라인 기준 시간에 하단 자막 표시. */
function SubtitleTrack({ subtitles }: { subtitles: RSubtitle[] }) {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {subtitles.map((s, i) => {
        const from = Math.round((s.startMs / 1000) * fps);
        const dur = Math.max(1, Math.round(((s.endMs - s.startMs) / 1000) * fps));
        if (!s.text.trim()) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <AbsoluteFill
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: HEIGHT * 0.05,
              }}
            >
              <span
                style={{
                  maxWidth: "88%",
                  textAlign: "center",
                  color: "#ffffff",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  fontSize: Math.round(HEIGHT * 0.042),
                  lineHeight: 1.3,
                  fontWeight: 600,
                  padding: "0.2em 0.6em",
                  borderRadius: 8,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {s.text}
              </span>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

function presentationFor(type: RTransitionType) {
  return type === "slide" ? slide() : fade();
}

export function GlideVideo({
  clips,
  audioSrc,
  subtitles,
  transitionType,
  transitionDurationInFrames,
}: GlideVideoProps) {
  // '컷'(none) 또는 전환 길이 0이면 전환 없이 순차 재생.
  const useTransition = transitionType !== "none" && transitionDurationInFrames > 0;

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
          if (!useTransition || i === clips.length - 1) return [seq];
          const trans = (
            <TransitionSeries.Transition
              key={`t-${i}`}
              presentation={presentationFor(transitionType)}
              timing={linearTiming({
                durationInFrames: transitionDurationInFrames,
              })}
            />
          );
          return [seq, trans];
        })}
      </TransitionSeries>
      {subtitles.length > 0 ? <SubtitleTrack subtitles={subtitles} /> : null}
      {audioSrc ? <Audio src={audioSrc} loop /> : null}
    </AbsoluteFill>
  );
}
