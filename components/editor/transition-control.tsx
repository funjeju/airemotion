"use client";

import { useTranslations } from "next-intl";
import {
  DIRECTIONAL_TRANSITIONS,
  TRANSITION_PALETTE,
  type RTransitionDirection,
  type RTransitionType,
  type TransitionSpeed,
} from "@/remotion/types";

const SPEEDS: TransitionSpeed[] = ["slow", "normal", "fast"];
const DIRECTIONS: RTransitionDirection[] = [
  "from-left",
  "from-right",
  "from-top",
  "from-bottom",
];

type Patch = {
  transitionType?: RTransitionType;
  transitionDirection?: RTransitionDirection;
  transitionSpeed?: TransitionSpeed;
};

/** 화면 전환 — 전체 영상에 일관 적용(타입 + 방향 + 속도). */
export function TransitionControl({
  type,
  direction,
  speed,
  onChange,
}: {
  type: RTransitionType;
  direction: RTransitionDirection;
  speed: TransitionSpeed;
  onChange: (patch: Patch) => void;
}) {
  const t = useTranslations("editor.transition");
  const showDirection = DIRECTIONAL_TRANSITIONS.includes(type);
  const showSpeed = type !== "none";

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-base font-medium text-ink">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("note")}</p>

      <div className="mt-4 space-y-4">
        <div>
          <span className="block text-xs text-muted">{t("type")}</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TRANSITION_PALETTE.map((ty) => (
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

        {showDirection ? (
          <div>
            <span className="block text-xs text-muted">{t("direction")}</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DIRECTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ transitionDirection: d })}
                  className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm transition ${
                    direction === d
                      ? "border-accent bg-accent-weak text-accent"
                      : "border-line text-ink hover:border-accent"
                  }`}
                >
                  {t(`directions.${d}`)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showSpeed ? (
          <div>
            <span className="block text-xs text-muted">{t("speed")}</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => onChange({ transitionSpeed: sp })}
                  className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm transition ${
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
        ) : null}
      </div>
    </section>
  );
}
