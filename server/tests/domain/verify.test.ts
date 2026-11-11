// server/tests/domain/verify.test.ts — tự kiểm đáp số P13: hình không gian, đại số/giải tích, xác suất, ca lệch cố ý.
import { describe, expect, it } from "vitest";
import { type Solution, normalizeRef, parseSolution } from "../../src/domain/solution";
import { mismatchNote, parseNum, scanRoots, toPlain, verifySolution } from "../../src/domain/verify";
import fixtures from "../fixtures/dung-hinh.json";

const sol = (raw: Record<string, unknown>): Solution => {
  const r = parseSolution({ problem: "Đề", steps: [{ title: "Bước 1", body: "…" }], ...raw });
  if (!r.ok) throw new Error(r.issues.join("\n"));
  return r.solution;
};
/** Lời giải hình không gian từ đề mẫu P10b: đo lại đúng đại lượng đề hỏi, so với đáp số. */
const solid = (i: number, answer: string, measure?: unknown) => {
  const f = fixtures[i]!;
  const m = measure ?? f.spec.measures![0];
  return sol({ problem: f.problem, answer, figure: { kind: "solid3d", spec: f.spec }, checks: [{ type: "measure3d", measure: m }] });
};

describe("đọc đáp số", () => {
  it.each([
    ["a√2", Math.SQRT2],
    ["2a√5/5", (2 * Math.sqrt(5)) / 5],
    ["$\\frac{a\\sqrt{6}}{3}$", Math.sqrt(6) / 3],
    ["3/10", 0.3],
    ["0,25", 0.25],
    ["45°", 45],
    ["V = a³√2/3", Math.SQRT2 / 3],
    ["d = a\\sqrt{3}/3", Math.sqrt(3) / 3],
    ["e^2 - 1", Math.E ** 2 - 1],
    ["ln 2", Math.LN2],
  ])("%s", (s, v) => expect(parseNum(s)!.value).toBeCloseTo(v, 12));
  it("≈ cho sai số theo chữ số cuối; chữ lạ → null", () => {
    expect(parseNum("≈ 0,82")).toEqual({ value: 0.82, approx: 0.005 });
    expect(parseNum("alert(1)")).toBeNull();
    expect(parseNum("không có")).toBeNull();
  });
  it("LaTeX/ký hiệu SGK → cú pháp an toàn", () => {
    expect(toPlain("\\frac{1}{2}x^2")).toBe("((1)/(2))x^2");
    expect(toPlain("log_2(x+1)")).toBe("(ln(x+1)/ln(2))");
    expect(toPlain("√x + √(x+1)")).toBe("sqrt(x) + sqrt((x+1))");
  });
});

describe("hình không gian (đề mẫu P10b)", () => {
  it.each([
    [0, "45°"],
    [1, "2a√5/5"],
    [2, "tan φ = √6"],
    [3, "60°"],
    [4, "a√3/3"],
    [5, "$\\dfrac{a\\sqrt{6}}{3}$"],
  ])("đề %i: đáp số %s được đo lại khớp", (i, answer) => {
    const v = verifySolution(solid(i, answer));
    expect(v.status, JSON.stringify(v.details)).toBe("verified");
  });
  it("thể tích chóp S.ABCD (đáy vuông cạnh a, SA = a√2) = a³√2/3", () => {
    const v = verifySolution(solid(0, "V = a³√2/3", { type: "volume", body: 0 }));
    expect(v.status).toBe("verified");
    expect(v.details[0]!.measured).toBe("a³√2/3");
  });
  it("LỆCH CỐ Ý: đáp số a√2/2 cho khoảng cách A → (SBC) bị bắt, kèm số đo thật", () => {
    const v = verifySolution(solid(1, "a√2/2"));
    expect(v.status).toBe("mismatch");
    expect(v.details[0]).toMatchObject({ ok: false, expected: "a√2/2", measured: "2a√5/5" });
    expect(mismatchNote(v)).toContain("đo/tính thật: 2a√5/5");
  });
  it("kiểm theo bước: độ dài trung gian AC = a√2 ở bước 2", () => {
    const f = fixtures[0]!;
    const s = sol({
      answer: "45°",
      figure: { kind: "solid3d", spec: f.spec },
      steps: [
        { title: "Hình chiếu", body: "AC là hình chiếu của SC", refs: ["SC", "AC", "(ABCD)"] },
        { title: "Tính AC", body: "AC = a√2", refs: ["A-C"], check: { type: "measure3d", measure: { type: "length", of: ["A", "C"] }, expect: "a√2" } },
      ],
    });
    expect(s.steps[0]!.refs).toEqual(["S-C", "A-C", "A-B-C-D"]);
    expect(verifySolution(s).status).toBe("verified");
  });
  it("điểm không có trên hình → chưa kiểm được (không bịa kết quả)", () => {
    const v = verifySolution(solid(0, "a", { type: "length", of: ["A", "Z"] }));
    expect(v.status).toBe("unchecked");
  });
});

describe("đại số / giải tích", () => {
  it("phương trình mũ 2^(x+1) = 8 → x = 2", () => {
    const v = verifySolution(sol({ answer: "x = 2", checks: [{ type: "equation", lhs: "2^(x+1)", rhs: "8", roots: ["2"] }] }));
    expect(v.status).toBe("verified");
  });
  it("phương trình bậc hai đủ nghiệm; thiếu nghiệm bị bắt", () => {
    expect(verifySolution(sol({ answer: "x = 1; x = 3", checks: [{ type: "equation", lhs: "x^2 - 4x + 3", roots: ["1", "3"] }] })).status).toBe("verified");
    const miss = verifySolution(sol({ answer: "x = 1", checks: [{ type: "equation", lhs: "x^2 - 4x + 3", roots: ["1"] }] }));
    expect(miss.status).toBe("mismatch");
    expect(miss.details[0]!.label).toContain("chưa nêu");
  });
  it("phương trình logarit log_2(x) + log_2(x-2) = 3 → x = 4 (x = −2 ngoài tập xác định)", () => {
    expect(verifySolution(sol({ answer: "x = 4", checks: [{ type: "equation", lhs: "log_2(x) + log_2(x-2)", rhs: "3", roots: ["4"] }] })).status).toBe("verified");
    expect(verifySolution(sol({ answer: "x = 4; x = −2", checks: [{ type: "equation", lhs: "log_2(x) + log_2(x-2)", rhs: "3", roots: ["4", "-2"] }] })).status).toBe("mismatch");
  });
  it("bất phương trình x² − 5x + 6 < 0 ⇔ 2 < x < 3", () => {
    expect(verifySolution(sol({ answer: "(2; 3)", checks: [{ type: "inequality", lhs: "x^2-5x+6", op: "<", solution: [["2", "3"]] }] })).status).toBe("verified");
    expect(verifySolution(sol({ answer: "x > 2", checks: [{ type: "inequality", lhs: "x^2-5x+6", op: "<", solution: [["2", "inf"]] }] })).status).toBe("mismatch");
  });
  it("tích phân ∫₀¹ (3x² + 2x) dx = 2 và ∫₀^π sin x dx = 2", () => {
    const v = verifySolution(sol({ answer: "2", checks: [{ type: "integral", f: "3x^2 + 2x", from: "0", to: "1" }, { type: "integral", f: "\\sin x", from: "0", to: "π" }] }));
    expect(v.status).toBe("verified");
  });
  it("đạo hàm y = x³ − 3x tại x = 2 bằng 9; giá trị biểu thức", () => {
    const v = verifySolution(sol({ answer: "9", checks: [{ type: "derivative", f: "x^3 - 3x", at: "2" }, { type: "value", expr: "\\frac{1}{2} + \\frac{1}{3}", expect: "5/6" }] }));
    expect(v.status).toBe("verified");
  });
  it("LỆCH CỐ Ý: ∫₁^e (1/x) dx ghi 2 (đúng là 1)", () => {
    const v = verifySolution(sol({ answer: "2", checks: [{ type: "integral", f: "1/x", from: "1", to: "e" }] }));
    expect(v.status).toBe("mismatch");
    expect(v.details[0]!.measured).toBe("1");
  });
  it("tìm nghiệm bỏ qua điểm gián đoạn của 1/x", () => {
    expect(scanRoots((x) => 1 / x)).toEqual([]);
    expect(scanRoots((x) => x * x - 2).map((r) => +r.toFixed(9))).toEqual([-1.414213562, 1.414213562]);
  });
});

describe("xác suất (cây)", () => {
  const tree = (p2 = "0,05") => ({
    kind: "tree",
    spec: {
      nodes: [
        { id: "g", label: "Gốc" },
        { id: "A", label: "Máy A", parent: "g", p: "0,6" },
        { id: "B", label: "Máy B", parent: "g", p: "0,4" },
        { id: "AL", label: "Lỗi", parent: "A", p: "0,02" },
        { id: "AT", label: "Tốt", parent: "A", p: "0,98" },
        { id: "BL", label: "Lỗi", parent: "B", p: p2 },
        { id: "BT", label: "Tốt", parent: "B", p: "0,95" },
      ],
    },
  });
  it("xác suất toàn phần P(Lỗi) = 0,6·0,02 + 0,4·0,05 = 0,032", () => {
    expect(verifySolution(sol({ answer: "0,032", figure: tree(), checks: [{ type: "probability", leaves: ["AL", "BL"] }] })).status).toBe("verified");
  });
  it("Bayes: P(A | Lỗi) = 0,012/0,032 = 3/8", () => {
    expect(verifySolution(sol({ answer: "3/8", figure: tree(), checks: [{ type: "probability", leaves: ["AL", "AT"], given: ["AL", "BL"] }] })).status).toBe("verified");
  });
  it("cây sai: nhánh sau Máy B cộng 1,05 ≠ 1", () => {
    const v = verifySolution(sol({ answer: "0,052", figure: tree("0,1"), checks: [{ type: "probability", leaves: ["AL", "BL"] }] }));
    expect(v.status).toBe("mismatch");
    expect(v.details[0]!.label).toContain("Máy B");
  });
});

describe("mô hình lời giải", () => {
  it("nhận dạng bọc/tên khác của model, refs chuỗi", () => {
    const r = parseSolution({ solution: { problem: "Đề", dap_so: 5, buoc: [{ title: "B1", noi_dung: "x", refs: "A, B" }] } });
    expect(r.ok && r.solution.answer).toBe("5");
    expect(r.ok && r.solution.steps[0]!.refs).toEqual(["A", "B"]);
    expect(r.ok && r.solution.verification.status).toBe("unchecked");
  });
  it("từ chối lời giải không bước / không đáp số", () => {
    expect(parseSolution({ problem: "Đề", answer: "1", steps: [] }).ok).toBe(false);
    expect(parseSolution({ problem: "Đề", steps: [{ title: "a", body: "b" }] }).ok).toBe(false);
  });
  it("chuẩn hoá refs hình", () => {
    expect(normalizeRef("SA", "solid3d")).toBe("S-A");
    expect(normalizeRef("A'B", "solid3d")).toBe("A'-B");
    expect(normalizeRef("(SBC)", "solid3d")).toBe("S-B-C");
    expect(normalizeRef("nhánh 1", "tree")).toBe("nhánh 1");
  });
  it("không có phép kiểm nào → Chưa kiểm được", () => {
    expect(verifySolution(sol({ answer: "Văn nghị luận" })).status).toBe("unchecked");
  });
});

describe("đọc dần JSON đang stream", () => {
  it("trả bước đã xong và phần dở của bước đang viết", async () => {
    const { partialSteps } = await import("../../src/domain/solution");
    const full = JSON.stringify({ problem: "Đề", steps: [{ title: "Đặt ẩn", body: "Gọi x {là} \"số\"", refs: ["A"] }, { title: "Giải", body: "Ta có $x^2 = 4$" }] });
    const cut = full.slice(0, full.indexOf("$x^2") + 3);
    const r = partialSteps(cut);
    expect(r.done).toEqual([{ title: "Đặt ẩn", body: 'Gọi x {là} "số"', refs: ["A"] }]);
    expect(r.current).toEqual({ title: "Giải", body: "Ta có $x^" });
    expect(partialSteps(full).done).toHaveLength(2);
    expect(partialSteps('{"problem": "x"').done).toEqual([]);
  });
});

describe("hình trong JSON đang stream", () => {
  it("chưa xong → undefined; xong → hình đã kiểm zod; null/không có → null", async () => {
    const { partialFigure } = await import("../../src/domain/solution");
    const fig = { kind: "graph", spec: { expr: "x^3-3x+1", points: [{ id: "CD", x: "-1", y: "3" }] } };
    const full = JSON.stringify({ problem: "Đề", answer: "3", figure: fig, steps: [{ title: "B1", body: "…" }] });
    expect(partialFigure(full.slice(0, full.indexOf('"points"')))).toBeUndefined();
    expect(partialFigure(full)).toMatchObject({ kind: "graph", spec: { expr: "x^3-3x+1" } });
    expect(partialFigure('{"answer": "x", "figure": null, "steps": [')).toBeNull();
    expect(partialFigure('{"answer": "x", "steps": [')).toBeNull();
    expect(partialFigure('{"answer": "x", "figure": {"kind": "la", "spec": {}}, "steps"')).toBeNull();
    expect(partialFigure('{"answer": "x"')).toBeUndefined();
  });
});
