"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  createProject,
  listProjects,
  updateProjectSettings,
  type Project,
} from "@/lib/firebase/projects";

const STATUS_KEY: Record<Project["status"], string> = {
  draft: "draft",
  rendering: "rendering",
  done: "done",
  error: "error",
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setProjects(await listProjects(user.uid));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    try {
      const id = await createProject(user.uid, t("untitled"));
      router.push(`/editor/${id}`);
    } finally {
      setCreating(false);
    }
  }

  function startRename(p: Project) {
    setEditingId(p.id);
    setEditTitle(p.title);
  }

  async function saveRename(id: string) {
    const title = editTitle.trim() || t("untitled");
    setProjects((cur) =>
      cur.map((p) => (p.id === id ? { ...p, title } : p)),
    );
    setEditingId(null);
    await updateProjectSettings(id, { title });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {t("title")}
        </h1>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {creating ? t("creating") : t("newProject")}
        </button>
      </div>

      {loading ? (
        <p className="mt-12 text-sm text-muted">{t("loading")}</p>
      ) : projects.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="text-ink">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyDesc")}</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-accent hover:shadow-md"
            >
              {editingId === p.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveRename(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(p.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded-[var(--radius)] border border-accent bg-bg px-2 py-1 font-display text-lg font-medium text-ink focus-visible:outline-none"
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/editor/${p.id}`)}
                    className="flex-1 text-left font-display text-lg font-medium text-ink transition hover:text-accent focus-visible:outline-none"
                  >
                    {p.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => startRename(p)}
                    aria-label={t("rename")}
                    title={t("rename")}
                    className="shrink-0 text-muted opacity-0 transition hover:text-accent group-hover:opacity-100"
                  >
                    ✎
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => router.push(`/editor/${p.id}`)}
                className="mt-2 block font-mono text-xs uppercase tracking-wide text-muted transition hover:text-accent"
              >
                {t(`status.${STATUS_KEY[p.status]}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
