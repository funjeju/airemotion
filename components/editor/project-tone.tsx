"use client";

import { useTranslations } from "next-intl";
import type { Tone } from "@/lib/remotion/tone";

const TONES: Tone[] = ["calm", "lively"];

/** 영상 분위기(의도 프롬프트) → 톤 선택 → 전체 자동 적용. */
export function ProjectTone({
  prompt,
  tone,
  applying,
  onPromptChange,
  onToneChange,
  onApply,
}: {
  prompt: string;
  tone: Tone;
  applying: boolean;
  onPromptChange: (text: string) => void;
  onToneChange: (tone: Tone) => void;
  onApply: () => void;
}) {
  const t = useTranslations("editor.tone");

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-base font-medium text-ink">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("note")}</p>

      <input
        type="text"
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={t("placeholder")}
        className="mt-3 w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="block text-xs text-muted">{t("tone")}</span>
          <div className="mt-1.5 flex gap-2">
            {TONES.map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => onToneChange(ty)}
                className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm transition ${
                  tone === ty
                    ? "border-accent bg-accent-weak text-accent"
                    : "border-line text-ink hover:border-accent"
                }`}
              >
                {t(`tones.${ty}`)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onApply}
          disabled={applying}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {applying ? t("applying") : t("apply")}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{t("applyHint")}</p>
    </section>
  );
}
