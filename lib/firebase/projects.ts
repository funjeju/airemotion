import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./client";

export type ProjectStatus = "draft" | "rendering" | "done" | "error";

export type Project = {
  id: string;
  ownerUid: string;
  title: string;
  intentPrompt: string;
  status: ProjectStatus;
  effectTheme: "calm" | "lively";
  createdAt: { seconds: number } | null;
  updatedAt: { seconds: number } | null;
};

/** 본인 소유 프로젝트만 조회(보안 규칙과 일치). 정렬은 클라이언트에서(인덱스 불필요). */
export async function listProjects(uid: string): Promise<Project[]> {
  const q = query(collection(db, "projects"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  const items = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Project,
  );
  return items.sort(
    (a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0),
  );
}

/** 새 프로젝트 생성. 생성된 문서 id 반환. */
export async function createProject(
  uid: string,
  title: string,
): Promise<string> {
  const ref = await addDoc(collection(db, "projects"), {
    ownerUid: uid,
    title,
    intentPrompt: "",
    status: "draft",
    effectTheme: "calm",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
