import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "./client";

export type CaptionSource = "auto" | "edited";

export type Caption = {
  id: string;
  start: number; // 초
  end: number;
  text: string;
  source: CaptionSource;
};

function captionsCol(projectId: string) {
  return collection(getDb(), "projects", projectId, "captions");
}

export async function listCaptions(projectId: string): Promise<Caption[]> {
  const snap = await getDocs(query(captionsCol(projectId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Caption)
    .sort((a, b) => a.start - b.start);
}

/** 검수로 수정 → source 'edited'. */
export async function updateCaption(
  projectId: string,
  id: string,
  patch: Partial<Pick<Caption, "start" | "end" | "text">>,
): Promise<void> {
  await updateDoc(doc(getDb(), "projects", projectId, "captions", id), {
    ...patch,
    source: "edited",
  });
}

export async function deleteCaption(
  projectId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(getDb(), "projects", projectId, "captions", id));
}
