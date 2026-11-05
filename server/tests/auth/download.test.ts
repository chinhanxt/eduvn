import { describe, expect, it } from "vitest";
import { createDownloadSigner } from "../../src/auth/download";

const SECRET = "test-secret-test-secret-test-secret!";

describe("createDownloadSigner", () => {
  it("ký rồi kiểm lại được", async () => {
    const s = createDownloadSigner(SECRET);
    const claims = { orgId: "o1", examId: "e1", kind: "exam" as const, code: "101" };
    expect(await s.verify(await s.sign(claims))).toEqual(claims);
    expect(await s.verify(await s.sign({ orgId: "o1", examId: "e1", kind: "key" }))).toEqual({ orgId: "o1", examId: "e1", kind: "key", code: undefined });
  });

  it("từ chối token bị sửa, ký bằng khoá khác, hết hạn", async () => {
    const s = createDownloadSigner(SECRET);
    const t = await s.sign({ orgId: "o1", examId: "e1", kind: "key" });
    await expect(s.verify(`${t}x`)).rejects.toThrow();
    await expect(createDownloadSigner(`${SECRET}-other`).verify(t)).rejects.toThrow();
    const expired = createDownloadSigner(SECRET, Math.floor(Date.now() / 1000) - 10);
    await expect(expired.verify(await expired.sign({ orgId: "o1", examId: "e1", kind: "key" }))).rejects.toThrow();
  });

  it("secret phải ≥ 32 ký tự", () => {
    expect(() => createDownloadSigner("short")).toThrow();
  });
});
