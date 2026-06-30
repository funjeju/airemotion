import type { AnimationKind } from "@/remotion/types";
import type { TransitionSettings } from "./to-props";

// 프롬프트 의도 → 효과 톤. 자동 배정/전환/길이를 톤에 맞춰 일괄 적용.
export type Tone =
  | "calm"
  | "lively"
  | "cinematic"
  | "cheerful"
  | "dynamic"
  | "bold";

export type TonePreset = {
  transition: TransitionSettings;
  photoSec: number;
  animPool: AnimationKind[];
};

export const TONE_PRESET: Record<Tone, TonePreset> = {
  // 잔잔함 — 느린 크로스페이드 + 부드러운 줌, 길게.
  calm: {
    transition: { type: "fade", direction: "from-left", speed: "slow" },
    photoSec: 5,
    animPool: ["zoomIn", "zoomOut"],
  },
  // 활기참 — 컷 위주 + 빠르게, 짧게.
  lively: {
    transition: { type: "none", direction: "from-left", speed: "fast" },
    photoSec: 3,
    animPool: ["zoomIn", "zoomOut", "panLeft", "panRight"],
  },
  // 시네마틱 — 아주 느린 크로스페이드 + 줌+팬 드리프트, 가장 길게.
  cinematic: {
    transition: { type: "fade", direction: "from-left", speed: "slow" },
    photoSec: 6,
    animPool: ["zoomIn", "zoomPanLeft", "zoomPanRight"],
  },
  // 발랄 — 슬라이드 + 보통, 경쾌한 팬.
  cheerful: {
    transition: { type: "slide", direction: "from-left", speed: "normal" },
    photoSec: 3.5,
    animPool: ["zoomIn", "panRight", "panLeft"],
  },
  // 역동 — 빠른 슬라이드 + 사방 팬, 짧게.
  dynamic: {
    transition: { type: "slide", direction: "from-right", speed: "fast" },
    photoSec: 2.5,
    animPool: ["panLeft", "panRight", "panUp", "panDown"],
  },
  // 강렬 — 플립 + 빠르게, 임팩트.
  bold: {
    transition: { type: "flip", direction: "from-left", speed: "fast" },
    photoSec: 3,
    animPool: ["zoomIn", "zoomOut"],
  },
};

export const TONE_LIST = Object.keys(TONE_PRESET) as Tone[];

// 톤별 감지 키워드(우선순위: 배열 앞쪽부터 검사).
const TONE_WORDS: { tone: Tone; words: string[] }[] = [
  {
    tone: "cinematic",
    words: ["시네마틱", "영화", "웅장", "드라마", "무드", "cinematic", "movie", "epic"],
  },
  {
    tone: "dynamic",
    words: ["역동", "다이내믹", "스포츠", "파워", "운동", "dynamic", "sport", "action"],
  },
  {
    tone: "bold",
    words: ["강렬", "임팩트", "힙", "트렌디", "자극", "bold", "impact", "punchy"],
  },
  {
    tone: "cheerful",
    words: ["발랄", "경쾌", "상큼", "귀여", "밝은", "즐거", "cheerful", "cute", "bright"],
  },
  {
    tone: "lively",
    words: ["활기", "신나", "파티", "홍보", "광고", "업비트", "lively", "party", "promo", "fun"],
  },
  {
    tone: "calm",
    words: ["잔잔", "차분", "조용", "힐링", "은은", "따뜻", "가족", "추억", "감성", "calm", "gentle", "soft", "family"],
  },
];

/** 프롬프트에서 톤 추정. 매칭 없으면 잔잔함(안전 기본). */
export function detectTone(prompt: string): Tone {
  const p = prompt.toLowerCase();
  for (const { tone, words } of TONE_WORDS) {
    if (words.some((w) => p.includes(w.toLowerCase()))) return tone;
  }
  return "calm";
}

/** 톤 풀에서 직전과 겹치지 않게 순환 배정. */
export function pickFromPool(
  pool: AnimationKind[],
  prev: AnimationKind | null,
): AnimationKind {
  if (!prev) return pool[0];
  const i = pool.indexOf(prev);
  if (i === -1) return pool[0];
  return pool[(i + 1) % pool.length];
}
