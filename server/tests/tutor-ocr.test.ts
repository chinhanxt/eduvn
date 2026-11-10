import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractPages } from "../src/tutor/extract";
import { OCR_CONCURRENCY, OCR_TASK } from "../src/tutor/ocr";
import type { Ai, AiMessage } from "../src/services/ai";

function fakeOcr() {
  const seen: { task: string; page: string; hasImage: boolean }[] = [];
  let live = 0, maxLive = 0;
  const ai: Ai = {
    async chat(task, messages: AiMessage[]) {
      live++;
      maxLive = Math.max(maxLive, live);
      await new Promise((r) => setTimeout(r, 20));
      live--;
      const u = messages[1]!.content as { type: string; text?: string }[];
      const page = u[0]!.text!;
      seen.push({ task, page, hasImage: u.some((p) => p.type === "image_url") });
      return `${page} Giải $x^2+2x+1=0$`;
    },
    async *stream() {},
  };
  return { ai, seen, maxLive: () => maxLive };
}

describe("OCR PDF scan", () => {
  it("PDF ảnh: OCR từng trang, giữ số trang, tối đa 2 trang song song, báo tiến độ", async () => {
    const { ai, seen, maxLive } = fakeOcr();
    const ticks: number[] = [];
    const pages = await extractPages("scan.pdf", await readFile(new URL("./fixtures/scan3.pdf", import.meta.url)), { ai, onProgress: (p) => ticks.push(p.done) });
    expect(pages).toEqual(["Trang 1. Giải $x^2+2x+1=0$", "Trang 2. Giải $x^2+2x+1=0$", "Trang 3. Giải $x^2+2x+1=0$"]);
    expect(seen.every((s) => s.task === OCR_TASK && s.hasImage)).toBe(true);
    expect(maxLive()).toBeLessThanOrEqual(OCR_CONCURRENCY);
    expect(ticks.at(-1)).toBe(3);
  });

  it("không có cổng AI: báo lỗi rõ ràng thay vì nạp rỗng", async () => {
    await expect(extractPages("scan.pdf", await readFile(new URL("./fixtures/scan3.pdf", import.meta.url)))).rejects.toThrow(/OCR/);
  });
});
