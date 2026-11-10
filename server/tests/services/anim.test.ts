import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { evalAst, parseExpr } from "../../src/services/anim/expr";
import { hyperframesHtml, richText } from "../../src/services/anim/hfHtml";
import { createAnimService } from "../../src/services/anim";
import { AnimSpec, TEMPLATES, safeLatex } from "../../src/services/anim/spec";
import { CATALOG, prefilter, subjectKey } from "../../src/services/anim/catalog";

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
    for (const f of ["templates.py", "templates_toan.py", "templates_ly.py", "common.py"]) {
      const py = readFileSync(path.resolve(__dirname, "../../../services/manim", f), "utf8");
      for (const bad of ["exec(", "eval(", "subprocess", "os.system", "__import__", "compile(", "open("]) if (!(f === "common.py" && bad === "open(")) expect(py, `${f}: ${bad}`).not.toContain(bad);
    }
  });
});

describe("danh mục mẫu", () => {
  it("đủ mọi mẫu, ví dụ của từng mẫu qua được zod, thời lượng điển hình 5–15 giây", () => {
    expect(CATALOG.map((c) => c.id).sort()).toEqual(Object.keys(TEMPLATES).sort());
    for (const c of CATALOG) {
      const r = AnimSpec.safeParse({ template: c.id, thoiLuong: c.thoiLuong[0], params: c.viDu });
      expect(r.success, `${c.id}: ${r.success ? "" : JSON.stringify(r.error.issues)}`).toBe(true);
      expect(c.thoiLuong[0]).toBeGreaterThanOrEqual(5);
      expect(c.thoiLuong[1]).toBeLessThanOrEqual(15);
      expect(c.engine).toBe(TEMPLATES[c.id].engine);
    }
  });

  it("chặn tham số xấu của các mẫu mới", () => {
    const bad = (template: string, params: unknown) => AnimSpec.safeParse({ template, thoiLuong: 8, params }).success;
    expect(bad("vecto", { loai: "tong_hbh", a: [5, 3], b: [4, 3] })).toBe(false); // tổng vượt khung
    expect(bad("do_thi_luong_giac", { ham: "tan", tuVongTron: true })).toBe(false);
    expect(bad("tich_phan_dien_tich", { bieuThuc: "x", a: 3, b: 1 })).toBe(false);
    expect(bad("day_so", { loai: "cap_so_cong", u1: 1, n: 5 })).toBe(false);
    expect(bad("bieu_do_so_lieu", { nhan: ["a", "b"], cacChuoi: [{ ten: "x", giaTri: [1, 2, 3] }] })).toBe(false);
    expect(bad("can_bang_phuong_trinh_hoa_hoc", { chatThamGia: ["H2", "O2"], sanPham: ["H2O"], heSoCuoi: [2, 1] })).toBe(false);
    expect(bad("can_bang_phuong_trinh_hoa_hoc", { chatThamGia: ["H2;rm"], sanPham: ["H2O"], heSoCuoi: [2, 1] })).toBe(false);
    expect(bad("giao_diem_he_pt", { f: "x", g: "__import__('os')" })).toBe(false);
    expect(bad("tong_hop_luc", { cacLuc: [{ doLon: 3, gocDo: 0 }] })).toBe(false);
    expect(bad("hinh_khong_gian_xoay", { hinh: "tetrahedron" })).toBe(false);
  });

  // 15 cảnh mẫu qua 6 môn: bộ lọc sơ bộ phải đưa mẫu đúng vào danh sách ≤6 mẫu
  const cases: [string, number, string, string, string][] = [
    ["Toán", 8, "Bình phương một tổng", "Khai triển (a+b)^2 bằng hình vuông diện tích", "hinh_hoc_dien_tich"],
    ["Toán", 9, "Parabol y = ax^2", "Đồ thị hàm số bậc hai, hệ số a và đỉnh", "do_thi_ham_so"],
    ["Toán", 10, "Giá trị lượng giác", "Vòng tròn lượng giác, sin cos tan của góc 60 độ", "vong_tron_luong_giac"],
    ["Toán", 10, "Tổng hai vectơ", "Quy tắc hình bình hành để cộng hai vecto", "vecto"],
    ["Toán", 12, "Hình chóp tứ giác", "Hình không gian: đỉnh, chiều cao và thể tích khối chóp", "hinh_khong_gian_xoay"],
    ["Toán", 11, "Ý nghĩa của đạo hàm", "Cát tuyến tiến tới tiếp tuyến, hệ số góc là đạo hàm", "dao_ham_tiep_tuyen"],
    ["Toán", 12, "Tích phân", "Tích phân xác định là diện tích dưới đường cong, tổng Riemann", "tich_phan_dien_tich"],
    ["Toán", 11, "Cấp số cộng", "Dãy số có công sai d, tổng n số hạng đầu", "day_so"],
    ["Vật lí", 11, "Dao động điều hoà", "Con lắc lò xo dao động, li độ, chu kỳ và biên độ", "dao_dong_dieu_hoa"],
    ["Vật lí", 10, "Chuyển động thẳng biến đổi đều", "Vận tốc, gia tốc và đồ thị v-t của vật", "chuyen_dong_thang"],
    ["Vật lí", 8, "Hợp lực", "Tổng hợp lực của hai lực tác dụng lên vật, đơn vị Newton", "tong_hop_luc"],
    ["Hoá học", 8, "Cân bằng phương trình", "Cân bằng phương trình hoá học: hệ số của chất tham gia và sản phẩm", "can_bang_phuong_trinh_hoa_hoc"],
    ["Ngữ văn", 7, "Phân tích câu thơ", "Phân tích hình ảnh trong câu thơ và biện pháp tu từ của tác giả", "trich_dan_van_ban"],
    ["Lịch sử", 12, "Cách mạng tháng Tám", "Các sự kiện năm 1945 theo dòng thời gian lịch sử", "dong_thoi_gian"],
    ["Tiếng Anh", 9, "Từ vựng chủ đề môi trường", "Học từ vựng mới: nghĩa là gì, cách phát âm và ví dụ", "tu_vung"],
  ];
  it.each(cases)("bộ lọc: %s lớp %i — %s → %s", (subject, grade, title, speech, want) => {
    const ids = prefilter({ subject, grade, title, slideText: "", speech }).map((c) => c.entry.id);
    expect(ids.length).toBeLessThanOrEqual(6);
    expect(ids).toContain(want);
    expect(ids[0]).toBe(want); // mẫu đúng đứng đầu
  });

  it("bộ lọc: phạt lệch môn; cảnh trơn không trúng từ khoá thì không có ứng viên; nhận diện tên môn", () => {
    expect(prefilter({ subject: "Ngữ văn", grade: 8, title: "Mở bài", slideText: "", speech: "Hôm nay chúng ta cùng tìm hiểu." })).toEqual([]);
    const ids = prefilter({ subject: "Lịch sử", grade: 9, title: "Đồ thị", slideText: "", speech: "đồ thị hàm số parabol" }).map((c) => c.entry.id);
    expect(ids.indexOf("do_thi_ham_so")).toBeGreaterThanOrEqual(0);
    expect(subjectKey("Vật lý")).toBe("ly");
    expect(subjectKey("Tiếng Anh")).toBe("anh");
    expect(subjectKey("Lịch sử")).toBe("su");
    expect(subjectKey("")).toBe("");
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

describe("HTML HyperFrames — các mẫu mới (snapshot)", () => {
  const hf = ["dong_thoi_gian", "so_do_venn", "bieu_do_so_lieu", "the_ghi_nho", "trich_dan_van_ban", "tu_vung", "can_bang_phuong_trinh_hoa_hoc", "cay_xac_suat"];
  it.each(hf)("%s: dựng đủ, đúng thời lượng, escape chữ AI, khớp snapshot", (id) => {
    const c = CATALOG.find((x) => x.id === id);
    if (!c) throw new Error(id);
    const spec = AnimSpec.parse({ template: id, thoiLuong: 10, tieuDe: "Tiêu đề <b>x</b>", params: JSON.parse(JSON.stringify(c.viDu)) });
    const html = hyperframesHtml(spec as never);
    expect(html).toContain('data-duration="10"');
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toMatch(/<script>(?!\s*const tl)[^]*alert/);
    expect(html).toMatchSnapshot();
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

  it.each(["vecto", "hinh_khong_gian_xoay", "bieu_do_so_lieu", "cay_xac_suat"])("mẫu mới %s dựng thật (thấp) đúng thời lượng", { timeout: 400_000 }, async (id) => {
    const c = CATALOG.find((x) => x.id === id);
    const r = await real().render({ template: id, thoiLuong: 5, params: c?.viDu });
    expect(Math.abs(probe(r.file) - 5)).toBeLessThan(0.3);
  });

  it("HyperFrames: sơ đồ quy trình 3 giây → mp4 đúng thời lượng", { timeout: 300_000 }, async () => {
    const r = await real().render({ template: "so_do_quy_trinh", thoiLuong: 3, params: { cacBuoc: [{ nhan: "Đọc đề" }, { nhan: "Giải" }] } });
    expect(Math.abs(probe(r.file) - 3)).toBeLessThan(0.3);
  });
});
