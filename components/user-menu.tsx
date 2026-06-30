"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";

/** 상단바 우측: 미인증이면 로그인 링크, 인증되면 아바타 + 로그아웃. */
export function UserMenu() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-line" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t("login")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.photoURL ? (
        <Image
          src={user.photoURL}
          alt={user.displayName ?? ""}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full border border-line"
          unoptimized
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-weak text-sm font-medium text-accent">
          {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
        </span>
      )}
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.replace("/");
        }}
        className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t("logout")}
      </button>
    </div>
  );
}
