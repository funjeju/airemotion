"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

/** 라이트 / 다크 토글 스위치 (상단바 우측). 기본은 system. */
export function ThemeToggle() {
  const t = useTranslations("nav");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 하이드레이션 불일치 방지: 마운트 전에는 중립 상태로 렌더.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={t("theme")}
      title={isDark ? t("themeDark") : t("themeLight")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-7 w-12 items-center rounded-full border border-line bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span
        className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-accent text-[11px] leading-none transition-transform ${
          isDark ? "translate-x-6" : "translate-x-1"
        }`}
        aria-hidden
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
