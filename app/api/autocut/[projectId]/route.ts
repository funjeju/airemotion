import "server-only";
import { NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase/admin";
import { detectScenes } from "@/lib/video/scene-detect";

export const runtime = "nodejs";
export const maxDuration = 300; // 긴 영상 분석에 시간이 걸릴 수 있음(로컬/워커 전용)

export async function POST(
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

  const body = (await req.json().catch(() => ({}))) as {
    clipId?: string;
    threshold?: number;
  };
  if (!body.clipId) {
    return NextResponse.json({ error: "no-clip" }, { status: 400 });
  }

  // 소유권 + 클립 조회
  const projectRef = adminDb().collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists || projectSnap.data()?.ownerUid !== decoded.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const clipSnap = await projectRef.collection("clips").doc(body.clipId).get();
  const clip = clipSnap.data();
  if (!clipSnap.exists || !clip || clip.type !== "video") {
    return NextResponse.json({ error: "not-a-video" }, { status: 400 });
  }

  try {
    const scenes = await detectScenes(
      clip.downloadURL as string,
      body.threshold ?? 0.4,
    );
    return NextResponse.json({
      scenes,
      duration: clip.durationSec as number,
    });
  } catch (e) {
    console.error("[autocut] failed:", e);
    return NextResponse.json({ error: "autocut-failed" }, { status: 500 });
  }
}
