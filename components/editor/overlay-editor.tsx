"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Clip, Overlay } from "@/lib/firebase/clips";
import {
  OVERLAY_ANIMS,
  OVERLAY_EXITS,
  OVERLAY_HAS_TEXT,
  OVERLAY_TYPES,
  type AspectRatio,
  type ROverlayType,
} from "@/remotion/types";

const WEIGHTS = [500, 700, 900];
const WEIGHT_LABEL: Record<number, string> = { 500: "보통", 700: "굵게", 900: "진하게" };

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
const SHAPE_TYPES: ROverlayType[] = ["arrow", "star", "heart", "circle"];
const TEXTBG_TYPES: ROverlayType[] = ["title", "speech", "badge"];

export function OverlayEditor({
  clip,
  aspectRatio,
  overlays,
  onAdd,
  onAddEmoji,
  onUploadImage,
  uploading,
  onUpdate,
  onDelete,
  onApplyToAllClips,
}: {
  clip: Clip;
  aspectRatio: AspectRatio;
  overlays: Overlay[];
  onAdd: (type: ROverlayType) => void;
  onAddEmoji: (emoji: string) => void;
  onUploadImage: (file: File) => void;
  uploading: boolean;
  onUpdate: (id: string, patch: Partial<Overlay>) => void;
  onDelete: (id: string) => void;
  onApplyToAllClips: () => void;
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

      {/* 드래그 위치 패드 */}
      {overlays.length > 0 ? (
        <OverlayPositioner
          clip={clip}
          aspectRatio={aspectRatio}
          overlays={overlays}
          onMove={(id, x, y) => onUpdate(id, { x, y })}
          hint={t("dragHint")}
        />
      ) : null}

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

                {/* 퇴장 애니메이션 */}
                <div className="mt-2">
                  <span className="block text-[11px] text-muted">
                    {t("exit")}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {OVERLAY_EXITS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => onUpdate(o.id, { exit: a })}
                        className={`rounded-md border px-2 py-0.5 text-xs transition ${
                          (o.exit ?? "none") === a
                            ? "border-accent bg-accent-weak text-accent"
                            : "border-line text-ink hover:border-accent"
                        }`}
                      >
                        {t(`exits.${a}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 텍스트 옵션(굵기·외곽선) */}
                {OVERLAY_HAS_TEXT[o.type] && o.type !== "emoji" ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div>
                      <span className="block text-[11px] text-muted">
                        {t("weight")}
                      </span>
                      <div className="mt-1 flex gap-1.5">
                        {WEIGHTS.map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => onUpdate(o.id, { fontWeight: w })}
                            className={`rounded-md border px-2 py-0.5 text-xs transition ${
                              (o.fontWeight ?? 700) === w
                                ? "border-accent bg-accent-weak text-accent"
                                : "border-line text-ink hover:border-accent"
                            }`}
                          >
                            {WEIGHT_LABEL[w]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={!!o.outline}
                        onChange={(e) =>
                          onUpdate(o.id, { outline: e.target.checked })
                        }
                        className="accent-[var(--accent)]"
                      />
                      {t("outline")}
                    </label>
                  </div>
                ) : null}

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

                  {/* 스티커 색(도형) */}
                  {SHAPE_TYPES.includes(o.type) ? (
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

                {/* 텍스트 요소: 글자색·배경색·투명도 */}
                {TEXTBG_TYPES.includes(o.type) ? (
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <label className="text-[11px] text-muted">
                      {t("textColor")}
                      <input
                        type="color"
                        value={o.textColor ?? "#ffffff"}
                        onChange={(e) =>
                          onUpdate(o.id, { textColor: e.target.value })
                        }
                        className="mt-0.5 block h-7 w-10 rounded border border-line bg-surface"
                      />
                    </label>
                    <label className="text-[11px] text-muted">
                      {t("bgColor")}
                      <input
                        type="color"
                        value={o.bgColor ?? o.color ?? "#5654d4"}
                        onChange={(e) =>
                          onUpdate(o.id, { bgColor: e.target.value })
                        }
                        className="mt-0.5 block h-7 w-10 rounded border border-line bg-surface"
                      />
                    </label>
                    <label className="text-[11px] text-muted">
                      {t("bgOpacity")} {Math.round((o.bgOpacity ?? 1) * 100)}%
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round((o.bgOpacity ?? 1) * 100)}
                        onChange={(e) =>
                          onUpdate(o.id, {
                            bgOpacity: Number(e.target.value) / 100,
                          })
                        }
                        className="mt-0.5 block w-24 accent-[var(--accent)]"
                      />
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {overlays.length > 0 ? (
        <button
          type="button"
          onClick={onApplyToAllClips}
          className="mt-3 inline-flex items-center gap-2 rounded-[var(--radius)] border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent-weak"
        >
          ⎘ {t("applyToAllClips")}
        </button>
      ) : null}
    </div>
  );
}

/** 클립 위에서 요소를 드래그해 자유 배치. */
function OverlayPositioner({
  clip,
  aspectRatio,
  overlays,
  onMove,
  hint,
}: {
  clip: Clip;
  aspectRatio: AspectRatio;
  overlays: Overlay[];
  onMove: (id: string, x: number, y: number) => void;
  hint: string;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    function move(e: PointerEvent) {
      const pad = padRef.current;
      if (!dragId.current || !pad) return;
      const r = pad.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
      const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
      onMove(dragId.current, x, y);
    }
    function up() {
      dragId.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onMove]);

  return (
    <div className="mt-3">
      <div
        ref={padRef}
        className="relative mx-auto max-w-[320px] touch-none select-none overflow-hidden rounded-lg border border-line bg-black"
        style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
      >
        {clip.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.downloadURL}
            alt=""
            className="h-full w-full object-cover opacity-90"
            draggable={false}
          />
        ) : (
          <video
            src={clip.downloadURL}
            className="h-full w-full object-cover opacity-90"
            muted
            preload="metadata"
          />
        )}
        {overlays.map((o) => (
          <button
            key={o.id}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              dragId.current = o.id;
            }}
            className="absolute cursor-grab rounded-md border border-white/70 bg-black/55 px-1.5 py-0.5 text-xs text-white shadow active:cursor-grabbing"
            style={{
              left: `${o.x}%`,
              top: `${o.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {o.type === "emoji" ? o.text || "😀" : o.type === "image" ? "🖼" : (o.text || o.type).slice(0, 8)}
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-muted">{hint}</p>
    </div>
  );
}
