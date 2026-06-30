import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { getClientStorage, getDb } from "./client";

export type ClipType = "image" | "video" | "audio";
export type Animation = "zoomIn" | "zoomOut" | "pan";

export type CaptionOverrides = {
  color?: string;
  bgColor?: string;
  fontSize?: number;
  position?: "top" | "center" | "bottom";
};

export type Clip = {
  id: string;
  order: number;
  type: ClipType;
  storagePath: string;
  downloadURL: string;
  fileName: string;
  durationSec: number;
  animation: Animation | null;
  caption: { text: string; overrides: CaptionOverrides | null };
};

// 사진 애니메이션 풀(무난한 효과만). 순수 랜덤 금지 — 직전과 다른 것을 순환 배정.
export const ANIMATION_POOL: Animation[] = ["zoomIn", "zoomOut", "pan"];
export const PHOTO_DEFAULT_SEC = 4;

/** 직전 애니메이션과 겹치지 않게 풀에서 순환 배정. */
export function pickAnimation(prev: Animation | null): Animation {
  if (!prev) return ANIMATION_POOL[0];
  const i = ANIMATION_POOL.indexOf(prev);
  return ANIMATION_POOL[(i + 1) % ANIMATION_POOL.length];
}

export function clipTypeOf(file: File): ClipType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

/** 영상/오디오의 실제 길이를 브라우저에서 읽는다. 실패 시 사진 기본값. */
export function readMediaDuration(file: File, type: ClipType): Promise<number> {
  if (type === "image") return Promise.resolve(PHOTO_DEFAULT_SEC);
  return new Promise((resolve) => {
    const el = document.createElement(type === "video" ? "video" : "audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      resolve(Number.isFinite(el.duration) ? el.duration : PHOTO_DEFAULT_SEC);
    };
    el.onerror = () => resolve(PHOTO_DEFAULT_SEC);
    el.src = URL.createObjectURL(file);
  });
}

function clipsCol(projectId: string) {
  return collection(getDb(), "projects", projectId, "clips");
}

export async function listClips(projectId: string): Promise<Clip[]> {
  const snap = await getDocs(query(clipsCol(projectId)));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Clip);
  return items.sort((a, b) => a.order - b.order);
}

/**
 * 파일을 Storage에 올리고(진행률 콜백) 메타데이터를 clips 문서로 생성.
 * 사진엔 직전과 겹치지 않는 애니메이션을 자동 배정.
 */
export async function uploadClip(
  uid: string,
  projectId: string,
  file: File,
  order: number,
  prevAnimation: Animation | null,
  onProgress?: (pct: number) => void,
): Promise<Clip> {
  const type = clipTypeOf(file);
  const durationSec = await readMediaDuration(file, type);
  const safeName = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const storagePath = `users/${uid}/projects/${projectId}/uploads/${safeName}`;
  const storageRef = ref(getClientStorage(), storagePath);

  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || undefined,
  });
  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (s) => onProgress?.((s.bytesTransferred / s.totalBytes) * 100),
      reject,
      () => resolve(),
    );
  });
  const downloadURL = await getDownloadURL(storageRef);

  const animation: Animation | null =
    type === "image" ? pickAnimation(prevAnimation) : null;

  const clip: Omit<Clip, "id"> = {
    order,
    type,
    storagePath,
    downloadURL,
    fileName: file.name,
    durationSec,
    animation,
    caption: { text: "", overrides: null },
  };

  const docRef = doc(clipsCol(projectId));
  await setDoc(docRef, { ...clip, createdAt: serverTimestamp() });
  return { id: docRef.id, ...clip };
}

/** 드래그 정렬 결과를 한 번에 반영(배치). */
export async function reorderClips(
  projectId: string,
  orderedIds: string[],
): Promise<void> {
  const batch = writeBatch(getDb());
  orderedIds.forEach((id, i) => {
    batch.update(doc(getDb(), "projects", projectId, "clips", id), { order: i });
  });
  await batch.commit();
}

export async function updateClip(
  projectId: string,
  clipId: string,
  patch: Partial<Pick<Clip, "caption" | "animation" | "durationSec">>,
): Promise<void> {
  await updateDoc(doc(getDb(), "projects", projectId, "clips", clipId), patch);
}

export async function deleteClip(
  projectId: string,
  clip: Pick<Clip, "id" | "storagePath">,
): Promise<void> {
  await deleteDoc(doc(getDb(), "projects", projectId, "clips", clip.id));
  try {
    await deleteObject(ref(getClientStorage(), clip.storagePath));
  } catch {
    // 스토리지 객체가 이미 없을 수 있음 — 무시.
  }
}
