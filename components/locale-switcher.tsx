"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { ko: "한국어", en: "English" };

/** 언어 셀렉터 (상단바 우측). 현재 경로를 유지한 채 locale만 교체. */
export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className="cursor-pointer rounded-[var(--radius)] border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {LABELS[loc] ?? loc}
          </option>
        ))}
      </select>
    </label>
  );
}
