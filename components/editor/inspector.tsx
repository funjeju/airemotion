"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Animation, CaptionOverrides, Clip, Overlay } from "@/lib/firebase/clips";
import { ANIMATION_PALETTE, type ROverlayType } from "@/remotion/types";
import { EffectPreview } from "./sample-previews";
import { OverlayEditor } from "./overlay-editor";

export function Inspector({
  clip,
  onCaptionText,
  onOverrides,
  onAnimation,
  onDuration,
  onScale,
  onApplyToAll,
  onAddOverlay,
  onUpdateOverlay,
  onDeleteOverlay,
  onOpenTrim,
  onAutoCut,
  autoCutting,
  autoCutError,
  onDelete,
}: {
  clip: Clip | null;
  onCaptionText: (text: string) => void;
  onOverrides: (patch: CaptionOverrides | null) => void;
  onAnimation: (a: Animation) => void;
  onDuration: (sec: number) => void;
  onScale: (scale: number) => void;
  onApplyToAll: () => void;
  onAddOverlay: (type: ROverlayType) => void;
  onUpdateOverlay: (id: string, patch: Partial<Overlay>) => void;
  onDeleteOverlay: (id: string) => void;
  onOpenTrim: () => void;
  onAutoCut: () => void;
  autoCutting: boolean;
  autoCutError: string | null;
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
          <div className="mt-2 max-w-[260px]">
            <EffectPreview animation={clip.animation ?? "static"} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ANIMATION_PALETTE.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onAnimation(a)}
                className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm transition ${
                  (clip.animation ?? "static") === a
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

      {/* 사진 노출 시간 */}
      {clip.type === "image" && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-ink">
            {t("duration")}
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min={0.5}
              max={30}
              step={0.5}
              value={Number(clip.durationSec.toFixed(1))}
              onChange={(e) => onDuration(Number(e.target.value))}
              className="w-24 rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <span className="font-mono text-xs text-muted">{t("seconds")}</span>
          </div>
        </div>
      )}

      {/* 이미지 크기(축소) */}
      {clip.type === "image" && (
        <div className="mt-4">
          <label className="flex items-center justify-between text-sm font-medium text-ink">
            {t("scale")}
            <span className="font-mono text-xs text-muted">
              {Math.round((clip.scale ?? 1) * 100)}%
            </span>
          </label>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={Math.round((clip.scale ?? 1) * 100)}
            onChange={(e) => onScale(Number(e.target.value) / 100)}
            className="mt-1.5 w-full accent-[var(--accent)]"
          />
        </div>
      )}

      {/* 모든 사진에 이 설정 적용 */}
      {clip.type === "image" && (
        <button
          type="button"
          onClick={onApplyToAll}
          className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius)] border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent-weak"
        >
          ⎘ {t("applyToAll")}
        </button>
      )}

      {/* 요소(말풍선·제목·스티커) 오버레이 */}
      <OverlayEditor
        overlays={clip.overlays ?? []}
        onAdd={onAddOverlay}
        onUpdate={onUpdateOverlay}
        onDelete={onDeleteOverlay}
      />

      {/* 영상 편집(트림/컷) + 자동 컷 */}
      {clip.type === "video" && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenTrim}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-line px-4 py-2 text-sm text-ink transition hover:border-accent"
            >
              ✂ {t("editVideo")}
            </button>
            <button
              type="button"
              onClick={onAutoCut}
              disabled={autoCutting}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent-weak disabled:opacity-50"
            >
              {autoCutting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
                  {t("autoCutting")}
                </>
              ) : (
                <>✨ {t("autoCut")}</>
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted">{t("autoCutHint")}</p>
          {autoCutError ? (
            <p className="mt-1.5 text-xs text-render" role="alert">
              {autoCutError}
            </p>
          ) : null}
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
              min={24}
              max={160}
              step={2}
              value={ov.fontSize ?? 48}
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
