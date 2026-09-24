import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공용 로직 패키지는 TypeScript 소스 그대로 가져와 함께 빌드한다
  transpilePackages: ["@diet/core"],
};

export default nextConfig;
