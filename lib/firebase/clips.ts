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
import {
  ANIMATION_AUTO_POOL,
  type AnimationKind,
  type ROverlay,
  type ROverlayType,
} from "@/remotion/types";

export type Overlay = ROverlay;

/** 새 오버레이 기본값(중앙, 악센트 색). 텍스트/이미지 값은 호출부에서 전달. */
export function makeOverlay(
  type: ROverlayType,
  text: string,
  src?: string,
): Overlay {
  const overlay: Overlay = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    text,
    anim: "fade",
    x: 50,
    y: type === "title" ? 22 : 50,
    scale: 1,
    color: "#5654d4",
  };
  if (src) overlay.src = src; // undefined는 Firestore가 거부
  return overlay;
}

export type ClipType = "image" | "video" | "audio";
export type Animation = AnimationKind;

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
  durationSec: number; // 사진=노출시간, 영상=소스 전체 길이
  animation: Animation | null;
  caption: { text: string; overrides: CaptionOverrides | null };
  scale?: number; // 화면 내 이미지 크기(0.5~1, 기본 1=꽉 채움)
  overlays?: Overlay[]; // 말풍선·제목·스티커 등 요소
  // 영상 트림(초). 미설정 시 [0, durationSec] 전체.
  trimStart?: number;
  trimEnd?: number;
};

/** 영상 클립의 실제 타임라인 노출 길이(트림 반영). */
export function clipPlaybackSec(clip: Clip): number {
  if (clip.type !== "video") return clip.durationSec;
  const start = clip.trimStart ?? 0;
  const end = clip.trimEnd ?? clip.durationSec;
  return Math.max(0.1, end - start);
}

export const PHOTO_DEFAULT_SEC = 4;

/**
 * AI 자동 배정 — 안전한 효과 풀에서 직전과 겹치지 않게 순환.
 * (유저 수동 선택은 전체 ANIMATION_PALETTE를 인스펙터에서 제공.)
 */
export function pickAnimation(prev: Animation | null): Animation {
  if (!prev) return ANIMATION_AUTO_POOL[0];
  const i = ANIMATION_AUTO_POOL.indexOf(prev);
  if (i === -1) return ANIMATION_AUTO_POOL[0];
  return ANIMATION_AUTO_POOL[(i + 1) % ANIMATION_AUTO_POOL.length];
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

/** 오버레이용 이미지(클립아트/스티커) 업로드 → 다운로드 URL 반환. */
export async function uploadOverlayImage(
  uid: string,
  projectId: string,
  file: File,
): Promise<string> {
  const safeName = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const path = `users/${uid}/projects/${projectId}/overlays/${safeName}`;
  const storageRef = ref(getClientStorage(), path);
  await uploadBytesResumable(storageRef, file, {
    contentType: file.type || undefined,
  }).then(() => undefined);
  return getDownloadURL(storageRef);
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
  patch: Partial<
    Pick<
      Clip,
      | "caption"
      | "animation"
      | "durationSec"
      | "scale"
      | "overlays"
      | "trimStart"
      | "trimEnd"
    >
  >,
): Promise<void> {
  await updateDoc(doc(getDb(), "projects", projectId, "clips", clipId), patch);
}

/**
 * 영상 클립을 atSec(소스 기준 초)에서 둘로 분할.
 * 원본은 [trimStart, atSec], 새 클립은 [atSec, trimEnd]. 뒤 클립들 순서 +1.
 */
export async function splitVideoClip(
  projectId: string,
  clip: Clip,
  atSec: number,
): Promise<void> {
  const start = clip.trimStart ?? 0;
  const end = clip.trimEnd ?? clip.durationSec;
  const snap = await getDocs(clipsCol(projectId));
  const batch = writeBatch(getDb());

  // 원본 뒤의 클립들 순서를 한 칸씩 밀기
  snap.docs.forEach((d) => {
    const order = (d.data().order as number) ?? 0;
    if (order > clip.order) batch.update(d.ref, { order: order + 1 });
  });

  // 원본: 끝을 분할 지점으로
  batch.update(doc(getDb(), "projects", projectId, "clips", clip.id), {
    trimEnd: atSec,
  });

  // 새 클립: 분할 지점부터 끝까지
  const newRef = doc(clipsCol(projectId));
  batch.set(newRef, {
    order: clip.order + 1,
    type: clip.type,
    storagePath: clip.storagePath,
    downloadURL: clip.downloadURL,
    fileName: clip.fileName,
    durationSec: clip.durationSec,
    animation: clip.animation,
    caption: { text: "", overrides: null },
    trimStart: atSec,
    trimEnd: end,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  void start; // 가독성용(원본 시작은 유지)
}

/**
 * 자동 컷 — 영상 클립을 여러 세그먼트로 분할(같은 소스, 트림 범위만 다름).
 * 원본은 첫 세그먼트가 되고 나머지는 새 클립으로 추가, 뒤 클립 순서는 밀린다.
 */
export async function applyAutoCut(
  projectId: string,
  clip: Clip,
  segments: { start: number; end: number }[],
): Promise<void> {
  if (segments.length <= 1) return;
  const snap = await getDocs(clipsCol(projectId));
  const batch = writeBatch(getDb());
  const added = segments.length - 1;

  snap.docs.forEach((d) => {
    const order = (d.data().order as number) ?? 0;
    if (order > clip.order) batch.update(d.ref, { order: order + added });
  });

  // 원본 → 첫 세그먼트
  batch.update(doc(getDb(), "projects", projectId, "clips", clip.id), {
    trimStart: segments[0].start,
    trimEnd: segments[0].end,
  });

  // 나머지 세그먼트 → 새 클립
  for (let i = 1; i < segments.length; i++) {
    const ref = doc(clipsCol(projectId));
    batch.set(ref, {
      order: clip.order + i,
      type: clip.type,
      storagePath: clip.storagePath,
      downloadURL: clip.downloadURL,
      fileName: clip.fileName,
      durationSec: clip.durationSec,
      animation: clip.animation,
      caption: { text: "", overrides: null },
      trimStart: segments[i].start,
      trimEnd: segments[i].end,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/** 톤 자동 적용 등 — 여러 클립의 길이·애니메이션을 한 번에 갱신. */
export async function batchUpdateClips(
  projectId: string,
  updates: {
    id: string;
    durationSec?: number;
    animation?: Animation | null;
    scale?: number;
  }[],
): Promise<void> {
  const batch = writeBatch(getDb());
  updates.forEach(({ id, ...patch }) => {
    batch.update(doc(getDb(), "projects", projectId, "clips", id), patch);
  });
  await batch.commit();
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
