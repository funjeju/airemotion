import "server-only";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { NextResponse } from "next/server";
import { adminDb, adminStorage, verifyIdToken } from "@/lib/firebase/admin";
import { renderProjectVideo } from "@/lib/remotion/render";
import {
  canUseProvider,
  resolveRenderProvider,
  type UserPlan,
} from "@/lib/remotion/provider";
import { clipsToGlideProps } from "@/lib/remotion/to-props";
import type { Clip } from "@/lib/firebase/clips";
import type { Caption } from "@/lib/firebase/captions";

export const runtime = "nodejs";
// ⚠️ 로컬/전용 워커 전용. Vercel 서버리스는 긴 렌더에 부적합(Phase 5에서 Remotion Lambda로 이전).
export const maxDuration = 300;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;

  // 1) 인증: Authorization: Bearer <idToken>
  const authz = req.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  const decoded = idToken ? await verifyIdToken(idToken) : null;
  if (!decoded) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const uid = decoded.uid;

  // 2) 소유권 검증
  const projectRef = adminDb().collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists || projectSnap.data()?.ownerUid !== uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 2.5) 렌더 공급자 + 플랜 게이팅
  const provider = resolveRenderProvider();
  // Vercel 등 서버리스에선 로컬 렌더(헤드리스 Chrome) 불가 → 깔끔히 안내.
  if (provider === "local" && process.env.VERCEL) {
    return NextResponse.json(
      { error: "local-render-unavailable" },
      { status: 501 },
    );
  }
  if (provider === "lambda") {
    const userSnap = await adminDb().collection("users").doc(uid).get();
    const plan = (userSnap.data()?.plan ?? "free") as UserPlan;
    if (!canUseProvider(provider, plan)) {
      return NextResponse.json({ error: "plan-required" }, { status: 402 });
    }
    // AWS Lambda 경로는 아직 미구성 — 준비되면 여기서 renderMediaOnLambda 호출.
    return NextResponse.json(
      { error: "cloud-render-unavailable" },
      { status: 501 },
    );
  }
  // provider === "local": 셀프호스트/로컬 머신에서 렌더(무료). 아래 진행.

  // 3) 클립 로드 → 컴포지션 props
  const clipsSnap = await projectRef.collection("clips").get();
  const clips = clipsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Clip)
    .sort((a, b) => a.order - b.order);
  const captionsSnap = await projectRef.collection("captions").get();
  const captions = captionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Caption)
    .sort((a, b) => a.start - b.start);
  const pdata = projectSnap.data() ?? {};
  const props = clipsToGlideProps(
    clips,
    captions,
    {
      type: pdata.transitionType ?? "fade",
      direction: pdata.transitionDirection ?? "from-left",
      speed: pdata.transitionSpeed ?? "normal",
    },
    pdata.aspectRatio ?? "16:9",
    pdata.endFadeOut ?? true,
  );
  if (props.clips.length === 0) {
    return NextResponse.json({ error: "no-clips" }, { status: 400 });
  }

  const tmpPath = path.join(os.tmpdir(), `glide-${projectId}-${randomUUID()}.mp4`);

  try {
    await projectRef.update({ status: "rendering", updatedAt: new Date() });

    // 4) 렌더
    await renderProjectVideo(props, tmpPath);

    // 5) Storage 업로드 (다운로드 토큰 부여 → 공개 다운로드 URL)
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
    const outputId = randomUUID();
    const destination = `users/${uid}/projects/${projectId}/renders/${outputId}.mp4`;
    const token = randomUUID();
    await adminStorage()
      .bucket(bucketName)
      .upload(tmpPath, {
        destination,
        metadata: {
          contentType: "video/mp4",
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      destination,
    )}?alt=media&token=${token}`;

    // 6) 프로젝트 상태 갱신
    await projectRef.update({
      status: "done",
      outputUrl: url,
      updatedAt: new Date(),
    });

    return NextResponse.json({ url });
  } catch (e) {
    console.error("[render] failed:", e);
    await projectRef
      .update({ status: "error", updatedAt: new Date() })
      .catch(() => {});
    return NextResponse.json({ error: "render-failed" }, { status: 500 });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
