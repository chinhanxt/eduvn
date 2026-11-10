import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const env = {
  DATABASE_URL: "postgres://eduvn:eduvn-dev@127.0.0.1:5442/eduvn",
  OIDC_ISSUER: "http://localhost:8180/realms/eduvn/",
  OIDC_JWKS_URL: "http://localhost:8180/realms/eduvn/protocol/openid-connect/certs",
  PUBLIC_URL: "http://localhost:4310/",
  DOWNLOAD_SECRET: "x".repeat(32),
  STUDENT_SECRET: "y".repeat(32),
};

describe("loadConfig", () => {
  it("điền mặc định và bỏ / cuối", () => {
    expect(loadConfig(env)).toEqual({
      ...env,
      OIDC_ISSUER: "http://localhost:8180/realms/eduvn",
      PUBLIC_URL: "http://localhost:4310",
      OIDC_AUDIENCE: "eduvn-api",
      HOST: "127.0.0.1",
      PORT: 4310,
      GATEWAY_URL: "http://127.0.0.1:4340",
      DATA_DIR: "./data",
      TTS_PROVIDER: "edge",
      TTS_VOICE: "vi-VN-HoaiMyNeural",
      CHROME_PATH: "/usr/bin/google-chrome",
    });
  });

  it("từ chối secret ngắn và thiếu biến", () => {
    expect(() => loadConfig({ ...env, DOWNLOAD_SECRET: "short" })).toThrow();
    expect(() => loadConfig({ ...env, STUDENT_SECRET: "short" })).toThrow();
    expect(() => loadConfig({ ...env, STUDENT_SECRET: undefined })).toThrow();
    expect(() => loadConfig({ ...env, DATABASE_URL: undefined })).toThrow();
  });
});
