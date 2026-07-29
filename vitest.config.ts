import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// vitest 셋업 (Task #9). 인증 리팩터(#10) 전 characterization 안전망.
// node 환경 (서버 도메인/가드 로직). @/ alias 는 tsconfig 에서 해석.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
