"use client";

import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getClientAuth } from "@/lib/firebase/client";
import {
  applyAutoCut,
  batchUpdateClips,
  deleteClip,
  listClips,
  makeOverlay,
  reorderClips,
  splitVideoClip,
  updateClip,
  uploadClip,
  uploadOverlayImage,
  type Animation,
  type CaptionOverrides,
  type Clip,
  type Overlay,
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
import {
  OVERLAY_HAS_TEXT,
  type AspectRatio,
  type ROverlayType,
  type RTransitionDirection,
  type RTransitionType,
  type TransitionSpeed,
} from "@/remotion/types";
import { UploadDropzone } from "@/components/editor/upload-dropzone";
import { Filmstrip } from "@/components/editor/filmstrip";
import { Inspector } from "@/components/editor/inspector";
import { ProjectTone } from "@/components/editor/project-tone";
import { SimpleClipPanel } from "@/components/editor/simple-clip-panel";
import { AspectControl } from "@/components/editor/aspect-control";
import { TransitionControl } from "@/components/editor/transition-control";
import { CaptionReview } from "@/components/editor/caption-review";
import { MusicTrack } from "@/components/editor/music-track";
import { AudioTimeline } from "@/components/editor/audio-timeline";
import { VideoTrimModal } from "@/components/editor/video-trim-modal";
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
  const [title, setTitle] = useState("");
  const [intentPrompt, setIntentPrompt] = useState("");
  const [tone, setTone] = useState<Tone>("calm");
  const [applyingTone, setApplyingTone] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [endFadeOut, setEndFadeOut] = useState(true);
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [trimClipId, setTrimClipId] = useState<string | null>(null);
  const [autoCutting, setAutoCutting] = useState(false);
  const [autoCutError, setAutoCutError] = useState<string | null>(null);
  const [overlayUploading, setOverlayUploading] = useState(false);
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
        setTitle(project.title ?? "");
        setIntentPrompt(project.intentPrompt ?? "");
        setTone(project.effectTheme ?? "calm");
        setAspectRatio(project.aspectRatio ?? "16:9");
        setEndFadeOut(project.endFadeOut ?? true);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  // 에디터 모드(단순/복잡) — 사용자 환경 설정으로 localStorage에 저장.
  useEffect(() => {
    const saved = localStorage.getItem("glide:editorMode");
    if (saved === "advanced" || saved === "simple") setMode(saved);
  }, []);
  function changeMode(next: "simple" | "advanced") {
    setMode(next);
    localStorage.setItem("glide:editorMode", next);
  }

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
    const reordered = ids.map((id, i) => ({ ...map.get(id)!, order: i }));
    // 오디오는 필름스트립에 없으니 상태에서 보존.
    const audios = clips.filter((c) => c.type === "audio");
    setClips([...reordered, ...audios]);
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

  function handleScale(scale: number) {
    if (!selectedClip) return;
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, scale } : c)),
    );
    const id = selectedClip.id;
    const timers = saveTimers.current;
    if (timers.has(`scale-${id}`)) clearTimeout(timers.get(`scale-${id}`));
    timers.set(
      `scale-${id}`,
      setTimeout(() => {
        updateClip(projectId, id, { scale });
        timers.delete(`scale-${id}`);
      }, 300),
    );
  }

  // ── 오버레이(요소) ──
  function saveOverlays(clipId: string, overlays: Overlay[]) {
    const timers = saveTimers.current;
    if (timers.has(`ov-${clipId}`)) clearTimeout(timers.get(`ov-${clipId}`));
    timers.set(
      `ov-${clipId}`,
      setTimeout(() => {
        updateClip(projectId, clipId, { overlays });
        timers.delete(`ov-${clipId}`);
      }, 400),
    );
  }

  function handleAddOverlay(type: ROverlayType) {
    if (!selectedClip) return;
    const text = OVERLAY_HAS_TEXT[type] ? t(`overlay.defaults.${type}`) : "";
    const overlay = makeOverlay(type, text);
    const overlays = [...(selectedClip.overlays ?? []), overlay];
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, overlays } : c)),
    );
    updateClip(projectId, selectedClip.id, { overlays });
  }

  function handleUpdateOverlay(id: string, patch: Partial<Overlay>) {
    if (!selectedClip) return;
    const overlays = (selectedClip.overlays ?? []).map((o) =>
      o.id === id ? { ...o, ...patch } : o,
    );
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, overlays } : c)),
    );
    saveOverlays(selectedClip.id, overlays);
  }

  function handleDeleteOverlay(id: string) {
    if (!selectedClip) return;
    const overlays = (selectedClip.overlays ?? []).filter((o) => o.id !== id);
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, overlays } : c)),
    );
    updateClip(projectId, selectedClip.id, { overlays });
  }

  function addOverlayToSelected(overlay: ReturnType<typeof makeOverlay>) {
    if (!selectedClip) return;
    const overlays = [...(selectedClip.overlays ?? []), overlay];
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, overlays } : c)),
    );
    updateClip(projectId, selectedClip.id, { overlays });
  }

  function handleAddEmoji(emoji: string) {
    addOverlayToSelected(makeOverlay("emoji", emoji));
  }

  // 단순 모드 타이틀 — 선택 클립의 title 오버레이 하나를 만들거나 수정.
  const selectedTitle =
    selectedClip?.overlays?.find((o) => o.type === "title")?.text ?? "";

  function handleSetTitle(text: string) {
    if (!selectedClip) return;
    const overlays = selectedClip.overlays ?? [];
    const existing = overlays.find((o) => o.type === "title");
    const next = existing
      ? overlays.map((o) => (o.id === existing.id ? { ...o, text } : o))
      : [...overlays, makeOverlay("title", text)];
    setClips((cur) =>
      cur.map((c) => (c.id === selectedClip.id ? { ...c, overlays: next } : c)),
    );
    saveOverlays(selectedClip.id, next);
  }

  async function handleUploadOverlayImage(file: File) {
    const user = getClientAuth().currentUser;
    if (!user || !selectedClip) return;
    setOverlayUploading(true);
    try {
      const src = await uploadOverlayImage(user.uid, projectId, file);
      addOverlayToSelected(makeOverlay("image", "", src));
    } finally {
      setOverlayUploading(false);
    }
  }

  /** 선택 클립의 요소(오버레이)를 모든 시각 클립에 복사(새 id 부여). */
  function handleApplyOverlaysToAll() {
    if (!selectedClip) return;
    const source = selectedClip.overlays ?? [];
    const clone = () =>
      source.map((o) => ({
        ...o,
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }));
    const targets = clips.filter((c) => c.type !== "audio");
    setClips((cur) =>
      cur.map((c) =>
        c.type !== "audio" && c.id !== selectedClip.id
          ? { ...c, overlays: clone() }
          : c,
      ),
    );
    const updates = targets
      .filter((c) => c.id !== selectedClip.id)
      .map((c) => ({ id: c.id, overlays: clone() }));
    if (updates.length > 0) batchUpdateClips(projectId, updates);
  }

  /** 선택 사진의 효과·길이·크기를 모든 사진 클립에 일괄 적용. */
  function handleApplyToAll() {
    if (!selectedClip || selectedClip.type !== "image") return;
    const { animation, durationSec, scale } = selectedClip;
    setClips((cur) =>
      cur.map((c) =>
        c.type === "image" ? { ...c, animation, durationSec, scale } : c,
      ),
    );
    const updates = clips
      .filter((c) => c.type === "image")
      .map((c) => ({
        id: c.id,
        animation,
        durationSec,
        scale: scale ?? 1,
      }));
    if (updates.length > 0) batchUpdateClips(projectId, updates);
  }

  async function handleDeleteClip(target: Clip) {
    setClips((cur) => cur.filter((c) => c.id !== target.id));
    if (selectedId === target.id) setSelectedId(null);
    await deleteClip(projectId, target);
  }

  function handleToggleMute(clip: Clip) {
    const muted = !clip.muted;
    setClips((cur) =>
      cur.map((c) => (c.id === clip.id ? { ...c, muted } : c)),
    );
    updateClip(projectId, clip.id, { muted });
  }

  async function handleDelete() {
    if (!selectedClip) return;
    await handleDeleteClip(selectedClip);
  }

  const hasVisual = clips.some((c) => c.type !== "audio");
  const visualClips = clips.filter((c) => c.type !== "audio");
  const audioClips = clips.filter((c) => c.type === "audio");

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
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (data.error === "plan-required") {
          setRenderError(t("render.planRequired"));
        } else if (data.error === "cloud-render-unavailable") {
          setRenderError(t("render.cloudUnavailable"));
        } else {
          setRenderError(t("render.error"));
        }
        return;
      }
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

  function handleTitleChange(next: string) {
    setTitle(next);
    if (promptTimer.current) clearTimeout(promptTimer.current);
    // 제목 저장은 프롬프트 타이머와 별개 키로.
    const timers = saveTimers.current;
    if (timers.has("title")) clearTimeout(timers.get("title"));
    timers.set(
      "title",
      setTimeout(() => {
        updateProjectSettings(projectId, { title: next.trim() || "제목 없는 프로젝트" });
        timers.delete("title");
      }, 500),
    );
  }

  function handleAspectChange(next: AspectRatio) {
    setAspectRatio(next);
    updateProjectSettings(projectId, { aspectRatio: next });
  }

  function handleEndFadeToggle() {
    const next = !endFadeOut;
    setEndFadeOut(next);
    updateProjectSettings(projectId, { endFadeOut: next });
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

  const trimClip = clips.find((c) => c.id === trimClipId) ?? null;

  function handleApplyTrim(trimStart: number, trimEnd: number) {
    if (!trimClip) return;
    const id = trimClip.id;
    setClips((cur) =>
      cur.map((c) => (c.id === id ? { ...c, trimStart, trimEnd } : c)),
    );
    updateClip(projectId, id, { trimStart, trimEnd });
    setTrimClipId(null);
  }

  async function handleSplit(atSec: number) {
    if (!trimClip) return;
    await splitVideoClip(projectId, trimClip, atSec);
    setTrimClipId(null);
    setClips(await listClips(projectId)); // 분할 결과(새 클립 포함) 반영
  }

  async function handleAutoCut(clip: Clip) {
    const current = getClientAuth().currentUser;
    if (!current) return;
    setAutoCutting(true);
    setAutoCutError(null);
    try {
      const token = await current.getIdToken();
      const res = await fetch(`/api/autocut/${projectId}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ clipId: clip.id }),
      });
      if (!res.ok) throw new Error("autocut failed");
      const { scenes, duration } = (await res.json()) as {
        scenes: number[];
        duration: number;
      };
      // 컷 지점 → 세그먼트(너무 짧은 구간 제외)
      const MIN = 1.0;
      const bounds = Array.from(
        new Set([
          0,
          ...scenes.filter((s) => s > MIN && s < duration - MIN),
          duration,
        ]),
      ).sort((a, b) => a - b);
      const segments: { start: number; end: number }[] = [];
      for (let i = 0; i < bounds.length - 1; i++) {
        if (bounds[i + 1] - bounds[i] >= MIN) {
          segments.push({ start: bounds[i], end: bounds[i + 1] });
        }
      }
      if (segments.length <= 1) {
        setAutoCutError(t("autocut.none"));
        return;
      }
      await applyAutoCut(projectId, clip, segments);
      setClips(await listClips(projectId));
    } catch {
      setAutoCutError(t("autocut.error"));
    } finally {
      setAutoCutting(false);
    }
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
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-muted transition hover:text-accent"
        >
          ← {t("backToDashboard")}
        </Link>

        {/* 단순/복잡 모드 토글 */}
        <div className="inline-flex rounded-full border border-line bg-surface p-0.5">
          {(["simple", "advanced"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                mode === m
                  ? "bg-accent text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {!loading && clips.length >= 0 ? (
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t("titlePlaceholder")}
          aria-label={t("titleLabel")}
          className="mt-3 w-full max-w-xl rounded-[var(--radius)] border border-transparent bg-transparent px-2 py-1 font-display text-2xl font-semibold text-ink transition hover:border-line focus:border-accent focus-visible:outline-none"
        />
      ) : null}

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
            endFadeOut={endFadeOut}
            seekClipId={selectedId}
          />

          {/* 오디오 타임라인 (활성 배경음악) */}
          <AudioTimeline audioClips={audioClips} />

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
              clips={visualClips}
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

          {/* 배경음악 목록 */}
          <MusicTrack
            audioClips={audioClips}
            onToggle={handleToggleMute}
            onDelete={handleDeleteClip}
          />

          {/* 단순 모드: 자막·타이틀만 */}
          {mode === "simple" && (
            <SimpleClipPanel
              hasSelection={!!selectedClip}
              caption={selectedClip?.caption.text ?? ""}
              title={selectedTitle}
              onCaption={handleCaptionText}
              onTitle={handleSetTitle}
            />
          )}

          {/* ── 복잡 모드 전용: 디테일 편집 ── */}
          {mode === "advanced" && (
            <>
              <Inspector
                clip={selectedClip}
                aspectRatio={aspectRatio}
                onCaptionText={handleCaptionText}
                onOverrides={handleOverrides}
                onAnimation={handleAnimation}
                onDuration={handleDuration}
                onScale={handleScale}
                onApplyToAll={handleApplyToAll}
                onAddOverlay={handleAddOverlay}
                onAddEmoji={handleAddEmoji}
                onUploadOverlayImage={handleUploadOverlayImage}
                overlayUploading={overlayUploading}
                onUpdateOverlay={handleUpdateOverlay}
                onDeleteOverlay={handleDeleteOverlay}
                onApplyOverlaysToAll={handleApplyOverlaysToAll}
                onOpenTrim={() => selectedClip && setTrimClipId(selectedClip.id)}
                onAutoCut={() => selectedClip && handleAutoCut(selectedClip)}
                autoCutting={autoCutting}
                autoCutError={autoCutError}
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
            </>
          )}

          {/* 영상 만들기 (실제 MP4 렌더) */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <label className="mb-3 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={endFadeOut}
                onChange={handleEndFadeToggle}
                className="accent-[var(--accent)]"
              />
              {t("render.endFade")}
            </label>
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

      {trimClip && trimClip.type === "video" ? (
        <VideoTrimModal
          clip={trimClip}
          onClose={() => setTrimClipId(null)}
          onApply={handleApplyTrim}
          onSplit={handleSplit}
        />
      ) : null}
    </div>
  );
}
