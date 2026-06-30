import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // 한국어/영어 기본 제공 — 배열에 추가하는 것만으로 확장 가능.
  locales: ["ko", "en"],
  defaultLocale: "ko",
});

export type Locale = (typeof routing.locales)[number];
