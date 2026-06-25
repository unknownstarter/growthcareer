import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    // B0044 Sage CRIT-4 — Server Action body limit (default 1MB) 으로
    // lecture_materials 의 PPT/영상 자료 (50MB ~ 100MB) 업로드 실패.
    // 100MB cap 으로 상향. Wave 2 에 signed upload URL (client direct)
    // 패턴으로 전환 시 본 설정 불필요.
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default withNextIntl(nextConfig);
