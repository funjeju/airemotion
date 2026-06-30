// 렌더 백엔드 구분 — 셀프호스트/로컬(무료) vs 우리 클라우드(AWS Lambda, 유료).
export type RenderProvider = "local" | "lambda";

/**
 * 배포 단위 기본 공급자.
 * - 셀프호스터/로컬: GLIDE_RENDER_PROVIDER 미설정 → "local"(자기 머신에서 렌더, 무료)
 * - 우리 SaaS: GLIDE_RENDER_PROVIDER=lambda → 클라우드 렌더(유료, plan 필요)
 */
export function resolveRenderProvider(): RenderProvider {
  return process.env.GLIDE_RENDER_PROVIDER === "lambda" ? "lambda" : "local";
}

export type UserPlan = "free" | "pro";

/** 클라우드(lambda) 렌더는 pro 플랜(또는 크레딧) 필요. 로컬은 무료. */
export function canUseProvider(provider: RenderProvider, plan: UserPlan): boolean {
  return provider === "local" || plan === "pro";
}
