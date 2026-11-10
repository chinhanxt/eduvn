// server/tests/domain/geometry3d.test.ts — schema dựng hình không gian (AI + bảng giảng).
import { describe, expect, it } from "vitest";
import { validateBoard } from "../../src/domain/board";
import { parseLength, parseSpec } from "../../src/domain/geometry3d";
import fixtures from "../fixtures/dung-hinh.json";
import { sampleDoc } from "../helpers/board";

describe("đọc độ dài theo a", () => {
  it.each([
    ["a", 1],
    ["2a", 2],
    ["a√2", Math.SQRT2],
    ["a√6/2", Math.sqrt(6) / 2],
    ["2a√3/3", (2 * Math.sqrt(3)) / 3],
    ["a*sqrt(3)/2", Math.sqrt(3) / 2],
    ["\\frac{a\\sqrt{3}}{2}", Math.sqrt(3) / 2],
    ["1,5a", 1.5],
    ["1/3", 1 / 3],
    ["√(a^2+1)", Math.SQRT2],
  ])("%s", (s, v) => expect(parseLength(s)).toBeCloseTo(v, 12));
  it("chuỗi lạ bị từ chối, không chạy mã", () => {
    expect(() => parseLength("alert(1)")).toThrow();
    expect(() => parseLength("2a+")).toThrow();
  });
});

describe("kiểm spec dựng hình", () => {
  it("10 đề mẫu đều hợp lệ; độ dài dạng chuỗi được đổi sang số", () => {
    for (const f of fixtures) {
      const r = parseSpec(f.spec);
      expect(r.ok, f.problem).toBe(true);
    }
    const r = parseSpec(fixtures[0]!.spec);
    if (!r.ok) throw new Error();
    expect(r.spec.points[1]).toMatchObject({ type: "above", height: Math.SQRT2 });
  });
  it("nhận spec bọc trong {spec}, 'solids' thay 'bodies'", () => {
    const { bodies, ...rest } = fixtures[0]!.spec as { bodies: unknown };
    expect(parseSpec({ spec: { ...rest, solids: bodies } }).ok).toBe(true);
  });
  it("điểm chưa định nghĩa, trùng tên, tên sai, thiếu cấu trúc → lỗi tiếng Việt", () => {
    const base = fixtures[0]!.spec as { points: unknown[]; bodies: unknown[] };
    const miss = parseSpec({ ...base, segments: [["A", "X"]] });
    expect(!miss.ok && miss.issues.join()).toContain("Điểm chưa được định nghĩa: X");
    const dup = parseSpec({ ...base, points: [...base.points, { type: "coord", id: "S", at: [0, 0, 1] }] });
    expect(!dup.ok && dup.issues.join()).toContain("hai lần");
    expect(parseSpec({ ...base, points: [{ type: "coord", id: "abc", at: [0, 0, 0] }] }).ok).toBe(false);
    expect(parseSpec({ ...base, points: [{ type: "foot", id: "H", from: "S" }] }).ok).toBe(false);
    expect(parseSpec("rác").ok).toBe(false);
  });
});

describe("bảng giảng: hình không gian", () => {
  it("bảng cũ (kind cube, không spec) vẫn hợp lệ", () => {
    expect(validateBoard({ title: "T", subject: "Toán", grade: 11, doc: sampleDoc() }, "save").ok).toBe(true);
  });
  it("hình mới có spec + chế độ chiếu + in đề", () => {
    const r = parseSpec(fixtures[2]!.spec);
    if (!r.ok) throw new Error();
    const doc = sampleDoc();
    doc.pages[0]!.objects.push({ type: "solid", id: "c2", kind: "ai", cx: 300, cy: 300, size: 170, th: 0, ph: 0.5, points: [], section: null, angle: null, spec: r.spec, mode: "sgk", print: true } as never);
    const v = validateBoard({ title: "T", subject: "Toán", grade: 11, doc }, "save");
    expect(v.ok).toBe(true);
    const bad = sampleDoc();
    bad.pages[0]!.objects.push({ type: "solid", id: "c3", kind: "Bad Kind", cx: 0, cy: 0, size: 100, th: 0, ph: 0.5, points: [], section: null, angle: null } as never);
    expect(validateBoard({ title: "T", subject: "Toán", grade: 11, doc: bad }, "save").ok).toBe(false);
  });
});
