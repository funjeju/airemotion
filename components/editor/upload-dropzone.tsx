"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function UploadDropzone({
  onFiles,
  uploadingPct,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  uploadingPct: number | null;
  compact?: boolean;
}) {
  const t = useTranslations("editor.upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const busy = uploadingPct !== null;

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pick(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition ${
        dragOver ? "border-accent bg-accent-weak" : "border-line bg-surface"
      } ${compact ? "p-4" : "p-10"}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {busy ? t("uploading", { pct: Math.round(uploadingPct) }) : t("cta")}
      </button>
      {!compact && <p className="mt-3 text-sm text-muted">{t("hint")}</p>}
      {busy && (
        <div className="mt-3 h-1 w-40 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-render transition-[width]"
            style={{ width: `${uploadingPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
