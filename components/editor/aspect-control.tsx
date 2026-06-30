"use client";

import { useTranslations } from "next-intl";
import type { AspectRatio } from "@/remotion/types";

const RATIOS: AspectRatio[] = ["16:9", "9:16"];

/** 화면비율 — 가로(16:9) / 세로(9:16, 쇼츠·릴스). */
export function AspectControl({
  value,
  onChange,
}: {
  value: AspectRatio;
  onChange: (next: AspectRatio) => void;
}) {
  const t = useTranslations("editor.aspect");

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-base font-medium text-ink">
        {t("title")}
      </h2>
      <div className="mt-3 flex gap-2">
        {RATIOS.map((r) => {
          const active = value === r;
          const portrait = r === "9:16";
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className={`flex items-center gap-2 rounded-[var(--radius)] border px-4 py-2 text-sm transition ${
                active
                  ? "border-accent bg-accent-weak text-accent"
                  : "border-line text-ink hover:border-accent"
              }`}
            >
              <span
                className={`inline-block rounded-sm border-2 ${
                  active ? "border-accent" : "border-muted"
                }`}
                style={
                  portrait
                    ? { width: 12, height: 20 }
                    : { width: 22, height: 12 }
                }
                aria-hidden
              />
              <span>
                {r} · {t(portrait ? "portrait" : "landscape")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
