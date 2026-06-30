import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getDb } from "./client";

export type UserProfile = {
  displayName: string;
  email: string;
  photoURL: string;
  locale: string;
  theme: "light" | "dark" | "system";
  plan: "free" | "pro"; // 클라우드 렌더 권한
  createdAt: unknown;
};

/**
 * 최초 로그인 시 users/{uid} 문서를 프로비저닝.
 * 이미 있으면 프로필 일부만 갱신(merge), 없으면 생성.
 */
export async function ensureUserDoc(
  user: User,
  opts: { locale: string },
): Promise<void> {
  const ref = doc(getDb(), "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      locale: opts.locale,
      theme: "system",
      plan: "free",
      createdAt: serverTimestamp(),
    });
    return;
  }

  // 재방문: 변할 수 있는 프로필 필드만 동기화.
  await setDoc(
    ref,
    {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
    },
    { merge: true },
  );
}
