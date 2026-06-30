"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "@/i18n/navigation";

/** 보호 라우트 가드: 미인증이면 /login 으로 리다이렉트. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent"
          aria-label="loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}
