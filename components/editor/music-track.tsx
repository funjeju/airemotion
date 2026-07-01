"use client";

import { useTranslations } from "next-intl";
import type { Clip } from "@/lib/firebase/clips";

function fmt(sec: number) {
  const s = Math.round(sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** 배경음악 목록 — 업로드된 오디오를 필름스트립과 분리해 명확히 표시. */
export function MusicTrack({
  audioClips,
  onToggle,
  onDelete,
}: {
  audioClips: Clip[];
  onToggle: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
}) {
  const t = useTranslations("editor.music");
  if (audioClips.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-sm font-medium text-ink">{t("title")}</h3>
      <ul className="mt-2 space-y-2">
        {audioClips.map((clip, i) => {
          const on = !clip.muted;
          return (
            <li
              key={clip.id}
              className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-bg px-3 py-2"
            >
              {/* on/off 토글 */}
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onToggle(clip)}
                title={on ? t("on") : t("off")}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  on ? "bg-accent" : "bg-line"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    on ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-lg" aria-hidden>
                🎵
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-sm ${on ? "text-ink" : "text-muted line-through"}`}
              >
                {clip.fileName || `${t("track")} ${i + 1}`}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {fmt(clip.durationSec)}
              </span>
              <button
                type="button"
                onClick={() => onDelete(clip)}
                className="shrink-0 px-1 text-muted transition hover:text-render"
                aria-label={t("remove")}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {audioClips.length > 1 ? (
        <p className="mt-2 text-xs text-muted">{t("multiNote")}</p>
      ) : null}
    </section>
  );
}
