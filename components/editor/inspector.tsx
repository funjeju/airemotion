"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type {
  Animation,
  CaptionOverrides,
  Clip,
} from "@/lib/firebase/clips";
import { ANIMATION_POOL } from "@/lib/firebase/clips";

export function Inspector({
  clip,
  onCaptionText,
  onOverrides,
  onAnimation,
  onDelete,
}: {
  clip: Clip | null;
  onCaptionText: (text: string) => void;
  onOverrides: (patch: CaptionOverrides | null) => void;
  onAnimation: (a: Animation) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("editor.inspector");
  const ta = useTranslations("editor.animation");
  const [advanced, setAdvanced] = useState(false);

  if (!clip) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
        {t("selectHint")}
      </div>
    );
  }

  const ov = clip.caption.overrides ?? {};
  const setOv = (patch: CaptionOverrides) =>
    onOverrides({ ...ov, ...patch });

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-base font-medium text-ink">
        {t("title")}
      </h2>

      {/* 자막 텍스트 */}
      <label className="mt-4 block text-sm font-medium text-ink">
        {t("caption")}
      </label>
      <input
        type="text"
        value={clip.caption.text}
        onChange={(e) => onCaptionText(e.target.value)}
        placeholder={t("captionPlaceholder")}
        className="mt-1.5 w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      {/* 사진 효과 선택 */}
      {clip.type === "image" && (
        <div className="mt-4">
          <span className="block text-sm font-medium text-ink">
            {t("animation")}
          </span>
          <div className="mt-1.5 flex gap-2">
            {ANIMATION_POOL.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onAnimation(a)}
                className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm transition ${
                  clip.animation === a
                    ? "border-accent bg-accent-weak text-accent"
                    : "border-line text-ink hover:border-accent"
                }`}
              >
                {ta(a)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 세부 조정 (펼침) */}
      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="mt-4 text-sm text-accent hover:underline"
      >
        {advanced ? "▾ " : "▸ "}
        {t("advanced")}
      </button>

      {advanced && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-muted">
            {t("color")}
            <input
              type="color"
              value={ov.color ?? "#ffffff"}
              onChange={(e) => setOv({ color: e.target.value })}
              className="mt-1 block h-8 w-full rounded-md border border-line bg-bg"
            />
          </label>
          <label className="text-xs text-muted">
            {t("bgColor")}
            <input
              type="color"
              value={ov.bgColor ?? "#000000"}
              onChange={(e) => setOv({ bgColor: e.target.value })}
              className="mt-1 block h-8 w-full rounded-md border border-line bg-bg"
            />
          </label>
          <label className="text-xs text-muted">
            {t("fontSize")}
            <input
              type="number"
              min={12}
              max={96}
              value={ov.fontSize ?? 28}
              onChange={(e) => setOv({ fontSize: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border border-line bg-bg px-2 py-1 text-sm text-ink"
            />
          </label>
          <label className="text-xs text-muted">
            {t("position")}
            <select
              value={ov.position ?? "bottom"}
              onChange={(e) =>
                setOv({ position: e.target.value as "top" | "center" | "bottom" })
              }
              className="mt-1 block w-full rounded-md border border-line bg-bg px-2 py-1 text-sm text-ink"
            >
              <option value="top">{t("top")}</option>
              <option value="center">{t("center")}</option>
              <option value="bottom">{t("bottom")}</option>
            </select>
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="mt-5 text-sm text-muted transition hover:text-render"
      >
        {t("delete")}
      </button>
    </div>
  );
}
