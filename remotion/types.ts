// Remotion 번들 전용 타입 — Firebase 등 앱 의존성 없이 직렬화 가능한 형태만.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TRANSITION_FRAMES = 15; // 0.5s 크로스페이드

export type RAnimation = "zoomIn" | "zoomOut" | "pan" | null;

export type RCaption = {
  text: string;
  color?: string;
  bgColor?: string;
  fontSize?: number; // 1080 높이 기준 px
  position?: "top" | "center" | "bottom";
};

export type RClip = {
  type: "image" | "video";
  src: string;
  durationInFrames: number;
  animation: RAnimation;
  caption: RCaption;
};

// Whisper 자동 자막(타임 기반, 전역 타임라인 기준)
export type RSubtitle = {
  startMs: number;
  endMs: number;
  text: string;
};

// 화면 전환 (전체 영상에 일관 적용)
export type RTransitionType = "fade" | "slide" | "none";
export type TransitionSpeed = "slow" | "normal" | "fast";

export const TRANSITION_FRAMES_BY_SPEED: Record<TransitionSpeed, number> = {
  slow: 24,
  normal: 15,
  fast: 8,
};

export type GlideVideoProps = {
  clips: RClip[];
  audioSrc: string | null;
  subtitles: RSubtitle[];
  transitionType: RTransitionType;
  transitionDurationInFrames: number;
};

/** 전환은 인접 클립을 겹치므로 총 길이에서 전환 프레임을 뺀다(컷은 겹침 없음). */
export function totalDurationInFrames(
  clips: RClip[],
  transitionFrames: number,
): number {
  if (clips.length === 0) return 1;
  const sum = clips.reduce((a, c) => a + c.durationInFrames, 0);
  const overlap = Math.max(0, clips.length - 1) * transitionFrames;
  return Math.max(1, sum - overlap);
}
