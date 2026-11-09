import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Máy dev 15 GB dùng chung với việc nặng khác (TTS GPU…): mặc định 2 worker để không bị systemd-oomd tắt máy.
    maxWorkers: Number(process.env.VITEST_MAX_WORKERS ?? 2),
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
