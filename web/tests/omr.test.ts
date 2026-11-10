import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { assemble, judge, loadCv, setCv, readGroups, warpPage, type Cv } from "../src/omr/decode";
import { buildTemplate, parseQr, qrPayload, type Entry } from "../src/omr/template";
import { sheetSvg } from "../src/omr/sheetSvg";
import { photograph, renderSheet, rng } from "./omrSynth";

const EXAM = "3f2b8c1e-5a7d-4c9e-8b1a-2d4f6a8c0e11";
const entries: Entry[] = [
  ...Array.from({ length: 40 }, (_, i) => ({ no: i + 1, section: "mcq", sectionNo: i + 1 })),
  ...Array.from({ length: 8 }, (_, i) => ({ no: 41 + i, section: "true_false", sectionNo: i + 1 })),
  ...Array.from({ length: 6 }, (_, i) => ({ no: 49 + i, section: "short_answer", sectionNo: i + 1 })),
  { no: 55, section: "essay", sectionNo: 1 },
];
const t = buildTemplate(entries, { title: "Kiểm tra giữa kỳ", code: "101" });
let cv: Cv;
beforeAll(async () => {
  // Trình nạp ESM của vitest vướng thenable của opencv-js → nạp bằng require trong Node.
  const raw = createRequire(import.meta.url)("@techstark/opencv-js");
  const box = await raw.then((c: unknown) => ({ cv: c }));
  setCv(box.cv);
  cv = await loadCv();
}, 60_000);

describe("template", () => {
  it("đủ nhóm 3 phần + SBD, chia trang, QR khứ hồi, SVG hợp lệ", () => {
    expect(t.groups.filter((g) => g.kind === "mcq")).toHaveLength(40);
    expect(t.groups.filter((g) => g.kind === "tf")).toHaveLength(32);
    expect(t.groups.filter((g) => g.kind === "digit")).toHaveLength(24);
    expect(t.groups.filter((g) => g.kind === "id")).toHaveLength(6);
    expect(t.pages).toBe(2);
    expect(parseQr(qrPayload(EXAM, "101", 1))).toEqual({ examId: EXAM, code: "101", page: 1 });
    const svg = sheetSvg(t, 0, EXAM, "101");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("Mã đề: 101");
    for (const g of t.groups) for (const p of g.pts) expect(p.x > 12 && p.x < 198 && p.y > 17 && p.y < 280).toBe(true);
  });
});

describe("judge", () => {
  it("rỗng / rõ / mờ / hai ô / tẩy", () => {
    expect(judge("a", [0.02, 0.05, 0.0, 0.03])).toMatchObject({ state: "empty", pick: -1 });
    expect(judge("a", [0.05, 0.9, 0.0, 0.1])).toMatchObject({ state: "ok", pick: 1 });
    expect(judge("a", [0.05, 0.38, 0.0, 0.1])).toMatchObject({ state: "doubt", reason: "tô mờ" });
    expect(judge("a", [0.9, 0.85, 0.0, 0.1])).toMatchObject({ state: "doubt", reason: "tô hai ô" });
    expect(judge("a", [0.9, 0.0, 0.46, 0.1])).toMatchObject({ state: "doubt", reason: "có dấu tẩy", pick: 0 });
  });
});

describe("quét ảnh tổng hợp (xoay ±8°, phối cảnh, bóng, mờ, nhiễu)", () => {
  const truthFor = (rand: () => number) => {
    const marks: Record<string, number[]> = {};
    const pickIdx = (n: number) => (rand() < 0.05 ? [] : [Math.floor(rand() * n)]);
    for (const g of t.groups) marks[g.id] = pickIdx(g.pts.length);
    return marks;
  };

  it("≥ 99% nhóm đúng trên 12 phiếu; QR đọc được; thời gian", async () => {
    const rand = rng(7);
    let total = 0;
    let wrong = 0;
    let doubt = 0;
    let sumMs = 0;
    for (let n = 0; n < 12; n++) {
      const sheets = [0, 1].map((page) => {
        const marks = truthFor(rand);
        return { page, marks, img: photograph(cv, renderSheet(t, page, EXAM, "101", marks, rand), rand, { angle: n === 3 ? 180 : undefined }) };
      });
      for (const s of sheets) {
        const w = warpPage(cv, s.img);
        sumMs += w.ms;
        expect(w.qr, `phiếu ${n} trang ${s.page}`).toEqual({ examId: EXAM, code: "101", page: s.page });
        for (const r of readGroups(w, t, s.page)) {
          total++;
          const truth = s.marks[r.id]![0] ?? -1;
          if (r.state === "doubt") doubt++;
          if (r.pick !== truth) wrong++;
        }
      }
    }
    const acc = 1 - wrong / total;
    const line = `OMR tổng hợp: ${total} nhóm, sai ${wrong}, nghi vấn ${doubt}, chính xác ${(acc * 100).toFixed(2)}%, nắn+QR ${(sumMs / 24).toFixed(0)} ms/trang (Node)`;
    writeFileSync("/tmp/p7-omr-stats.txt", line);
    expect(acc).toBeGreaterThanOrEqual(0.99);
    expect(doubt / total).toBeLessThan(0.05);
  }, 240_000);

  it("tô 2 ô bị cờ; tô mờ bị cờ; ghép đáp án đúng", () => {
    const rand = rng(99);
    const marks: Record<string, number[]> = {};
    for (const g of t.groups) marks[g.id] = [];
    Object.assign(marks, { m1: [2], m2: [0, 1], m3: [3], "t41.0": [0], "t41.1": [1], "t41.2": [0], "t41.3": [1], "d49.0": [0], "d49.1": [1], "d49.2": [0], "d49.3": [6], "d50.0": [4], "id.0": [1], "id.1": [2], "id.2": [3], "id.3": [4], "id.4": [5], "id.5": [6] });
    const faint = new Set(["m3"]);
    const reads = [0, 1].flatMap((page) => {
      const img = photograph(cv, renderSheet(t, page, EXAM, "101", marks, rand, 5, faint), rand, { angle: 5 });
      return readGroups(warpPage(cv, img), t, page);
    });
    const by = Object.fromEntries(reads.map((r) => [r.id, r]));
    expect(by.m1).toMatchObject({ state: "ok", pick: 2 });
    expect(by.m2).toMatchObject({ state: "doubt", reason: "tô hai ô" });
    expect(by.m3?.state).toBe("doubt");
    const a = assemble(t, (g) => by[g.id]?.pick ?? -1);
    expect(a.sbd).toBe("123456");
    expect(a.responses[1]).toBe(2);
    expect(a.responses[41]).toEqual([true, false, true, false]);
    expect(a.responses[49]).toBe("-0,5");
    expect(a.responses[50]).toBe("3");
    expect(a.responses[51]).toBeUndefined();
  });
});
