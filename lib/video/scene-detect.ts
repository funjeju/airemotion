import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

/**
 * ffmpeg 장면 감지 — 영상에서 화면이 크게 바뀌는 지점(초)들을 반환.
 * 미디어는 재인코딩하지 않고 분석만 한다(원격 URL 직접 입력 가능).
 */
export async function detectScenes(
  url: string,
  threshold = 0.4,
): Promise<number[]> {
  if (!ffmpegPath) throw new Error("ffmpeg binary not available");

  const args = [
    "-hide_banner",
    "-i",
    url,
    "-filter:v",
    `select='gt(scene,${threshold})',showinfo`,
    "-an",
    "-f",
    "null",
    "-",
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, args);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", () => {
      const times: number[] = [];
      const re = /pts_time:([0-9.]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(stderr)) !== null) {
        const t = parseFloat(m[1]);
        if (Number.isFinite(t)) times.push(t);
      }
      resolve(times.sort((a, b) => a - b));
    });
  });
}
