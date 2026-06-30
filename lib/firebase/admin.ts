import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// 서버 전용 Admin SDK. 시크릿은 NEXT_PUBLIC_ 없이 환경변수에서만 읽는다.
function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // .env 에서는 줄바꿈이 \n 으로 들어오므로 복원.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin 환경변수(FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)가 설정되지 않았습니다.",
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());

/** 클라이언트가 보낸 Firebase ID 토큰을 검증하고 uid 등을 반환. 실패 시 null. */
export async function verifyIdToken(idToken: string) {
  try {
    return await adminAuth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}
