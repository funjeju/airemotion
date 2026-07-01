import {
  getRenderProgress,
  renderMediaOnLambda,
  type AwsRegion,
} from "@remotion/lambda/client";
import type { GlideVideoProps } from "@/remotion/types";

const REGION = (process.env.AWS_REGION ?? "us-east-1") as AwsRegion;

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
    // 새 AWS 계정은 동시실행 한도가 낮음(기본 10). 병렬 람다 수를 낮춰 rate limit 회피.
    // 한도 증설(→5000)이 승인되면 이 값을 낮춰 속도를 올릴 수 있음.
    framesPerLambda: Number(process.env.REMOTION_FRAMES_PER_LAMBDA ?? 600),
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
