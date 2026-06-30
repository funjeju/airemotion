"use client";

import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getClientAuth } from "@/lib/firebase/client";
import {
  batchUpdateClips,
  deleteClip,
  listClips,
  reorderClips,
  updateClip,
  uploadClip,
  type Animation,
  type CaptionOverrides,
  type Clip,
} from "@/lib/firebase/clips";
import {
  deleteCaption,
  listCaptions,
  updateCaption,
  type Caption,
} from "@/lib/firebase/captions";
import {
  getProject,
  updateProjectSettings,
} from "@/lib/firebase/projects";
import {
  DEFAULT_TRANSITION,
  type TransitionSettings,
} from "@/lib/remotion/to-props";
import {
  detectTone,
  pickFromPool,
  TONE_PRESET,
  type Tone,
} from "@/lib/remotion/tone";
import type {
  AspectRatio,
  RTransitionDirection,
  RTransitionType,
  TransitionSpeed,
} from "@/remotion/types";
import { UploadDropzone } from "@/components/editor/upload-dropzone";
import { Filmstrip } from "@/components/editor/filmstrip";
import { Inspector } from "@/components/editor/inspector";
import { ProjectTone } from "@/components/editor/project-tone";
import { AspectControl } from "@/components/editor/aspect-control";
import { TransitionControl } from "@/components/editor/transition-control";
import { CaptionReview } from "@/components/editor/caption-review";
import { RemotionPreview } from "@/components/editor/remotion-preview";

export default function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const t = useTranslations("editor");
  const { user } = useAuth();

  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadingPct, setUploadingPct] = useState<number | null>(null);
  const [rendering, setRendering] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [transition, setTransition] =
    useState<TransitionSettings>(DEFAULT_TRANSITION);
  const [intentPrompt, setIntentPrompt] = useState("");
  const [tone, setTone] = useState<Tone>("calm");
  const [applyingTone, setApplyingTone] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const captionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [items, caps, project] = await Promise.all([
        listClips(projectId),
        listCaptions(projectId),
        getProject(projectId),
      ]);
      if (!alive) return;
      setClips(items);
      setCaptions(caps);
      if (project) {
        setTransition({
          type: project.transitionType ?? DEFAULT_TRANSITION.type,
          direction:
            project.transitionDirection ?? DEFAULT_TRANSITION.direction,
          speed: project.transitionSpeed ?? DEFAULT_TRANSITION.speed,
        });
        setIntentPrompt(project.intentPrompt ?? "");
        setTone(project.effectTheme ?? "calm");
        setAspectRatio(project.aspectRatio ?? "16:9");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const selectedClip = clips.find((c) => c.id === selectedId) ?? null;

  function lastImageAnimation(list: Clip[]): Animation | null {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].type === "image" && list[i].animation) return list[i].animation;
    }
    return null;
  }

  async function handleFiles(files: File[]) {
    if (!user) return;
    let order = clips.length;
    let prev = lastImageAnimation(clips);
    for (const file of files) {
      setUploadingPct(0);
      const clip = await uploadClip(
        user.uid,
        projectId,
        file,
        order,
        prev,
        setUploadingPct,
      );
      setClips((cur) => [...cur, clip]);
      setSelectedId(clip.id);
      order += 1;
      if (clip.animation) prev = clip.animation;
    }
    setUploadingPct(null);
  }

  function handleReorder(ids: string[]) {
    const map = new Map(clips.map((c) => [c.id, c]));
    setClips(ids.map((id, i) => ({ ...map.get(id)!, order: i })));
    reorderClips(projectId, ids);
  }

  function saveCaption(
    id: string,
    caption: { text: string; overrides: CaptionOverrides | null },
  ) {
    const timers = saveTimers.current;
    if (timers.has(id)) clearTimeout(timers.get(id));
    timers.set(
      id,
      setTimeout(() => {
        updateClip(projectId, id, { caption });
        timers.delete(id);
      }, 400),
    );
  }

  function handleCaptionText(text: string) {
    if (!selectedClip) return;
    const caption = { ...selectedClip.caption, text };
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, caption } : c)),
    );
    saveCaption(selectedClip.id, caption);
  }

  function handleOverrides(patch: CaptionOverrides | null) {
    if (!selectedClip) return;
    const caption = { ...selectedClip.caption, overrides: patch };
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, caption } : c)),
    );
    saveCaption(selectedClip.id, caption);
  }

  function handleAnimation(a: Animation) {
    if (!selectedClip) return;
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, animation: a } : c)),
    );
    updateClip(projectId, selectedClip.id, { animation: a });
  }

  async function handleDelete() {
    if (!selectedClip) return;
    const target = selectedClip;
    setClips((cur) => cur.filter((c) => c.id !== target.id));
    setSelectedId(null);
    await deleteClip(projectId, target);
  }

  const hasVisual = clips.some((c) => c.type !== "audio");

  async function handleRender() {
    const current = getClientAuth().currentUser;
    if (!current) return;
    setRendering(true);
    setRenderError(null);
    setOutputUrl(null);
    try {
      const token = await current.getIdToken();
      const res = await fetch(`/api/render/${projectId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("render failed");
      const data = (await res.json()) as { url: string };
      setOutputUrl(data.url);
    } catch {
      setRenderError(t("render.error"));
    } finally {
      setRendering(false);
    }
  }

  const hasAudioSource = clips.some(
    (c) => c.type === "audio" || c.type === "video",
  );

  async function handleTranscribe() {
    const current = getClientAuth().currentUser;
    if (!current) return;
    setTranscribing(true);
    setCaptionError(null);
    try {
      const token = await current.getIdToken();
      const res = await fetch(`/api/transcribe/${projectId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("transcribe failed");
      const data = (await res.json()) as { captions: Caption[] };
      setCaptions(
        [...data.captions].sort((a, b) => a.start - b.start),
      );
    } catch {
      setCaptionError(t("captions.error"));
    } finally {
      setTranscribing(false);
    }
  }

  function handleCaptionEdit(
    id: string,
    patch: Partial<Pick<Caption, "start" | "end" | "text">>,
  ) {
    setCaptions((cur) =>
      cur.map((c) => (c.id === id ? { ...c, ...patch, source: "edited" } : c)),
    );
    const timers = captionTimers.current;
    if (timers.has(id)) clearTimeout(timers.get(id));
    timers.set(
      id,
      setTimeout(() => {
        updateCaption(projectId, id, patch);
        timers.delete(id);
      }, 400),
    );
  }

  function handleCaptionDelete(id: string) {
    setCaptions((cur) => cur.filter((c) => c.id !== id));
    deleteCaption(projectId, id);
  }

  function handleTransitionChange(patch: {
    transitionType?: RTransitionType;
    transitionDirection?: RTransitionDirection;
    transitionSpeed?: TransitionSpeed;
  }) {
    setTransition((cur) => ({
      type: patch.transitionType ?? cur.type,
      direction: patch.transitionDirection ?? cur.direction,
      speed: patch.transitionSpeed ?? cur.speed,
    }));
    updateProjectSettings(projectId, patch);
  }

  function handleAspectChange(next: AspectRatio) {
    setAspectRatio(next);
    updateProjectSettings(projectId, { aspectRatio: next });
  }

  function handleDuration(sec: number) {
    if (!selectedClip) return;
    const durationSec = Math.min(30, Math.max(0.5, sec || 0.5));
    setClips((cur) =>
      cur.map((c) =>
        c.id === selectedClip.id ? { ...c, durationSec } : c,
      ),
    );
    const id = selectedClip.id;
    const timers = saveTimers.current;
    if (timers.has(`dur-${id}`)) clearTimeout(timers.get(`dur-${id}`));
    timers.set(
      `dur-${id}`,
      setTimeout(() => {
        updateClip(projectId, id, { durationSec });
        timers.delete(`dur-${id}`);
      }, 400),
    );
  }

  function handlePromptChange(text: string) {
    setIntentPrompt(text);
    setTone(detectTone(text));
    if (promptTimer.current) clearTimeout(promptTimer.current);
    promptTimer.current = setTimeout(() => {
      updateProjectSettings(projectId, { intentPrompt: text });
    }, 400);
  }

  function handleToneChange(next: Tone) {
    setTone(next);
    updateProjectSettings(projectId, { effectTheme: next });
  }

  async function handleApplyTone() {
    const preset = TONE_PRESET[tone];
    setApplyingTone(true);

    // 전환을 톤 프리셋으로
    setTransition(preset.transition);

    // 사진 클립에 톤 길이 + 애니메이션(풀 순환) 재배정
    let prev: Animation | null = null;
    const updates: { id: string; durationSec: number; animation: Animation }[] =
      [];
    const nextClips = clips.map((c) => {
      if (c.type !== "image") return c;
      const animation = pickFromPool(preset.animPool, prev);
      prev = animation;
      updates.push({ id: c.id, durationSec: preset.photoSec, animation });
      return { ...c, durationSec: preset.photoSec, animation };
    });
    setClips(nextClips);

    try {
      await Promise.all([
        updateProjectSettings(projectId, {
          transitionType: preset.transition.type,
          transitionDirection: preset.transition.direction,
          transitionSpeed: preset.transition.speed,
          effectTheme: tone,
          intentPrompt,
        }),
        updates.length > 0
          ? batchUpdateClips(projectId, updates)
          : Promise.resolve(),
      ]);
    } finally {
      setApplyingTone(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted transition hover:text-accent"
      >
        ← {t("backToDashboard")}
      </Link>

      {loading ? (
        <p className="mt-10 text-sm text-muted">{t("loading")}</p>
      ) : clips.length === 0 ? (
        <div className="mt-8">
          <UploadDropzone onFiles={handleFiles} uploadingPct={uploadingPct} />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <RemotionPreview
            clips={clips}
            captions={captions}
            transition={transition}
            aspectRatio={aspectRatio}
            seekClipId={selectedId}
          />

          {/* 영상 분위기(의도 프롬프트) → 톤 자동 적용 */}
          <ProjectTone
            prompt={intentPrompt}
            tone={tone}
            applying={applyingTone}
            onPromptChange={handlePromptChange}
            onToneChange={handleToneChange}
            onApply={handleApplyTone}
          />

          <section className="space-y-3">
            <Filmstrip
              clips={clips}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={handleReorder}
            />
            <UploadDropzone
              onFiles={handleFiles}
              uploadingPct={uploadingPct}
              compact
            />
          </section>

          <Inspector
            clip={selectedClip}
            onCaptionText={handleCaptionText}
            onOverrides={handleOverrides}
            onAnimation={handleAnimation}
            onDuration={handleDuration}
            onDelete={handleDelete}
          />

          {/* 화면비율 */}
          <AspectControl value={aspectRatio} onChange={handleAspectChange} />

          {/* 화면 전환 (전체 일관 적용) */}
          <TransitionControl
            type={transition.type}
            direction={transition.direction}
            speed={transition.speed}
            onChange={handleTransitionChange}
          />

          {/* 자동 자막 (Whisper) + 검수 */}
          <CaptionReview
            captions={captions}
            hasAudioSource={hasAudioSource}
            transcribing={transcribing}
            error={captionError}
            onTranscribe={handleTranscribe}
            onEdit={handleCaptionEdit}
            onDelete={handleCaptionDelete}
          />

          {/* 영상 만들기 (실제 MP4 렌더) */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">{t("render.note")}</p>
              <div className="flex items-center gap-3">
                {outputUrl ? (
                  <a
                    href={outputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-[var(--radius)] border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent-weak"
                  >
                    ↓ {t("render.download")}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={handleRender}
                  disabled={rendering || !hasVisual}
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {rendering ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                      {t("render.rendering")}
                    </>
                  ) : outputUrl ? (
                    t("render.again")
                  ) : (
                    t("render.make")
                  )}
                </button>
              </div>
            </div>
            {rendering ? (
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-render" />
              </div>
            ) : null}
            {renderError ? (
              <p className="mt-3 text-sm text-render" role="alert">
                {renderError}
              </p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
