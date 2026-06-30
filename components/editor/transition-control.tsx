"use client";

import { useTranslations } from "next-intl";
import type { RTransitionType, TransitionSpeed } from "@/remotion/types";

const TYPES: RTransitionType[] = ["fade", "slide", "none"];
const SPEEDS: TransitionSpeed[] = ["slow", "normal", "fast"];

/** 화면 전환 — 전체 영상에 일관 적용(타입 + 속도). */
export function TransitionControl({
  type,
  speed,
  onChange,
}: {
  type: RTransitionType;
  speed: TransitionSpeed;
  onChange: (patch: {
    transitionType?: RTransitionType;
    transitionSpeed?: TransitionSpeed;
  }) => void;
}) {
  const t = useTranslations("editor.transition");

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-base font-medium text-ink">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("note")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div>
          <span className="block text-xs text-muted">{t("type")}</span>
          <div className="mt-1.5 flex gap-2">
            {TYPES.map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => onChange({ transitionType: ty })}
                className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm transition ${
                  type === ty
                    ? "border-accent bg-accent-weak text-accent"
                    : "border-line text-ink hover:border-accent"
                }`}
              >
                {t(`types.${ty}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs text-muted">{t("speed")}</span>
          <div className="mt-1.5 flex gap-2">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                type="button"
                disabled={type === "none"}
                onClick={() => onChange({ transitionSpeed: sp })}
                className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm transition disabled:opacity-40 ${
                  speed === sp
                    ? "border-accent bg-accent-weak text-accent"
                    : "border-line text-ink hover:border-accent"
                }`}
              >
                {t(`speeds.${sp}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
