import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { evalAst, parseExpr } from "../../src/services/anim/expr";
import { hyperframesHtml, richText } from "../../src/services/anim/hfHtml";
import { createAnimService } from "../../src/services/anim";
import { AnimSpec, safeLatex } from "../../src/services/anim/spec";

const tmp: string[] = [];
afterAll(() => {
  for (const d of tmp) rmSync(d, { recursive: true, force: true });
});
const mk = () => {
  const d = mkdtempSync(path.join(tmpdir(), "eduvn-animtest-"));
  tmp.push(d);
  return d;
};

describe("biểu thức hàm số an toàn", () => {
  it("phân tích và tính đúng, có nhân ngầm và luỹ thừa", () => {
    expect(evalAst(parseExpr("2x^2 - 3x + 1"), 2)).toBe(3);
    expect(evalAst(parseExpr("a*x^2"), 3, 2)).toBe(18);
    expect(evalAst(parseExpr("-x^2"), 3)).toBe(-9);
    expect(evalAst(parseExpr("3(x+1)"), 1)).toBe(6);
    expect(evalAst(parseExpr("2sin(pi/2)"), 0)).toBeCloseTo(2);
    expect(evalAst(parseExpr("sqrt(x)+abs(-2)"), 9)).toBe(5);
    expect(evalAst(parseExpr("2**3"), 0)).toBe(8);
  });

  it("từ chối mã/hàm lạ, ký tự lạ, quá dài", () => {
    for (const bad of ["__import__('os').system('ls')", "x;y", "foo(x)", "x.real", "x[0]", "lambda x: x", "1+", "(x", "x)", "", "x".repeat(121), "x$y", "eval(x)"]) expect(() => parseExpr(bad), bad).toThrow();
  });
});

describe("đặc tả hoạt hình (zod)", () => {
  const ok = { template: "bien_doi_cong_thuc", thoiLuong: 8, params: { cacBuoc: [{ latex: "(a+b)^2" }, { latex: "a^2+2ab+b^2", ghiChu: "Khai triển" }], toMau: ["2ab"] } };

  it("nhận đặc tả hợp lệ cho cả 7 mẫu, điền mặc định", () => {
    expect(AnimSpec.safeParse(ok).success).toBe(true);
    const g = AnimSpec.parse({ template: "do_thi_ham_so", thoiLuong: 6, params: { bieuThuc: "a*x^2", thamSo: { tu: 1, den: 3 } } });
    expect(g.template === "do_thi_ham_so" && g.params.xMin).toBe(-5);
    expect(AnimSpec.safeParse({ template: "hinh_hoc_dien_tich", thoiLuong: 8, params: {} }).success).toBe(true);
    expect(AnimSpec.safeParse({ template: "truc_so", thoiLuong: 6, params: { khoang: { min: -5, max: 5 }, cacDiem: [{ giaTri: 2 }], cacBuocNhay: [{ tu: 0, den: 3, nhan: "+3" }] } }).success).toBe(true);
    expect(AnimSpec.safeParse({ template: "dien_giai_tung_buoc", thoiLuong: 8, params: { cacDong: ["Bước 1: $x^2$", "Bước 2"] } }).success).toBe(true);
    expect(AnimSpec.safeParse({ template: "so_do_quy_trinh", thoiLuong: 8, params: { cacBuoc: [{ nhan: "A" }, { nhan: "B", moTa: "mô tả" }] } }).success).toBe(true);
    expect(AnimSpec.safeParse({ template: "so_sanh_bang", thoiLuong: 8, params: { cotTieuDe: ["Cột 1", "Cột 2"], cacHang: [["a", "b"]] } }).success).toBe(true);
  });

  it("chặn mẫu lạ, thời lượng ngoài khoảng, LaTeX có lệnh nguy hiểm, hàng bảng lệch cột, biểu thức độc", () => {
    expect(AnimSpec.safeParse({ ...ok, template: "chay_ma" }).success).toBe(false);
    expect(AnimSpec.safeParse({ ...ok, thoiLuong: 120 }).success).toBe(false);
    for (const evil of ["\\input{/etc/passwd}", "\\write18{ls}", "\\def\\x{y}", "x \\usepackage{a}", "tiếng việt", "a % b", "\\immediate\\write"]) expect(safeLatex(evil), evil).toBe(false);
    expect(safeLatex("\\frac{a+b}{2}\\cdot \\sqrt{x}")).toBe(true);
    expect(AnimSpec.safeParse({ ...ok, params: { cacBuoc: [{ latex: "\\input{x}" }, { latex: "y" }] } }).success).toBe(false);
    expect(AnimSpec.safeParse({ template: "so_sanh_bang", thoiLuong: 8, params: { cotTieuDe: ["A", "B"], cacHang: [["1", "2", "3"]] } }).success).toBe(false);
    expect(AnimSpec.safeParse({ template: "do_thi_ham_so", thoiLuong: 6, params: { bieuThuc: "__import__('os')" } }).success).toBe(false);
    expect(AnimSpec.safeParse({ ...ok, extra: 1, params: { ...ok.params, cacBuoc: [{ latex: "x" }] } }).success).toBe(false);
  });

  it("mẫu Manim là mã cố định: không exec/eval/subprocess/open ngoài spec", () => {
    const py = readFileSync(path.resolve(__dirname, "../../../services/manim/templates.py"), "utf8");
    for (const bad of ["exec(", "eval(", "subprocess", "os.system", "__import__", "compile("]) expect(py, bad).not.toContain(bad);
  });
});

describe("HTML HyperFrames từ mẫu (snapshot)", () => {
  it("dien_giai_tung_buoc: dòng hiện lần lượt, công thức KaTeX, chữ AI bị escape", () => {
    const spec = AnimSpec.parse({ template: "dien_giai_tung_buoc", thoiLuong: 10, tieuDe: "Giải phương trình", params: { cacDong: ["Ta có $x^2 = 4$", "<script>alert(1)</script> Vậy x = ±2"] } });
    const html = hyperframesHtml(spec as never);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('class="katex"');
    expect(html).toContain('data-duration="10"');
    expect(html).toMatchSnapshot();
  });

  it("so_do_quy_trinh và so_sanh_bang dựng đủ khối", () => {
    const f = hyperframesHtml(AnimSpec.parse({ template: "so_do_quy_trinh", thoiLuong: 9, params: { cacBuoc: [{ nhan: "Đọc đề" }, { nhan: "Lập phương trình" }, { nhan: "Giải" }] } }) as never);
    expect(f.match(/class="box clip"/g)).toHaveLength(3);
    expect(f.match(/class="arr clip"/g)).toHaveLength(2);
    const t = hyperframesHtml(AnimSpec.parse({ template: "so_sanh_bang", thoiLuong: 9, params: { cotTieuDe: ["Hàm số", "Đồ thị"], cacHang: [["$y=x$", "Đường thẳng"], ["$y=x^2$", "Parabol"]] } }) as never);
    expect(t.match(/class="row rw clip"/g)).toHaveLength(2);
    expect(richText("a < b & $x$")).toContain("a &lt; b &amp; ");
    expect(t).toMatchSnapshot();
  });
});

// Dựng thật (chất lượng thấp). Test chạy trong khoá nặng của ngoài; không bọc heavy lần nữa ở đây.
const MANIM = path.join(homedir(), "Apps/manim/bin/manim");
const TEX = path.join(homedir(), "Apps/tinytex/bin/x86_64-linux");
const real = () => createAnimService({ dataDir: mk(), manimHome: path.join(homedir(), "Apps/manim"), tinytexBin: TEX, quality: "low" });
const probe = (f: string) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

describe.skipIf(!existsSync(MANIM) || process.env.EDUVN_SKIP_RENDER === "1")("dựng thật (Manim + HyperFrames)", () => {
  it("Manim: trục số 3 giây → mp4 đúng thời lượng, dùng cache lần 2", { timeout: 300_000 }, async () => {
    const a = real();
    const spec = { template: "truc_so", thoiLuong: 3, params: { khoang: { min: 0, max: 6 }, cacDiem: [{ giaTri: 2 }], cacBuocNhay: [{ tu: 2, den: 5, nhan: "+3" }] } };
    const t0 = Date.now();
    const r = await a.render(spec);
    const first = Date.now() - t0;
    expect(Math.abs(probe(r.file) - 3)).toBeLessThan(0.3);
    const t1 = Date.now();
    const r2 = await a.render(spec);
    expect(r2.hash).toBe(r.hash);
    expect(Date.now() - t1).toBeLessThan(first / 2);
  });

  it("HyperFrames: sơ đồ quy trình 3 giây → mp4 đúng thời lượng", { timeout: 300_000 }, async () => {
    const r = await real().render({ template: "so_do_quy_trinh", thoiLuong: 3, params: { cacBuoc: [{ nhan: "Đọc đề" }, { nhan: "Giải" }] } });
    expect(Math.abs(probe(r.file) - 3)).toBeLessThan(0.3);
  });
});
