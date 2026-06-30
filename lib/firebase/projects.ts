import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "./client";
import type {
  RTransitionDirection,
  RTransitionType,
  TransitionSpeed,
} from "@/remotion/types";

export type ProjectStatus = "draft" | "rendering" | "done" | "error";

export type Project = {
  id: string;
  ownerUid: string;
  title: string;
  intentPrompt: string;
  status: ProjectStatus;
  effectTheme: "calm" | "lively";
  transitionType?: RTransitionType;
  transitionDirection?: RTransitionDirection;
  transitionSpeed?: TransitionSpeed;
  createdAt: { seconds: number } | null;
  updatedAt: { seconds: number } | null;
};

/** 본인 소유 프로젝트만 조회(보안 규칙과 일치). 정렬은 클라이언트에서(인덱스 불필요). */
export async function listProjects(uid: string): Promise<Project[]> {
  const q = query(collection(getDb(), "projects"), where("ownerUid", "==", uid));
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
  const ref = await addDoc(collection(getDb(), "projects"), {
    ownerUid: uid,
    title,
    intentPrompt: "",
    status: "draft",
    effectTheme: "calm",
    transitionType: "fade",
    transitionDirection: "from-left",
    transitionSpeed: "normal",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(getDb(), "projects", projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Project;
}

/** 프로젝트 설정(전환 타입·속도 등) 갱신. */
export async function updateProjectSettings(
  projectId: string,
  patch: Partial<
    Pick<
      Project,
      "transitionType" | "transitionDirection" | "transitionSpeed"
    >
  >,
): Promise<void> {
  await updateDoc(doc(getDb(), "projects", projectId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}
