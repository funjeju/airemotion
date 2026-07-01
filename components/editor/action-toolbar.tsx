"use client";

import { useTranslations } from "next-intl";

export type EditorAction =
  | "title"
  | "caption"
  | "animation"
  | "asset"
  | "transition"
  | "music";

const ITEMS: { action: EditorAction; icon: string }[] = [
  { action: "title", icon: "T" },
  { action: "caption", icon: "💬" },
  { action: "animation", icon: "🎞" },
  { action: "asset", icon: "✨" },
  { action: "transition", icon: "🔀" },
  { action: "music", icon: "🎵" },
];

/** 복잡 모드 상단 액션 메뉴 — 클릭하면 해당 편집 창이 열림. */
export function ActionToolbar({
  onOpen,
}: {
  onOpen: (action: EditorAction) => void;
}) {
  const t = useTranslations("editor.actions");
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-2">
      {ITEMS.map(({ action, icon }) => (
        <button
          key={action}
          type="button"
          onClick={() => onOpen(action)}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line px-3 py-2 text-sm font-medium text-ink transition hover:border-accent hover:bg-accent-weak"
        >
          <span aria-hidden>{icon}</span>
          {t(action)}
        </button>
      ))}
    </div>
  );
}
