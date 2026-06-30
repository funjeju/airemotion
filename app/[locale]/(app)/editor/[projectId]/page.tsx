"use client";

import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getClientAuth } from "@/lib/firebase/client";
import {
  deleteClip,
  listClips,
  reorderClips,
  updateClip,
  uploadClip,
  type Animation,
  type CaptionOverrides,
  type Clip,
} from "@/lib/firebase/clips";
import { UploadDropzone } from "@/components/editor/upload-dropzone";
import { Filmstrip } from "@/components/editor/filmstrip";
import { Inspector } from "@/components/editor/inspector";
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
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const items = await listClips(projectId);
      if (!alive) return;
      setClips(items);
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
          <RemotionPreview clips={clips} />

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
            onDelete={handleDelete}
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
