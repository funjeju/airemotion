"use client";

import { useTranslations } from "next-intl";
import type { Clip } from "@/lib/firebase/clips";

/** 플레이어 아래 오디오 타임라인 — 활성 배경음악 트랙을 막대로 표시. */
export function AudioTimeline({ audioClips }: { audioClips: Clip[] }) {
  const t = useTranslations("editor.music");
  const active = audioClips.filter((c) => !c.muted);
  if (active.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted">
        <span aria-hidden>🎵</span>
        {t("timeline")}
      </div>
      <div className="space-y-1.5">
        {active.map((clip) => (
          <div
            key={clip.id}
            className="relative flex h-7 items-center overflow-hidden rounded-md px-2 text-xs font-medium text-white"
            style={{
              background:
                "repeating-linear-gradient(90deg, var(--accent) 0 14px, color-mix(in srgb, var(--accent) 75%, black) 14px 28px)",
            }}
            title={clip.fileName}
          >
            <span className="truncate">{clip.fileName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
