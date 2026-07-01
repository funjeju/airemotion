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
  onDelete,
}: {
  audioClips: Clip[];
  onDelete: (clip: Clip) => void;
}) {
  const t = useTranslations("editor.music");
  if (audioClips.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-sm font-medium text-ink">{t("title")}</h3>
      <ul className="mt-2 space-y-2">
        {audioClips.map((clip, i) => (
          <li
            key={clip.id}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-bg px-3 py-2"
          >
            <span className="text-lg" aria-hidden>
              🎵
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {clip.fileName || `${t("track")} ${i + 1}`}
            </span>
            {i === 0 ? (
              <span className="shrink-0 rounded-md bg-accent-weak px-1.5 py-0.5 text-[10px] font-medium text-accent">
                {t("inUse")}
              </span>
            ) : null}
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
        ))}
      </ul>
      {audioClips.length > 1 ? (
        <p className="mt-2 text-xs text-muted">{t("firstOnly")}</p>
      ) : null}
    </section>
  );
}
