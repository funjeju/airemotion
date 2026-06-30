"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Phase 2에서 업로드·필름스트립 타임라인·자막·미리보기로 채워집니다.
export default function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const t = useTranslations("editor");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted transition hover:text-accent"
      >
        ← {t("backToDashboard")}
      </Link>
      <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
        <h1 className="font-display text-xl font-semibold text-ink">
          {t("comingSoonTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("comingSoonDesc")}</p>
        <p className="mt-4 font-mono text-xs text-muted">{projectId}</p>
      </div>
    </div>
  );
}
