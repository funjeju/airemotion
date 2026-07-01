import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
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
  type ROverlay,
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
      {clip.overlays && clip.overlays.length > 0 ? (
        <OverlayLayer
          overlays={clip.overlays}
          clipDuration={clip.durationInFrames}
        />
      ) : null}
    </AbsoluteFill>
  );
}

/** 오버레이(요소) — 말풍선·제목·스티커·이모지·이미지. 등장 애니메이션 프리셋. */
function OverlayLayer({
  overlays,
  clipDuration,
}: {
  overlays: ROverlay[];
  clipDuration: number;
}) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const appear = Math.min(fps * 0.4, clipDuration * 0.3);

  // 텍스트형인데 내용이 비면 아무것도 안 보이게(디폴트 텍스트 없음).
  const visible = overlays.filter(
    (o) =>
      !(
        (o.type === "title" ||
          o.type === "speech" ||
          o.type === "badge" ||
          o.type === "emoji") &&
        !o.text.trim()
      ),
  );

  return (
    <AbsoluteFill>
      {visible.map((o) => {
        const base = interpolate(frame, [0, appear], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        let opacity = base;
        let ty = 0;
        let scaleMul = 1;
        let text = o.text;

        switch (o.anim) {
          case "pop": {
            const s = spring({
              frame,
              fps,
              config: { damping: 12, stiffness: 140 },
              durationInFrames: appear,
            });
            scaleMul = 0.6 + 0.4 * s;
            break;
          }
          case "slideUp":
            ty = (1 - base) * height * 0.06;
            break;
          case "slideDown":
            ty = -(1 - base) * height * 0.06;
            break;
          case "typing": {
            opacity = 1;
            if (o.text) {
              const total = o.text.length;
              const shown = Math.floor(
                interpolate(frame, [0, Math.max(1, total) * 2], [0, total], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              );
              text = o.text.slice(0, shown);
            }
            break;
          }
          default:
            break; // fade
        }

        // 퇴장 애니메이션(클립 끝 부분)
        if (o.exit && o.exit !== "none") {
          const ep = interpolate(
            frame,
            [clipDuration - appear, clipDuration],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          opacity *= 1 - ep;
          if (o.exit === "pop") scaleMul *= 1 - 0.4 * ep;
          if (o.exit === "slideUp") ty -= ep * height * 0.06;
          if (o.exit === "slideDown") ty += ep * height * 0.06;
        }

        return (
          <div
            key={o.id}
            style={{
              position: "absolute",
              left: `${o.x}%`,
              top: `${o.y}%`,
              transform: `translate(-50%, calc(-50% + ${ty}px)) scale(${o.scale * scaleMul})`,
              opacity,
            }}
          >
            <OverlayShape overlay={{ ...o, text }} height={height} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function OverlayShape({
  overlay: o,
  height,
}: {
  overlay: ROverlay;
  height: number;
}) {
  const u = height * 0.09; // 스티커 기본 크기 단위
  const outline = o.outline
    ? {
        WebkitTextStroke: `${Math.max(1, height * 0.004)}px #111`,
        paintOrder: "stroke" as const,
      }
    : {};
  switch (o.type) {
    case "title":
      return (
        <span
          style={{
            display: "inline-block",
            backgroundColor: o.color,
            color: "#ffffff",
            fontSize: height * 0.06,
            fontWeight: o.fontWeight ?? 800,
            ...outline,
            fontFamily: "'Space Grotesk', Inter, sans-serif",
            padding: "0.1em 0.4em",
            borderRadius: 10,
            lineHeight: 1.15,
            whiteSpace: "pre-wrap",
            textAlign: "center",
            boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
          }}
        >
          {o.text}
        </span>
      );
    case "speech":
      return (
        <div style={{ position: "relative" }}>
          <span
            style={{
              display: "inline-block",
              backgroundColor: "#ffffff",
              color: "#1a1d21",
              fontSize: height * 0.034,
              fontWeight: o.fontWeight ?? 600,
              ...outline,
              fontFamily: "Inter, sans-serif",
              padding: "0.5em 0.8em",
              borderRadius: 18,
              maxWidth: height * 0.9,
              lineHeight: 1.3,
              whiteSpace: "pre-wrap",
              textAlign: "center",
              boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
            }}
          >
            {o.text}
          </span>
          <span
            style={{
              position: "absolute",
              bottom: -height * 0.018,
              left: "25%",
              width: 0,
              height: 0,
              borderLeft: `${height * 0.018}px solid transparent`,
              borderRight: `${height * 0.018}px solid transparent`,
              borderTop: `${height * 0.02}px solid #ffffff`,
            }}
          />
        </div>
      );
    case "badge":
      return (
        <span
          style={{
            display: "inline-block",
            backgroundColor: o.color,
            color: "#ffffff",
            fontSize: height * 0.03,
            fontWeight: o.fontWeight ?? 800,
            ...outline,
            letterSpacing: "0.05em",
            fontFamily: "Inter, sans-serif",
            padding: "0.25em 0.7em",
            borderRadius: 999,
            textTransform: "uppercase",
          }}
        >
          {o.text}
        </span>
      );
    case "arrow":
      return (
        <svg width={u * 1.6} height={u} viewBox="0 0 80 50">
          <path
            d="M5 25 H60 M45 10 L65 25 L45 40"
            stroke={o.color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    case "star":
      return (
        <svg width={u} height={u} viewBox="0 0 50 50">
          <path
            d="M25 3 L31 19 L48 19 L34 30 L39 47 L25 37 L11 47 L16 30 L2 19 L19 19 Z"
            fill={o.color}
            stroke="#fff"
            strokeWidth={2}
          />
        </svg>
      );
    case "heart":
      return (
        <svg width={u} height={u} viewBox="0 0 50 50">
          <path
            d="M25 44 C10 32 3 24 3 16 C3 9 9 4 15 4 C19 4 23 6 25 10 C27 6 31 4 35 4 C41 4 47 9 47 16 C47 24 40 32 25 44 Z"
            fill={o.color}
            stroke="#fff"
            strokeWidth={2}
          />
        </svg>
      );
    case "circle":
      return (
        <svg width={u * 1.6} height={u * 1.2} viewBox="0 0 80 60">
          <ellipse
            cx={40}
            cy={30}
            rx={35}
            ry={25}
            fill="none"
            stroke={o.color}
            strokeWidth={6}
          />
        </svg>
      );
    case "emoji":
      return (
        <span
          style={{
            fontSize: height * 0.12,
            lineHeight: 1,
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
          }}
        >
          {o.text}
        </span>
      );
    case "image":
      return o.src ? (
        <Img
          src={o.src}
          onError={() => {}}
          style={{
            width: height * 0.28,
            height: "auto",
            filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.3))",
          }}
        />
      ) : null;
    default:
      return null;
  }
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

/** 영상 끝 검정 페이드아웃(여운). */
function EndFade() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const dur = Math.min(fps * 1, durationInFrames * 0.3);
  const opacity = interpolate(
    frame,
    [durationInFrames - dur, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "black", opacity }} />
  );
}

export function GlideVideo({
  clips,
  audioTracks,
  subtitles,
  transitionType,
  transitionDirection,
  transitionDurationInFrames,
  endFadeOut,
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
      {audioTracks.map((src, i) => (
        <BackgroundAudio key={`${src}-${i}`} src={src} />
      ))}
      {endFadeOut ? <EndFade /> : null}
    </AbsoluteFill>
  );
}
