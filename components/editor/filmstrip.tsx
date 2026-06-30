"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Clip } from "@/lib/firebase/clips";

function fmt(sec: number) {
  const s = Math.round(sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** 시그니처 가로 필름스트립 타임라인. 드래그로 순서 변경. */
export function Filmstrip({
  clips,
  selectedId,
  onSelect,
  onReorder,
}: {
  clips: Clip[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const t = useTranslations("editor");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = clips.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
    setDragId(null);
    setOverId(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {clips.map((clip, i) => {
        const active = clip.id === selectedId;
        const isOver = clip.id === overId && dragId !== clip.id;
        return (
          <button
            key={clip.id}
            type="button"
            draggable
            onDragStart={() => setDragId(clip.id)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(clip.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDrop={() => handleDrop(clip.id)}
            onClick={() => onSelect(clip.id)}
            className={`group relative w-32 shrink-0 cursor-grab overflow-hidden rounded-xl border bg-surface text-left transition active:cursor-grabbing ${
              active ? "border-accent ring-2 ring-accent" : "border-line"
            } ${isOver ? "translate-y-[-2px]" : ""}`}
          >
            <span className="absolute left-1.5 top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/55 px-1 font-mono text-[11px] text-white">
              {i + 1}
            </span>
            <div className="relative aspect-video w-full bg-bg">
              {clip.type === "image" ? (
                <Image
                  src={clip.downloadURL}
                  alt={clip.fileName}
                  fill
                  sizes="128px"
                  className="object-cover"
                  unoptimized
                />
              ) : clip.type === "video" ? (
                <video
                  src={clip.downloadURL}
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl">
                  🎵
                </span>
              )}
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] text-muted">
                {t(`type.${clip.type}`)}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {fmt(clip.durationSec)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
