import { AuthGuard } from "@/components/auth-guard";

// (app) 그룹의 모든 라우트는 인증 필수.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
