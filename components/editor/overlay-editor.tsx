"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { Overlay } from "@/lib/firebase/clips";
import {
  OVERLAY_ANIMS,
  OVERLAY_HAS_TEXT,
  OVERLAY_TYPES,
  type ROverlayType,
} from "@/remotion/types";

const ICON: Record<ROverlayType, string> = {
  title: "T",
  speech: "💬",
  badge: "🏷",
  arrow: "➡",
  star: "⭐",
  heart: "❤",
  circle: "⭕",
  emoji: "😀",
  image: "🖼",
};

const ANCHORS = [15, 50, 85];
const EMOJIS = [
  "😀", "😍", "😂", "👍", "🎉", "❤️", "🔥", "⭐",
  "✅", "💯", "🥳", "😎", "🙏", "👏", "💡", "📌",
];
const COLOR_TYPES: ROverlayType[] = [
  "title", "badge", "arrow", "star", "heart", "circle",
];

export function OverlayEditor({
  overlays,
  onAdd,
  onAddEmoji,
  onUploadImage,
  uploading,
  onUpdate,
  onDelete,
}: {
  overlays: Overlay[];
  onAdd: (type: ROverlayType) => void;
  onAddEmoji: (emoji: string) => void;
  onUploadImage: (file: File) => void;
  uploading: boolean;
  onUpdate: (id: string, patch: Partial<Overlay>) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("editor.overlay");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-4">
      <span className="block text-sm font-medium text-ink">{t("title")}</span>

      {/* 도형/텍스트 요소 */}
      <div className="mt-1.5 flex flex-wrap gap-2">
        {OVERLAY_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line px-3 py-1.5 text-sm text-ink transition hover:border-accent"
          >
            <span aria-hidden>{ICON[type]}</span>
            {t(`types.${type}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line px-3 py-1.5 text-sm text-ink transition hover:border-accent disabled:opacity-50"
        >
          🖼 {uploading ? t("uploading") : t("uploadImage")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadImage(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* 이모지 픽커 */}
      <div className="mt-2 flex flex-wrap gap-1">
        {EMOJIS.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => onAddEmoji(em)}
            className="rounded-md px-1.5 py-0.5 text-lg transition hover:bg-accent-weak"
          >
            {em}
          </button>
        ))}
      </div>

      {/* 추가된 요소 목록 */}
      {overlays.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {overlays.map((o) => {
            const anims = OVERLAY_HAS_TEXT[o.type]
              ? OVERLAY_ANIMS
              : OVERLAY_ANIMS.filter((a) => a !== "typing");
            return (
              <li
                key={o.id}
                className="rounded-[var(--radius)] border border-line bg-bg p-3"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden>{ICON[o.type]}</span>
                  <span className="text-sm font-medium text-ink">
                    {t(`types.${o.type}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(o.id)}
                    className="ml-auto px-1 text-muted transition hover:text-render"
                    aria-label={t("remove")}
                  >
                    ✕
                  </button>
                </div>

                {OVERLAY_HAS_TEXT[o.type] ? (
                  <input
                    type="text"
                    value={o.text}
                    onChange={(e) => onUpdate(o.id, { text: e.target.value })}
                    placeholder={t("textPlaceholder")}
                    className="mt-2 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                ) : null}

                {/* 등장 애니메이션 */}
                <div className="mt-2">
                  <span className="block text-[11px] text-muted">
                    {t("anim")}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {anims.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => onUpdate(o.id, { anim: a })}
                        className={`rounded-md border px-2 py-0.5 text-xs transition ${
                          (o.anim ?? "fade") === a
                            ? "border-accent bg-accent-weak text-accent"
                            : "border-line text-ink hover:border-accent"
                        }`}
                      >
                        {t(`anims.${a}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {/* 위치 3x3 */}
                  <div>
                    <span className="block text-[11px] text-muted">
                      {t("position")}
                    </span>
                    <div className="mt-1 grid grid-cols-3 gap-0.5">
                      {ANCHORS.map((y) =>
                        ANCHORS.map((x) => {
                          const active =
                            Math.abs(o.x - x) < 8 && Math.abs(o.y - y) < 8;
                          return (
                            <button
                              key={`${x}-${y}`}
                              type="button"
                              onClick={() => onUpdate(o.id, { x, y })}
                              className={`h-4 w-4 rounded-sm border ${
                                active
                                  ? "border-accent bg-accent"
                                  : "border-line hover:border-accent"
                              }`}
                              aria-label={`${x},${y}`}
                            />
                          );
                        }),
                      )}
                    </div>
                  </div>

                  {/* 크기 */}
                  <label className="text-[11px] text-muted">
                    {t("size")} {Math.round(o.scale * 100)}%
                    <input
                      type="range"
                      min={50}
                      max={200}
                      step={10}
                      value={Math.round(o.scale * 100)}
                      onChange={(e) =>
                        onUpdate(o.id, { scale: Number(e.target.value) / 100 })
                      }
                      className="mt-0.5 block w-28 accent-[var(--accent)]"
                    />
                  </label>

                  {/* 색 (해당 타입만) */}
                  {COLOR_TYPES.includes(o.type) ? (
                    <label className="text-[11px] text-muted">
                      {t("color")}
                      <input
                        type="color"
                        value={o.color}
                        onChange={(e) =>
                          onUpdate(o.id, { color: e.target.value })
                        }
                        className="mt-0.5 block h-7 w-10 rounded border border-line bg-surface"
                      />
                    </label>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
