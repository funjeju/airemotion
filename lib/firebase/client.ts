import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// 클라이언트 SDK — NEXT_PUBLIC_ 값만 사용(브라우저로 노출돼도 되는 설정).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 지연 초기화: 모듈 import 시점(서버 프리렌더 포함)에 getAuth 를 호출하지 않는다.
// getAuth 는 apiKey 가 비면 throw 하므로, 실제 사용 시점(브라우저)에만 만든다.
let app: FirebaseApp | undefined;
function getClientApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

let _auth: Auth | undefined;
export function getClientAuth(): Auth {
  return (_auth ??= getAuth(getClientApp()));
}

let _db: Firestore | undefined;
export function getDb(): Firestore {
  return (_db ??= getFirestore(getClientApp()));
}

let _storage: FirebaseStorage | undefined;
export function getClientStorage(): FirebaseStorage {
  return (_storage ??= getStorage(getClientApp()));
}

// 구글 로그인 기본 제공자(생성 시 키 검증 없음 — 안전).
export const googleProvider = new GoogleAuthProvider();
