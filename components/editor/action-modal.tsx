"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type {
  Animation,
  CaptionOverrides,
  Clip,
  Overlay,
} from "@/lib/firebase/clips";
import { makeOverlay } from "@/lib/firebase/clips";
import type { Caption } from "@/lib/firebase/captions";
import { CaptionReview } from "./caption-review";
import {
  ANIMATION_PALETTE,
  OVERLAY_TYPES,
  type AspectRatio,
  type ROverlayType,
} from "@/remotion/types";
import type { TransitionSettings } from "@/lib/remotion/to-props";
import type { EditorAction } from "./action-toolbar";
import { TransitionControl } from "./transition-control";
import { OverlayEditor } from "./overlay-editor";
import { MusicTrack } from "./music-track";
import { UploadDropzone } from "./upload-dropzone";

const PER_CLIP: EditorAction[] = ["title", "caption", "animation", "asset"];
const EMOJIS = ["😀", "😍", "🔥", "⭐", "❤️", "🎉", "👍", "✅"];

export function ActionModal(props: {
  action: EditorAction;
  clips: Clip[];
  audioClips: Clip[];
  aspectRatio: AspectRatio;
  transition: TransitionSettings;
  selectedId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
  onTitle: (ids: string[], text: string) => void;
  onCaption: (ids: string[], text: string) => void;
  onCaptionStyle: (ids: string[], patch: CaptionOverrides) => void;
  onAnimation: (ids: string[], anim: Animation) => void;
  onDuration: (ids: string[], sec: number) => void;
  onScale: (ids: string[], scale: number) => void;
  onAddOverlay: (ids: string[], make: () => Overlay) => void;
  onTransitionChange: (patch: {
    transitionType?: TransitionSettings["type"];
    transitionDirection?: TransitionSettings["direction"];
    transitionSpeed?: TransitionSettings["speed"];
  }) => void;
  onGenerateCaptions: () => void;
  transcribing: boolean;
  hasAudioSource: boolean;
  captionError: string | null;
  captions: Caption[];
  onCaptionEdit: (
    id: string,
    patch: Partial<Pick<Caption, "start" | "end" | "text">>,
  ) => void;
  onCaptionDelete: (id: string) => void;
  onUploadFiles: (files: File[]) => void;
  uploadingPct: number | null;
  onToggleMute: (clip: Clip) => void;
  onDeleteMusic: (clip: Clip) => void;
  // 선택 클립 오버레이 편집(특정-단일)
  onOverlayAdd: (type: ROverlayType) => void;
  onOverlayAddEmoji: (emoji: string) => void;
  onOverlayUpload: (file: File) => void;
  overlayUploading: boolean;
  onOverlayUpdate: (id: string, patch: Partial<Overlay>) => void;
  onOverlayDelete: (id: string) => void;
  onOverlayApplyAll: () => void;
}) {
  const { action, clips } = props;
  const t = useTranslations("editor.actions");
  const perClip = PER_CLIP.includes(action);

  const [scope, setScope] = useState<"all" | "one">(
    props.selectedId ? "one" : "all",
  );
  const picked = clips.find((c) => c.id === props.selectedId) ?? null;
  const targetIds =
    scope === "all"
      ? clips.map((c) => c.id)
      : picked
        ? [picked.id]
        : [];

  const titleVal =
    scope === "one"
      ? (picked?.overlays?.find((o) => o.type === "title")?.text ?? "")
      : "";
  const captionVal = scope === "one" ? (picked?.caption.text ?? "") : "";
  const curAnim = scope === "one" ? (picked?.animation ?? null) : null;

  // 스코프 재설정 시 입력 초기값을 위해 key로 리마운트
  const inputKey = useMemo(
    () => `${scope}-${picked?.id ?? ""}`,
    [scope, picked?.id],
  );

  const needPick = perClip && scope === "one" && !picked;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={props.onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-ink">
            {t(action)}
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            className="text-muted transition hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* 스코프: 전체 / 특정 */}
        {perClip && (
          <div className="mt-4">
            <div className="inline-flex rounded-full border border-line p-0.5">
              {(["all", "one"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    scope === s ? "bg-accent text-white" : "text-muted"
                  }`}
                >
                  {s === "all" ? t("scopeAll") : t("scopeOne")}
                </button>
              ))}
            </div>

            {/* 특정: 클립 선택 */}
            {scope === "one" && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {clips.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => props.onPick(c.id)}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border ${
                      picked?.id === c.id
                        ? "border-accent ring-2 ring-accent"
                        : "border-line"
                    }`}
                  >
                    {c.type === "image" ? (
                      <Image
                        src={c.downloadURL}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <video
                        src={c.downloadURL}
                        className="h-full w-full object-cover"
                        muted
                      />
                    )}
                    <span className="absolute left-1 top-1 rounded bg-black/55 px-1 text-[10px] text-white">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {needPick && (
              <p className="mt-2 text-xs text-render">{t("pickClip")}</p>
            )}
          </div>
        )}

        {/* 액션별 컨트롤 */}
        <div className="mt-4">
          {action === "title" && !needPick && (
            <input
              key={inputKey}
              type="text"
              defaultValue={titleVal}
              onChange={(e) => props.onTitle(targetIds, e.target.value)}
              placeholder={t("titlePlaceholder")}
              className="w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          )}

          {action === "caption" && !needPick && (
            <div className="space-y-3">
              <input
                key={inputKey}
                type="text"
                defaultValue={captionVal}
                onChange={(e) => props.onCaption(targetIds, e.target.value)}
                placeholder={t("captionPlaceholder")}
                className="w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />

              {/* 자막 스타일: 위치·글자색·배경색·투명도 */}
              {(() => {
                const ov = scope === "one" ? (picked?.caption.overrides ?? {}) : {};
                return (
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <span className="block text-[11px] text-muted">
                        {t("capPosition")}
                      </span>
                      <div className="mt-1 flex gap-1">
                        {(["top", "center", "bottom"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              props.onCaptionStyle(targetIds, { position: p })
                            }
                            className={`rounded-md border px-2 py-0.5 text-xs transition ${
                              (ov.position ?? "bottom") === p
                                ? "border-accent bg-accent-weak text-accent"
                                : "border-line text-ink hover:border-accent"
                            }`}
                          >
                            {t(`capPos.${p}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="text-[11px] text-muted">
                      {t("textColor")}
                      <input
                        key={`tc-${inputKey}`}
                        type="color"
                        defaultValue={ov.color ?? "#ffffff"}
                        onChange={(e) =>
                          props.onCaptionStyle(targetIds, {
                            color: e.target.value,
                          })
                        }
                        className="mt-0.5 block h-7 w-10 rounded border border-line bg-surface"
                      />
                    </label>
                    <label className="text-[11px] text-muted">
                      {t("bgColor")}
                      <input
                        key={`bc-${inputKey}`}
                        type="color"
                        defaultValue={ov.bgColor ?? "#000000"}
                        onChange={(e) =>
                          props.onCaptionStyle(targetIds, {
                            bgColor: e.target.value,
                          })
                        }
                        className="mt-0.5 block h-7 w-10 rounded border border-line bg-surface"
                      />
                    </label>
                    <label className="text-[11px] text-muted">
                      {t("bgOpacity")}
                      <input
                        key={`bo-${inputKey}`}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        defaultValue={Math.round((ov.bgOpacity ?? 0.45) * 100)}
                        onChange={(e) =>
                          props.onCaptionStyle(targetIds, {
                            bgOpacity: Number(e.target.value) / 100,
                          })
                        }
                        className="mt-0.5 block w-24 accent-[var(--accent)]"
                      />
                    </label>
                  </div>
                );
              })()}

              <div className="border-t border-line pt-3">
                <CaptionReview
                  captions={props.captions}
                  hasAudioSource={props.hasAudioSource}
                  transcribing={props.transcribing}
                  error={props.captionError}
                  onTranscribe={props.onGenerateCaptions}
                  onEdit={props.onCaptionEdit}
                  onDelete={props.onCaptionDelete}
                />
              </div>
            </div>
          )}

          {action === "animation" && !needPick && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {ANIMATION_PALETTE.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => props.onAnimation(targetIds, a)}
                    className={`rounded-[var(--radius)] border px-3 py-1.5 text-sm transition ${
                      curAnim === a
                        ? "border-accent bg-accent-weak text-accent"
                        : "border-line text-ink hover:border-accent"
                    }`}
                  >
                    {t(`anim.${a}`)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3">
                <label className="text-xs text-muted">
                  {t("duration")}
                  <input
                    key={`d-${inputKey}`}
                    type="number"
                    min={0.5}
                    max={30}
                    step={0.5}
                    defaultValue={
                      scope === "one" ? (picked?.durationSec ?? 4) : 4
                    }
                    onChange={(e) =>
                      props.onDuration(targetIds, Number(e.target.value))
                    }
                    className="ml-2 w-20 rounded-md border border-line bg-bg px-2 py-1 text-sm text-ink"
                  />
                </label>
                <label className="text-xs text-muted">
                  {t("size")}
                  <input
                    key={`sc-${inputKey}`}
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    defaultValue={Math.round(
                      (scope === "one" ? (picked?.scale ?? 1) : 1) * 100,
                    )}
                    onChange={(e) =>
                      props.onScale(targetIds, Number(e.target.value) / 100)
                    }
                    className="ml-2 w-28 align-middle accent-[var(--accent)]"
                  />
                </label>
              </div>
            </div>
          )}

          {action === "asset" &&
            !needPick &&
            (scope === "one" && picked ? (
              <OverlayEditor
                clip={picked}
                aspectRatio={props.aspectRatio}
                overlays={picked.overlays ?? []}
                onAdd={props.onOverlayAdd}
                onAddEmoji={props.onOverlayAddEmoji}
                onUploadImage={props.onOverlayUpload}
                uploading={props.overlayUploading}
                onUpdate={props.onOverlayUpdate}
                onDelete={props.onOverlayDelete}
                onApplyToAllClips={props.onOverlayApplyAll}
              />
            ) : (
              <div>
                <p className="text-sm text-muted">{t("assetAllHint")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {OVERLAY_TYPES.map((ty) => (
                    <button
                      key={ty}
                      type="button"
                      onClick={() =>
                        props.onAddOverlay(targetIds, () => makeOverlay(ty, ""))
                      }
                      className="rounded-[var(--radius)] border border-line px-3 py-1.5 text-sm text-ink transition hover:border-accent"
                    >
                      {t(`overlayType.${ty}`)}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() =>
                        props.onAddOverlay(targetIds, () =>
                          makeOverlay("emoji", em),
                        )
                      }
                      className="rounded-md px-1.5 py-0.5 text-lg transition hover:bg-accent-weak"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ))}

          {action === "transition" && (
            <TransitionControl
              type={props.transition.type}
              direction={props.transition.direction}
              speed={props.transition.speed}
              onChange={props.onTransitionChange}
            />
          )}

          {action === "music" && (
            <div className="space-y-3">
              <UploadDropzone
                onFiles={props.onUploadFiles}
                uploadingPct={props.uploadingPct}
              />
              <MusicTrack
                audioClips={props.audioClips}
                onToggle={props.onToggleMute}
                onDelete={props.onDeleteMusic}
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("done")}
          </button>
        </div>
      </div>
    </div>
  );
}
