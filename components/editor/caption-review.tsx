"use client";

import { useTranslations } from "next-intl";
import type { Caption } from "@/lib/firebase/captions";

export function CaptionReview({
  captions,
  hasAudioSource,
  transcribing,
  error,
  onTranscribe,
  onEdit,
  onDelete,
}: {
  captions: Caption[];
  hasAudioSource: boolean;
  transcribing: boolean;
  error: string | null;
  onTranscribe: () => void;
  onEdit: (id: string, patch: Partial<Pick<Caption, "start" | "end" | "text">>) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("editor.captions");

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-medium text-ink">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("note")}</p>
        </div>
        <button
          type="button"
          onClick={onTranscribe}
          disabled={transcribing || !hasAudioSource}
          title={hasAudioSource ? undefined : t("needAudio")}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent-weak disabled:opacity-50"
        >
          {transcribing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
              {t("transcribing")}
            </>
          ) : captions.length > 0 ? (
            t("regenerate")
          ) : (
            t("generate")
          )}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-render" role="alert">
          {error}
        </p>
      ) : null}

      {!hasAudioSource ? (
        <p className="mt-4 text-sm text-muted">{t("needAudio")}</p>
      ) : captions.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {captions.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-[var(--radius)] border border-line bg-bg p-2"
            >
              <div className="flex shrink-0 items-center gap-1 font-mono text-xs text-muted">
                <input
                  type="number"
                  step={0.1}
                  value={Number(c.start.toFixed(1))}
                  onChange={(e) =>
                    onEdit(c.id, { start: Number(e.target.value) })
                  }
                  className="w-16 rounded border border-line bg-surface px-1 py-0.5 text-right"
                  aria-label={t("start")}
                />
                <span>–</span>
                <input
                  type="number"
                  step={0.1}
                  value={Number(c.end.toFixed(1))}
                  onChange={(e) => onEdit(c.id, { end: Number(e.target.value) })}
                  className="w-16 rounded border border-line bg-surface px-1 py-0.5 text-right"
                  aria-label={t("end")}
                />
              </div>
              <input
                type="text"
                value={c.text}
                onChange={(e) => onEdit(c.id, { text: e.target.value })}
                className="flex-1 rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              {c.source === "edited" ? (
                <span className="shrink-0 text-[10px] text-accent">
                  {t("edited")}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="shrink-0 px-1 text-muted transition hover:text-render"
                aria-label={t("delete")}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
