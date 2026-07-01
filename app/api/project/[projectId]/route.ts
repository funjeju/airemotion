import "server-only";
import { NextResponse } from "next/server";
import {
  adminDb,
  adminStorage,
  verifyIdToken,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

/** 프로젝트 삭제 — 문서 + 하위 컬렉션(clips/captions) + Storage 업로드/렌더 전부 정리. */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;

  const authz = req.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  const decoded = idToken ? await verifyIdToken(idToken) : null;
  if (!decoded) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const projectRef = adminDb().collection("projects").doc(projectId);
  const snap = await projectRef.get();
  if (!snap.exists || snap.data()?.ownerUid !== decoded.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Firestore: 하위 컬렉션 포함 재귀 삭제
  await adminDb().recursiveDelete(projectRef);

  // Storage: 이 프로젝트의 업로드/렌더 파일 전부 삭제(실패해도 무시)
  try {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
    await adminStorage()
      .bucket(bucketName)
      .deleteFiles({
        prefix: `users/${decoded.uid}/projects/${projectId}/`,
      });
  } catch (e) {
    console.error("[project delete] storage cleanup failed:", e);
  }

  return NextResponse.json({ ok: true });
}
