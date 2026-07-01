import "server-only";
import { NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase/admin";
import type { Clip } from "@/lib/firebase/clips";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024; // Whisper API 제한 25MB

type WhisperSegment = { start: number; end: number; text: string };

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no-api-key" }, { status: 500 });
  }

  // 소유권
  const projectRef = adminDb().collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists || projectSnap.data()?.ownerUid !== decoded.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 음성 소스: 오디오 클립 우선, 없으면 첫 영상(음성 추출)
  const clipsSnap = await projectRef.collection("clips").get();
  const clips = clipsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Clip)
    .sort((a, b) => a.order - b.order);
  const source =
    clips.find((c) => c.type === "audio") ??
    clips.find((c) => c.type === "video");
  if (!source) {
    return NextResponse.json({ error: "no-audio-source" }, { status: 400 });
  }

  try {
    // 파일 다운로드
    const fileRes = await fetch(source.downloadURL);
    if (!fileRes.ok) {
      return NextResponse.json(
        { error: "fetch-source-failed" },
        { status: 502 },
      );
    }
    const buf = Buffer.from(await fileRes.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "file-too-large" }, { status: 413 });
    }

    // Whisper 호출 (다국어 모델 — 한국어 자동 인식, verbose_json + segment 타임스탬프)
    const form = new FormData();
    form.append("file", new Blob([buf]), source.fileName || "audio");
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      },
    );
    if (!whisperRes.ok) {
      const detail = await whisperRes.text();
      console.error("[transcribe] whisper error:", whisperRes.status, detail);
      return NextResponse.json({ error: "whisper-failed" }, { status: 502 });
    }
    const data = (await whisperRes.json()) as { segments?: WhisperSegment[] };
    const segments = data.segments ?? [];

    // 기존 자막 제거 후 초안 저장 (source: auto)
    const captionsCol = projectRef.collection("captions");
    const existing = await captionsCol.get();
    const batch = adminDb().batch();
    existing.docs.forEach((d) => batch.delete(d.ref));
    segments.forEach((s) => {
      batch.set(captionsCol.doc(), {
        start: s.start,
        end: s.end,
        text: (s.text ?? "").trim(),
        source: "auto",
      });
    });
    await batch.commit();

    const captions = (await captionsCol.get()).docs
      .map((d) => {
        const cd = d.data() as {
          start: number;
          end: number;
          text: string;
          source: string;
        };
        return { id: d.id, ...cd };
      })
      .sort((a, b) => a.start - b.start);

    return NextResponse.json({ captions });
  } catch (e) {
    console.error("[transcribe] failed:", e);
    return NextResponse.json({ error: "transcribe-failed" }, { status: 500 });
  }
}
