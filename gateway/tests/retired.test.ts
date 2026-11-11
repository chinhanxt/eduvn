import { describe, expect, it } from "vitest";
import { isRetiredReply } from "../src/backends/acp";

describe("isRetiredReply", () => {
  it("nhận câu báo model đã ngừng", () => {
    expect(isRetiredReply("Claude Opus 4.6 is no longer available. Please switch to a newer model.")).toBe(true);
    expect(isRetiredReply("This model has been deprecated.")).toBe(true);
  });
  it("không nhầm câu trả lời thường", () => {
    expect(isRetiredReply("Hằng đẳng thức (a+b)^2 = a^2 + 2ab + b^2.")).toBe(false);
    expect(isRetiredReply("")).toBe(false);
    expect(isRetiredReply(`Mô hình này không còn dùng được ${"x".repeat(500)} model no longer available`)).toBe(false);
  });
});
