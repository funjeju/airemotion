import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// 기본값으로 ./i18n/request.ts 를 사용합니다.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // 네이티브 바이너리·Node 의존 패키지는 서버 번들에서 제외(경로 보존).
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "ffmpeg-static",
  ],
};

export default withNextIntl(nextConfig);
