import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// 기본값으로 ./i18n/request.ts 를 사용합니다.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Remotion 렌더 패키지는 Node 네이티브 의존성이 있어 서버 번들에서 제외.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"],
};

export default withNextIntl(nextConfig);
