import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  ensureBrowser,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import type { GlideVideoProps } from "@/remotion/types";

// 번들은 한 번만 만들어 재사용(서버 프로세스 수명 동안 캐시).
let bundlePromise: Promise<string> | null = null;
function getServeUrl(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    });
  }
  return bundlePromise;
}

/** GlideVideo 컴포지션을 MP4로 렌더해 outputLocation 에 저장. */
export async function renderProjectVideo(
  props: GlideVideoProps,
  outputLocation: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  await ensureBrowser();
  const serveUrl = await getServeUrl();
  const composition = await selectComposition({
    serveUrl,
    id: "GlideVideo",
    inputProps: props,
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps: props,
    onProgress: ({ progress }) => onProgress?.(progress * 100),
  });
}
