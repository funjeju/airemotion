import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// 기본값으로 ./i18n/request.ts 를 사용합니다.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
