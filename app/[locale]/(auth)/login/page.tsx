"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { BRAND } from "@/lib/brand";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 이미 로그인돼 있으면 대시보드로.
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (e) {
      // 사용자에겐 일반 메시지, 개발 콘솔엔 실제 Firebase 에러를 남긴다.
      console.error("[login] sign-in failed:", e);
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <span className="mb-6 inline-block h-10 w-10 rounded-xl bg-accent" aria-hidden />
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title", { brand: BRAND })}
      </h1>
      <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>

      <button
        type="button"
        onClick={handleSignIn}
        disabled={busy || loading}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-5 py-3 text-sm font-medium text-ink transition hover:border-accent disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <GoogleIcon />
        {busy ? t("signingIn") : t("google")}
      </button>

      {error ? (
        <p className="mt-4 text-sm text-render" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
