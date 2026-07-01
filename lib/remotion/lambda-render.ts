import {
  getRenderProgress,
  renderMediaOnLambda,
  type AwsRegion,
} from "@remotion/lambda/client";
import { totalDurationInFrames, type GlideVideoProps } from "@/remotion/types";

const REGION = (process.env.AWS_REGION ?? "us-east-1") as AwsRegion;

/**
 * 동시실행 한도 안에서 최대 병렬을 뽑는 framesPerLambda 계산.
 * 렌더러 수 = ceil(총프레임 / framesPerLambda) ≤ MAX_RENDERERS (오케스트레이터 1 포함해 한도 이하).
 * 한도 10이면 MAX_RENDERERS=9. 증설되면 env로 올려 속도 향상. 최소 framesPerLambda=5.
 */
function framesPerLambdaFor(props: GlideVideoProps): number {
  const override = Number(process.env.REMOTION_FRAMES_PER_LAMBDA);
  if (Number.isFinite(override) && override >= 5) return override;
  const maxRenderers = Number(process.env.REMOTION_MAX_RENDERERS ?? 9);
  const transFrames =
    props.transitionType === "none" ? 0 : props.transitionDurationInFrames;
  const total = totalDurationInFrames(props.clips, transFrames);
  return Math.max(5, Math.ceil(total / Math.max(1, maxRenderers)));
}

/** Lambda 렌더에 필요한 배포 정보가 모두 설정됐는지. */
export function lambdaConfigured(): boolean {
  return !!(
    process.env.REMOTION_LAMBDA_FUNCTION_NAME &&
    process.env.REMOTION_SERVE_URL &&
    process.env.REMOTION_AWS_ACCESS_KEY_ID &&
    process.env.REMOTION_AWS_SECRET_ACCESS_KEY
  );
}

/** AWS Lambda에서 렌더 → 완료까지 폴링 후 출력 파일 URL 반환. */
export async function renderOnLambda(props: GlideVideoProps): Promise<string> {
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
  const serveUrl = process.env.REMOTION_SERVE_URL!;

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: REGION,
    functionName,
    serveUrl,
    composition: "GlideVideo",
    inputProps: props,
    codec: "h264",
    privacy: "public",
    downloadBehavior: { type: "download", fileName: "glide.mp4" },
    // 동시실행 한도 안에서 최대 병렬(렌더러 ≤ 한도-1). 한도 증설되면 REMOTION_MAX_RENDERERS↑.
    framesPerLambda: framesPerLambdaFor(props),
  });

  // 진행 상황 폴링(수십 개 람다 병렬 렌더).
  for (;;) {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region: REGION,
    });
    if (progress.fatalErrorEncountered) {
      throw new Error(
        progress.errors?.[0]?.message ?? "lambda render failed",
      );
    }
    if (progress.done) {
      return progress.outputFile ?? "";
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}
