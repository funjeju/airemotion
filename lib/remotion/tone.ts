import type { AnimationKind } from "@/remotion/types";
import type { TransitionSettings } from "./to-props";

// 프롬프트 의도 → 효과 톤. (docs/04: 잔잔함=느린 켄번스+느린 크로스페이드, 활기참=빠른 전환+컷 위주)
export type Tone = "calm" | "lively";

export type TonePreset = {
  transition: TransitionSettings;
  photoSec: number;
  animPool: AnimationKind[];
};

export const TONE_PRESET: Record<Tone, TonePreset> = {
  calm: {
    transition: { type: "fade", direction: "from-left", speed: "slow" },
    photoSec: 5,
    animPool: ["zoomIn", "zoomOut"],
  },
  lively: {
    transition: { type: "none", direction: "from-left", speed: "fast" },
    photoSec: 3,
    animPool: ["zoomIn", "zoomOut", "panLeft", "panRight"],
  },
};

const CALM_WORDS = [
  "잔잔", "차분", "감성", "따뜻", "가족", "추억", "조용", "힐링", "은은",
  "calm", "gentle", "soft", "memory", "family", "warm", "quiet",
];
const LIVELY_WORDS = [
  "활기", "신나", "경쾌", "역동", "빠른", "파티", "홍보", "광고", "발랄", "다이내믹",
  "energetic", "lively", "fun", "party", "promo", "dynamic", "upbeat", "fast",
];

/** 프롬프트에서 톤 추정. 기본은 잔잔함(안전). */
export function detectTone(prompt: string): Tone {
  const p = prompt.toLowerCase();
  const lively = LIVELY_WORDS.some((w) => p.includes(w));
  const calm = CALM_WORDS.some((w) => p.includes(w));
  if (lively && !calm) return "lively";
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
