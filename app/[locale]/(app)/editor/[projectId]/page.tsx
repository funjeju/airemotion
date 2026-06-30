"use client";

import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
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
import { PreviewCanvas } from "@/components/editor/preview-canvas";

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
          <PreviewCanvas clips={clips} />

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
        </div>
      )}
    </div>
  );
}
