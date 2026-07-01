"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Clip } from "@/lib/firebase/clips";

function fmt(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const ss = (s % 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${ss}`;
}

export function VideoTrimModal({
  clip,
  onClose,
  onApply,
  onSplit,
  onAutoCut,
  autoCutting,
}: {
  clip: Clip;
  onClose: () => void;
  onApply: (trimStart: number, trimEnd: number) => void;
  onSplit: (atSec: number) => void;
  onAutoCut?: () => void;
  autoCutting?: boolean;
}) {
  const t = useTranslations("editor.trim");
  const source = clip.durationSec;
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [start, setStart] = useState(clip.trimStart ?? 0);
  const [end, setEnd] = useState(clip.trimEnd ?? source);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(clip.trimStart ?? 0);
  const drag = useRef<"start" | "end" | null>(null);

  // 트림 구간 내에서만 재생(끝나면 시작으로 루프).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCur(v.currentTime);
      if (v.currentTime >= end) {
        v.currentTime = start;
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [start, end]);

  function seek(sec: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(source, Math.max(0, sec));
    setCur(v.currentTime);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
      v.play();
      setPlaying(true);
    }
  }

  function timeFromClientX(clientX: number): number {
    const track = trackRef.current;
    if (!track) return 0;
    const r = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return ratio * source;
  }

  // 핸들 드래그
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current) return;
      const time = timeFromClientX(e.clientX);
      if (drag.current === "start") {
        setStart(Math.min(time, end - 0.2));
      } else {
        setEnd(Math.max(time, start + 0.2));
      }
    }
    function onUp() {
      drag.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [start, end, source]);

  const pct = (sec: number) => `${(sec / source) * 100}%`;
  const canSplit = cur > start + 0.2 && cur < end - 0.2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-ink">
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition hover:text-ink"
            aria-label={t("cancel")}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={clip.downloadURL}
            className="aspect-video w-full bg-black"
            playsInline
            onClick={togglePlay}
          />
        </div>

        {/* 타임라인 트랙 */}
        <div
          ref={trackRef}
          className="relative mt-4 h-10 cursor-pointer rounded-lg bg-line"
          onPointerDown={(e) => {
            if (drag.current) return;
            seek(timeFromClientX(e.clientX));
          }}
        >
          {/* 선택 구간 */}
          <div
            className="absolute inset-y-0 rounded-lg bg-accent-weak"
            style={{ left: pct(start), width: pct(end - start) }}
          />
          {/* 재생헤드 */}
          <div
            className="absolute inset-y-0 w-0.5 bg-render"
            style={{ left: pct(cur) }}
          />
          {/* 시작 핸들 */}
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              drag.current = "start";
            }}
            className="absolute inset-y-0 -ml-1.5 w-3 cursor-ew-resize rounded bg-accent"
            style={{ left: pct(start) }}
            aria-label={t("start")}
          />
          {/* 끝 핸들 */}
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              drag.current = "end";
            }}
            className="absolute inset-y-0 -ml-1.5 w-3 cursor-ew-resize rounded bg-accent"
            style={{ left: pct(end) }}
            aria-label={t("end")}
          />
        </div>

        {/* 컨트롤 */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-[var(--radius)] border border-line px-3 py-1.5 text-sm text-ink transition hover:border-accent"
          >
            {playing ? t("pause") : t("play")}
          </button>
          <span className="font-mono text-xs text-muted">
            {fmt(cur)} / {fmt(source)}
          </span>
          <button
            type="button"
            onClick={() => onSplit(cur)}
            disabled={!canSplit}
            title={t("splitHint")}
            className="rounded-[var(--radius)] border border-line px-3 py-1.5 text-sm text-ink transition hover:border-accent disabled:opacity-40"
          >
            ✂ {t("split")}
          </button>
          {onAutoCut ? (
            <button
              type="button"
              onClick={onAutoCut}
              disabled={autoCutting}
              className="rounded-[var(--radius)] border border-accent px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent-weak disabled:opacity-50"
            >
              {autoCutting ? "분석 중…" : "✨ 자동 컷"}
            </button>
          ) : null}

          <div className="ml-auto flex items-center gap-2 font-mono text-xs text-muted">
            <label className="flex items-center gap-1">
              {t("start")}
              <input
                type="number"
                min={0}
                max={end - 0.2}
                step={0.1}
                value={Number(start.toFixed(1))}
                onChange={(e) =>
                  setStart(Math.min(Number(e.target.value), end - 0.2))
                }
                className="w-16 rounded border border-line bg-bg px-1 py-0.5 text-right text-ink"
              />
            </label>
            <label className="flex items-center gap-1">
              {t("end")}
              <input
                type="number"
                min={start + 0.2}
                max={source}
                step={0.1}
                value={Number(end.toFixed(1))}
                onChange={(e) =>
                  setEnd(Math.max(Number(e.target.value), start + 0.2))
                }
                className="w-16 rounded border border-line bg-bg px-1 py-0.5 text-right text-ink"
              />
            </label>
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius)] border border-line px-4 py-2 text-sm text-ink transition hover:border-accent"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => onApply(start, end)}
            className="rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
