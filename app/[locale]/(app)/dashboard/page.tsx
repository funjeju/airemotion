"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  createProject,
  listProjects,
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
            <li key={p.id}>
              <Link
                href={`/editor/${p.id}`}
                className="block rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <h3 className="font-display text-lg font-medium text-ink">
                  {p.title}
                </h3>
                <p className="mt-2 font-mono text-xs uppercase tracking-wide text-muted">
                  {t(`status.${STATUS_KEY[p.status]}`)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
