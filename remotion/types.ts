// Remotion 번들 전용 타입 — Firebase 등 앱 의존성 없이 직렬화 가능한 형태만.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// 화면비율 — 가로(16:9) / 세로(9:16, 쇼츠·릴스)
export type AspectRatio = "16:9" | "9:16";

export const DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

// ── 사진 애니메이션(켄 번스) ──
// 자동 배정은 안전한 소수만(ANIMATION_AUTO_POOL), 수동 선택은 전체 팔레트.
export type AnimationKind =
  | "zoomIn"
  | "zoomOut"
  | "panLeft"
  | "panRight"
  | "panUp"
  | "panDown"
  | "zoomPanLeft"
  | "zoomPanRight"
  | "static";

export type RAnimation = AnimationKind | null;

export const ANIMATION_PALETTE: AnimationKind[] = [
  "zoomIn",
  "zoomOut",
  "panLeft",
  "panRight",
  "panUp",
  "panDown",
  "zoomPanLeft",
  "zoomPanRight",
  "static",
];

// AI 자동 배정 풀(무난한 효과만 — 연속 변주가 섞여도 안전).
export const ANIMATION_AUTO_POOL: AnimationKind[] = [
  "zoomIn",
  "zoomOut",
  "panLeft",
];

export type RCaption = {
  text: string;
  color?: string;
  bgColor?: string;
  fontSize?: number; // 1080 높이 기준 px
  position?: "top" | "center" | "bottom";
};

// 오버레이(요소) — 말풍선·제목 템플릿·스티커
export type ROverlayType =
  | "speech"
  | "title"
  | "badge"
  | "arrow"
  | "star"
  | "heart"
  | "circle"
  | "emoji"
  | "image";

// 팔레트(버튼)로 추가하는 도형/텍스트 요소. 이모지·이미지는 별도 UI로 추가.
export const OVERLAY_TYPES: ROverlayType[] = [
  "title",
  "speech",
  "badge",
  "arrow",
  "star",
  "heart",
  "circle",
];

export const OVERLAY_HAS_TEXT: Record<ROverlayType, boolean> = {
  speech: true,
  title: true,
  badge: true,
  arrow: false,
  star: false,
  heart: false,
  circle: false,
  emoji: true,
  image: false,
};

export type ROverlayAnim =
  | "fade"
  | "pop"
  | "slideUp"
  | "slideDown"
  | "typing";

export const OVERLAY_ANIMS: ROverlayAnim[] = [
  "fade",
  "pop",
  "slideUp",
  "slideDown",
  "typing",
];

export type ROverlayExit = "none" | "fade" | "pop" | "slideUp" | "slideDown";
export const OVERLAY_EXITS: ROverlayExit[] = [
  "none",
  "fade",
  "pop",
  "slideUp",
  "slideDown",
];

export type ROverlay = {
  id: string;
  type: ROverlayType;
  text: string; // 텍스트형만 사용
  src?: string; // 이미지 클립아트(type==="image")
  anim?: ROverlayAnim;
  exit?: ROverlayExit;
  fontWeight?: number; // 텍스트 굵기 500/700/900
  outline?: boolean; // 텍스트 외곽선
  x: number; // 0~100 (%)
  y: number; // 0~100 (%)
  scale: number; // 0.5~2
  color: string;
};

export type RClip = {
  type: "image" | "video";
  src: string;
  durationInFrames: number;
  animation: RAnimation;
  caption: RCaption;
  scale?: number; // 화면 내 이미지 크기(0.5~1, 기본 1)
  overlays?: ROverlay[];
  // 영상 트림: 소스에서 잘라낼 시작 지점(초). durationInFrames가 잘린 구간 길이.
  trimStartSec?: number;
};

// Whisper 자동 자막(타임 기반, 전역 타임라인 기준)
export type RSubtitle = {
  startMs: number;
  endMs: number;
  text: string;
};

// ── 화면 전환(전체 영상 일관 적용) ──
export type RTransitionType =
  | "fade"
  | "slide"
  | "wipe"
  | "flip"
  | "clockWipe"
  | "none";

export type RTransitionDirection =
  | "from-left"
  | "from-right"
  | "from-top"
  | "from-bottom";

export type TransitionSpeed = "slow" | "normal" | "fast";

export const TRANSITION_PALETTE: RTransitionType[] = [
  "fade",
  "slide",
  "wipe",
  "flip",
  "clockWipe",
  "none",
];

// 방향 옵션이 의미 있는 전환들
export const DIRECTIONAL_TRANSITIONS: RTransitionType[] = [
  "slide",
  "wipe",
  "flip",
];

export const TRANSITION_FRAMES_BY_SPEED: Record<TransitionSpeed, number> = {
  slow: 24,
  normal: 15,
  fast: 8,
};

export type GlideVideoProps = {
  clips: RClip[];
  audioTracks: string[]; // 여러 배경음악 동시 재생(믹스)
  subtitles: RSubtitle[];
  transitionType: RTransitionType;
  transitionDirection: RTransitionDirection;
  transitionDurationInFrames: number;
  aspectRatio: AspectRatio;
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
