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
import {
  TransitionSeries,
  linearTiming,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { none } from "@remotion/transitions/none";
import {
  type GlideVideoProps,
  type RClip,
  type RSubtitle,
  type RTransitionDirection,
  type RTransitionType,
} from "./types";

/** 켄 번스 변환 성분(scale·translate) — CSS 애니메이션 금지, 매 프레임 interpolate로 계산. */
function kenBurns(
  clip: RClip,
  frame: number,
): { scale: number; tx: number; ty: number } {
  if (clip.type !== "image") return { scale: 1.02, tx: 0, ty: 0 };
  const p = interpolate(frame, [0, clip.durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  switch (clip.animation) {
    case "zoomIn":
      return { scale: 1.04 + 0.12 * p, tx: 0, ty: 0 };
    case "zoomOut":
      return { scale: 1.16 - 0.12 * p, tx: 0, ty: 0 };
    case "panLeft":
      return { scale: 1.1, tx: 3 - 6 * p, ty: 0 };
    case "panRight":
      return { scale: 1.1, tx: -3 + 6 * p, ty: 0 };
    case "panUp":
      return { scale: 1.1, tx: 0, ty: 3 - 6 * p };
    case "panDown":
      return { scale: 1.1, tx: 0, ty: -3 + 6 * p };
    case "zoomPanLeft":
      return { scale: 1.06 + 0.12 * p, tx: 2 - 4 * p, ty: 0 };
    case "zoomPanRight":
      return { scale: 1.06 + 0.12 * p, tx: -2 + 4 * p, ty: 0 };
    case "static":
    default:
      return { scale: 1.02, tx: 0, ty: 0 };
  }
}

function ClipView({ clip }: { clip: RClip }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kb = kenBurns(clip, frame);
  // 사용자 크기(축소)를 켄 번스 스케일에 곱한다. <1이면 배경(검정)이 보임.
  const userScale = clip.type === "image" ? (clip.scale ?? 1) : 1;
  const transform = `scale(${kb.scale * userScale}) translateX(${kb.tx}%) translateY(${kb.ty}%)`;

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", transform }}>
        {clip.type === "image" ? (
          <Img
            src={clip.src}
            // 브라우저가 못 푸는 이미지(예: HEIC)여도 렌더가 깨지지 않게.
            onError={() => {}}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <OffthreadVideo
            src={clip.src}
            muted
            trimBefore={
              clip.trimStartSec
                ? Math.round(clip.trimStartSec * fps)
                : undefined
            }
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
      {clip.caption.text ? <CaptionView caption={clip.caption} /> : null}
    </AbsoluteFill>
  );
}

function CaptionView({ caption }: { caption: RClip["caption"] }) {
  const { height } = useVideoConfig();
  const pos = caption.position ?? "bottom";
  const justify =
    pos === "top" ? "flex-start" : pos === "center" ? "center" : "flex-end";
  // fontSize는 화면 높이 기준 px. 미리보기/렌더 모두 동일 비율로 스케일됨.
  const fontSize = caption.fontSize ?? Math.round(height * 0.045);
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
        alignItems: "center",
        padding: height * 0.06,
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
  const { fps, height } = useVideoConfig();
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
                padding: height * 0.05,
              }}
            >
              <span
                style={{
                  maxWidth: "88%",
                  textAlign: "center",
                  color: "#ffffff",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  fontSize: Math.round(height * 0.042),
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

function presentationFor(
  type: RTransitionType,
  direction: RTransitionDirection,
  width: number,
  height: number,
): TransitionPresentation<Record<string, unknown>> {
  const p =
    type === "slide"
      ? slide({ direction })
      : type === "wipe"
        ? wipe({ direction })
        : type === "flip"
          ? flip({ direction })
          : type === "clockWipe"
            ? clockWipe({ width, height })
            : type === "none"
              ? none()
              : fade();
  return p as TransitionPresentation<Record<string, unknown>>;
}

/**
 * 배경음악 — 전체 영상 길이에 자동 정합.
 * - 음악이 짧으면 loop로 채우고, 길면 영상 끝에서 자연히 정리(페이드아웃)
 * - 시작 페이드인 + 끝 페이드아웃 (지점은 영상 총 길이에서 계산 → 길이 바뀌면 자동 재계산)
 */
function BackgroundAudio({ src }: { src: string }) {
  const { durationInFrames, fps } = useVideoConfig();
  // 페이드 길이 ~1.5초, 단 영상이 짧으면 줄이고 너무 짧으면 페이드 생략.
  const fade = Math.min(Math.round(fps * 1.5), Math.floor(durationInFrames / 2) - 1);

  return (
    <Audio
      src={src}
      loop
      volume={(f) =>
        fade < 1
          ? 1
          : interpolate(
              f,
              [0, fade, durationInFrames - fade, durationInFrames],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
      }
    />
  );
}

export function GlideVideo({
  clips,
  audioSrc,
  subtitles,
  transitionType,
  transitionDirection,
  transitionDurationInFrames,
}: GlideVideoProps) {
  const { width, height } = useVideoConfig();
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
              presentation={presentationFor(
                transitionType,
                transitionDirection,
                width,
                height,
              )}
              timing={linearTiming({
                durationInFrames: transitionDurationInFrames,
              })}
            />
          );
          return [seq, trans];
        })}
      </TransitionSeries>
      {subtitles.length > 0 ? <SubtitleTrack subtitles={subtitles} /> : null}
      {audioSrc ? <BackgroundAudio src={audioSrc} /> : null}
    </AbsoluteFill>
  );
}
