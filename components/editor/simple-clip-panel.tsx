"use client";

import { useTranslations } from "next-intl";
import type { Clip, Overlay } from "@/lib/firebase/clips";
import type { AspectRatio } from "@/remotion/types";
import { OverlayPositioner } from "./overlay-editor";

/** 단순 모드용 경량 편집 — 선택 클립의 자막과 타이틀만. */
export function SimpleClipPanel({
  hasSelection,
  caption,
  title,
  onCaption,
  onTitle,
  clip,
  aspectRatio,
  titleOverlay,
  onMoveTitle,
}: {
  hasSelection: boolean;
  caption: string;
  title: string;
  onCaption: (text: string) => void;
  onTitle: (text: string) => void;
  clip: Clip | null;
  aspectRatio: AspectRatio;
  titleOverlay: Overlay | null;
  onMoveTitle: (x: number, y: number) => void;
}) {
  const t = useTranslations("editor.simple");

  if (!hasSelection) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        {t("selectHint")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <label className="block text-sm font-medium text-ink">
        {t("title")}
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder={t("titlePlaceholder")}
        className="mt-1.5 w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      {clip && titleOverlay ? (
        <OverlayPositioner
          clip={clip}
          aspectRatio={aspectRatio}
          overlays={[titleOverlay]}
          onMove={(_id, x, y) => onMoveTitle(x, y)}
          hint={t("dragTitleHint")}
        />
      ) : null}
      <label className="mt-3 block text-sm font-medium text-ink">
        {t("caption")}
      </label>
      <input
        type="text"
        value={caption}
        onChange={(e) => onCaption(e.target.value)}
        placeholder={t("captionPlaceholder")}
        className="mt-1.5 w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <p className="mt-2 text-xs text-muted">{t("hint")}</p>
    </div>
  );
}
