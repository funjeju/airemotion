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
  onDelete,
  onEditVideo,
}: {
  clips: Clip[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onDelete?: (id: string) => void;
  onEditVideo?: (id: string) => void;
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
            {/* hover 액션: 영상 편집 / 삭제 */}
            <span className="absolute right-1 top-1 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
              {clip.type === "video" && onEditVideo ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditVideo(clip.id);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded bg-black/60 text-[11px] text-white hover:bg-accent"
                  title="영상 편집"
                >
                  ✂
                </span>
              ) : null}
              {onDelete ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(clip.id);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded bg-black/60 text-[11px] text-white hover:bg-render"
                  title="삭제"
                >
                  ✕
                </span>
              ) : null}
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
              {/* 자막 미리보기 — 들어간 자막을 클립 하단에 표시(클릭하면 인스펙터에서 수정) */}
              {clip.caption?.text ? (
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-center text-[10px] text-white">
                  {clip.caption.text}
                </span>
              ) : null}
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
