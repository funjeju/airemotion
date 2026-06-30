"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Clip } from "@/lib/firebase/clips";

const CROSSFADE = 0.5; // 초

type Segment = { clip: Clip; start: number; end: number; cf: number };

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function transformFor(clip: Clip, p: number, reduced: boolean): string {
  if (reduced || clip.type !== "image" || !clip.animation) return "scale(1.02)";
  switch (clip.animation) {
    case "zoomIn":
      return `scale(${(1.04 + 0.12 * p).toFixed(4)})`;
    case "zoomOut":
      return `scale(${(1.16 - 0.12 * p).toFixed(4)})`;
    case "pan":
      return `scale(1.1) translateX(${(-3 + 6 * p).toFixed(2)}%)`;
  }
}

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PreviewCanvas({ clips }: { clips: Clip[] }) {
  const t = useTranslations("editor.preview");
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const lastRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const visuals = useMemo(
    () => clips.filter((c) => c.type === "image" || c.type === "video"),
    [clips],
  );
  const audioClip = useMemo(
    () => clips.find((c) => c.type === "audio") ?? null,
    [clips],
  );

  const { segments, total } = useMemo(() => {
    let acc = 0;
    const segs: Segment[] = visuals.map((clip) => {
      const start = acc;
      const dur = Math.max(0.5, clip.durationSec);
      acc += dur;
      return { clip, start, end: acc, cf: Math.min(CROSSFADE, dur / 2) };
    });
    return { segments: segs, total: acc };
  }, [visuals]);

  // 재생 루프
  useEffect(() => {
    if (!playing || total === 0) return;
    lastRef.current = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setTime((prev) => {
        const n = prev + dt;
        return n >= total ? 0 : n;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, total]);

  // 배경음악 동기화
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.play().catch(() => {});
    else a.pause();
  }, [playing, audioClip]);

  useEffect(() => {
    const a = audioRef.current;
    if (a && Math.abs(a.currentTime - time) > 0.3) a.currentTime = time;
  }, [time]);

  // 활성 영상 재생/일시정지 + 시간 동기화
  const primaryIndex = segments.findIndex(
    (s) => time >= s.start && time < s.end,
  );
  useEffect(() => {
    segments.forEach((seg, i) => {
      if (seg.clip.type !== "video") return;
      const v = videoRefs.current.get(seg.clip.id);
      if (!v) return;
      const local = time - seg.start;
      if (i === primaryIndex && playing) {
        if (Math.abs(v.currentTime - local) > 0.3) v.currentTime = local;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [time, primaryIndex, playing, segments]);

  if (visuals.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-line bg-surface text-sm text-muted">
        {t("empty")}
      </div>
    );
  }

  function opacityOf(seg: Segment): number {
    // 자기 구간이면 1, 시작 직전 CF 동안 위에서 페이드인(이전 클립 위로 겹침)
    if (time >= seg.start && time < seg.end) return 1;
    if (time >= seg.start - seg.cf && time < seg.start)
      return (time - (seg.start - seg.cf)) / seg.cf;
    return 0;
  }

  const captionSeg = segments[primaryIndex] ?? null;

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-black">
        {segments.map((seg) => {
          const op = opacityOf(seg);
          const p = Math.min(1, Math.max(0, (time - seg.start) / (seg.end - seg.start)));
          return (
            <div
              key={seg.clip.id}
              className="absolute inset-0"
              style={{ opacity: op, transition: "opacity 80ms linear" }}
            >
              {seg.clip.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seg.clip.downloadURL}
                  alt=""
                  className="h-full w-full object-cover will-change-transform"
                  style={{ transform: transformFor(seg.clip, p, reduced) }}
                />
              ) : (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(seg.clip.id, el);
                    else videoRefs.current.delete(seg.clip.id);
                  }}
                  src={seg.clip.downloadURL}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="auto"
                />
              )}
            </div>
          );
        })}

        {/* 자막 오버레이 */}
        {captionSeg?.clip.caption.text ? (
          <Caption clip={captionSeg.clip} />
        ) : null}

        {audioClip ? (
          <audio ref={audioRef} src={audioClip.downloadURL} loop preload="auto" />
        ) : null}
      </div>

      {/* 컨트롤 */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {playing ? t("pause") : t("play")}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setTime(0);
          }}
          className="text-sm text-muted transition hover:text-accent"
        >
          {t("restart")}
        </button>
        <div
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-line"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTime(((e.clientX - r.left) / r.width) * total);
          }}
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${total ? (time / total) * 100 : 0}%` }}
          />
        </div>
        <span className="font-mono text-xs text-muted">
          {fmt(time)} / {fmt(total)}
        </span>
      </div>
      {reduced ? (
        <p className="mt-2 text-xs text-muted">{t("reducedMotion")}</p>
      ) : null}
    </div>
  );
}

function Caption({ clip }: { clip: Clip }) {
  const ov = clip.caption.overrides ?? {};
  const pos = ov.position ?? "bottom";
  const align =
    pos === "top"
      ? "items-start pt-6"
      : pos === "center"
        ? "items-center"
        : "items-end pb-6";
  return (
    <div className={`pointer-events-none absolute inset-0 flex justify-center ${align}`}>
      <span
        className="max-w-[85%] rounded-md px-3 py-1 text-center font-medium"
        style={{
          color: ov.color ?? "#ffffff",
          backgroundColor: ov.bgColor ?? "rgba(0,0,0,0.45)",
          fontSize: `${ov.fontSize ?? 28}px`,
          lineHeight: 1.3,
        }}
      >
        {clip.caption.text}
      </span>
    </div>
  );
}
