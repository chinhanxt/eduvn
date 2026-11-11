/** Đặc tả hoạt hình toán: AI chỉ chọn MẪU + tham số JSON. Mọi chuỗi đều qua kiểm ở đây; không có mã nào của AI được chạy. */
import { z } from "zod";
import { type Ast, parseExpr } from "./expr";

export const TEMPLATES = {
  do_thi_ham_so: { engine: "manim", ten: "Đồ thị hàm số" },
  bien_doi_cong_thuc: { engine: "manim", ten: "Biến đổi công thức" },
  hinh_hoc_dien_tich: { engine: "manim", ten: "Hình học diện tích (a+b)²" },
  truc_so: { engine: "manim", ten: "Trục số" },
  dien_giai_tung_buoc: { engine: "hyperframes", ten: "Diễn giải từng bước" },
  so_do_quy_trinh: { engine: "hyperframes", ten: "Sơ đồ quy trình" },
  so_sanh_bang: { engine: "hyperframes", ten: "So sánh dạng bảng" },
  vong_tron_luong_giac: { engine: "manim", ten: "Vòng tròn lượng giác" },
  do_thi_luong_giac: { engine: "manim", ten: "Đồ thị hàm lượng giác" },
  vecto: { engine: "manim", ten: "Vectơ" },
  hinh_khong_gian_xoay: { engine: "manim", ten: "Hình không gian xoay" },
  dao_ham_tiep_tuyen: { engine: "manim", ten: "Đạo hàm và tiếp tuyến" },
  tich_phan_dien_tich: { engine: "manim", ten: "Tích phân và diện tích" },
  giao_diem_he_pt: { engine: "manim", ten: "Giao điểm = nghiệm hệ" },
  phep_bien_hinh: { engine: "manim", ten: "Phép biến hình" },
  day_so: { engine: "manim", ten: "Dãy số" },
  dao_dong_dieu_hoa: { engine: "manim", ten: "Dao động điều hoà" },
  chuyen_dong_thang: { engine: "manim", ten: "Chuyển động thẳng" },
  song_co: { engine: "manim", ten: "Sóng cơ" },
  tong_hop_luc: { engine: "manim", ten: "Tổng hợp lực" },
  dong_thoi_gian: { engine: "hyperframes", ten: "Dòng thời gian" },
  so_do_venn: { engine: "hyperframes", ten: "Sơ đồ Venn" },
  bieu_do_so_lieu: { engine: "hyperframes", ten: "Biểu đồ số liệu" },
  the_ghi_nho: { engine: "hyperframes", ten: "Thẻ ghi nhớ" },
  trich_dan_van_ban: { engine: "hyperframes", ten: "Trích dẫn văn bản" },
  tu_vung: { engine: "hyperframes", ten: "Từ vựng" },
  can_bang_phuong_trinh_hoa_hoc: { engine: "hyperframes", ten: "Cân bằng phương trình hoá học" },
  cay_xac_suat: { engine: "hyperframes", ten: "Cây xác suất" },
} as const;
export type TemplateName = keyof typeof TEMPLATES;

/** LaTeX an toàn: chỉ ASCII, chỉ lệnh trong danh sách trắng (chặn \input, \write, \def, \usepackage…). */
const LATEX_OK = new Set(["frac", "dfrac", "sqrt", "cdot", "times", "div", "pm", "mp", "le", "leq", "ge", "geq", "ne", "neq", "approx", "sin", "cos", "tan", "cot", "log", "ln", "lim", "pi", "alpha", "beta", "gamma", "theta", "Delta", "delta", "sum", "infty", "to", "Rightarrow", "Leftrightarrow", "rightarrow", "left", "right", "quad", "qquad", "text", "mathbb", "in", "notin", "subset", "cup", "cap", "angle", "triangle", "circ", "overline", "vec", "prime", "ldots", "cdots"]);
export function safeLatex(s: string): boolean {
  if (!/^[\x20-\x7e]+$/.test(s) || s.length > 200) return false;
  if (/[%#~&$]/.test(s)) return false;
  for (const m of s.matchAll(/\\([A-Za-z]+)/g)) if (!LATEX_OK.has(m[1] as string)) return false;
  return !/\\[^A-Za-z\\{}()[\],;:!| .^_]/.test(s);
}
const Latex = z.string().trim().min(1).refine(safeLatex, "LaTeX không hợp lệ hoặc có lệnh không được phép");
const Short = (n: number) => z.string().trim().min(1).max(n);
const Num = (lo: number, hi: number) => z.number().finite().min(lo).max(hi);

const Expr = z.string().trim().min(1).max(120).transform((s, ctx): Ast => {
  try {
    return parseExpr(s);
  } catch (e) {
    ctx.addIssue({ code: "custom", message: (e as Error).message });
    return z.NEVER;
  }
});

const Vec = (x: number, y: number) => z.tuple([Num(-x, x), Num(-y, y)]);
const Bounds = { xMin: Num(-50, 0).default(-5), xMax: Num(1, 50).default(5), yMin: Num(-100, 0).default(-5), yMax: Num(1, 100).default(5) };
/** Công thức hoá học đơn giản: chữ cái, số, ngoặc (vd H2O, Ca(OH)2). */
const Formula = z.string().trim().regex(/^[A-Za-z0-9()]{1,20}$/, "Công thức hoá học chỉ gồm chữ, số, ngoặc");
const Base = { thoiLuong: Num(3, 60), tieuDe: Short(80).optional() };

export const AnimSpec = z.discriminatedUnion("template", [
  z.object({
    template: z.literal("do_thi_ham_so"),
    ...Base,
    params: z.object({
      bieuThuc: Expr,
      thamSo: z.object({ tu: Num(-20, 20), den: Num(-20, 20) }).optional(),
      xMin: Num(-50, 0).default(-5),
      xMax: Num(1, 50).default(5),
      yMin: Num(-100, 0).default(-5),
      yMax: Num(1, 100).default(5),
      diemDacBiet: z.array(z.object({ x: Num(-50, 50), nhan: Short(20).optional() })).max(5).default([]),
    }),
  }),
  z.object({
    template: z.literal("bien_doi_cong_thuc"),
    ...Base,
    params: z.object({
      cacBuoc: z.array(z.object({ latex: Latex, ghiChu: Short(60).optional() })).min(2).max(6),
      toMau: z.array(z.string().min(1).max(30).refine(safeLatex)).max(4).default([]),
    }),
  }),
  z.object({
    template: z.literal("hinh_hoc_dien_tich"),
    ...Base,
    params: z.object({ a: Num(0.5, 5).default(2), b: Num(0.5, 5).default(1) }).default({ a: 2, b: 1 }),
  }),
  z.object({
    template: z.literal("truc_so"),
    ...Base,
    params: z.object({
      khoang: z.object({ min: z.number().int().min(-50), max: z.number().int().max(50) }).refine((k) => k.max > k.min && k.max - k.min <= 24, "Khoảng trục số phải dài 1–24 đơn vị"),
      cacDiem: z.array(z.object({ giaTri: Num(-50, 50), nhan: Short(20).optional() })).max(6).default([]),
      cacBuocNhay: z.array(z.object({ tu: Num(-50, 50), den: Num(-50, 50), nhan: Short(20).optional() })).max(4).default([]),
    }),
  }),
  z.object({
    template: z.literal("dien_giai_tung_buoc"),
    ...Base,
    params: z.object({ cacDong: z.array(Short(200)).min(1).max(8) }),
  }),
  z.object({
    template: z.literal("so_do_quy_trinh"),
    ...Base,
    params: z.object({ cacBuoc: z.array(z.object({ nhan: Short(40), moTa: Short(80).optional() })).min(2).max(6) }),
  }),
  z.object({
    template: z.literal("so_sanh_bang"),
    ...Base,
    params: z.object({ cotTieuDe: z.array(Short(40)).min(2).max(4), cacHang: z.array(z.array(Short(60)).min(2).max(4)).min(1).max(6) }),
  }),

  // ---- Manim: toán ----
  z.object({ template: z.literal("vong_tron_luong_giac"), ...Base, params: z.object({ gocDo: Num(0, 360).default(60), hienThi: z.array(z.enum(["sin", "cos", "tan"])).min(1).max(3).default(["sin", "cos"]), gocDacBiet: z.boolean().default(true) }).default({ gocDo: 60, hienThi: ["sin", "cos"], gocDacBiet: true }) }),
  z.object({ template: z.literal("do_thi_luong_giac"), ...Base, params: z.object({ ham: z.enum(["sin", "cos", "tan"]), bienDo: Num(0.5, 3).default(1), chuKy: Num(0.5, 3).default(1), phaDauDo: Num(-180, 180).default(0), tuVongTron: z.boolean().default(false) }) }),
  z.object({ template: z.literal("vecto"), ...Base, params: z.object({ loai: z.enum(["tong_tam_giac", "tong_hbh", "nhan_so", "thanh_phan", "hinh_chieu"]), a: Vec(5, 3.5).default([3, 1]), b: Vec(5, 3.5).default([1, 2]), k: Num(-3, 3).default(2) }) }),
  z.object({ template: z.literal("hinh_khong_gian_xoay"), ...Base, params: z.object({ hinh: z.enum(["cube", "cuboid", "pyramid", "prism", "cone", "cylinder", "sphere"]), kichThuoc: z.object({ a: Num(0.5, 4).default(2), b: Num(0.5, 4).default(2), c: Num(0.5, 4).default(2) }).default({ a: 2, b: 2, c: 2 }), nhanDinh: z.boolean().default(true), chieuCao: z.boolean().default(true) }) }),
  z.object({ template: z.literal("dao_ham_tiep_tuyen"), ...Base, params: z.object({ bieuThuc: Expr, x0: Num(-50, 50).default(1), ...Bounds }) }),
  z.object({ template: z.literal("tich_phan_dien_tich"), ...Base, params: z.object({ bieuThuc: Expr, a: Num(-50, 50), b: Num(-50, 50), soHinh: z.number().int().min(8).max(60).default(24), ...Bounds }) }),
  z.object({ template: z.literal("giao_diem_he_pt"), ...Base, params: z.object({ f: Expr, g: Expr, ...Bounds }) }),
  z.object({ template: z.literal("phep_bien_hinh"), ...Base, params: z.object({ phep: z.enum(["tinh_tien", "quay", "doi_xung_truc", "vi_tu"]), dinh: z.array(Vec(5, 3.5)).min(3).max(5), tinhTien: Vec(6, 4).optional(), gocDo: Num(-360, 360).optional(), tam: Vec(5, 3.5).optional(), truc: z.enum(["Ox", "Oy", "y=x"]).optional(), k: Num(-3, 3).optional() }) }),
  z.object({ template: z.literal("day_so"), ...Base, params: z.object({ loai: z.enum(["cap_so_cong", "cap_so_nhan"]), u1: Num(-50, 50), d: Num(-20, 20).optional(), q: Num(-3, 3).optional(), n: z.number().int().min(3).max(8) }) }),
  // ---- Manim: vật lí ----
  z.object({ template: z.literal("dao_dong_dieu_hoa"), ...Base, params: z.object({ vat: z.enum(["lo_xo", "con_lac"]).default("lo_xo"), bienDo: Num(0.5, 3).default(1.5), chuKy: Num(1, 4).default(2), soChuKy: z.number().int().min(1).max(4).default(2) }).default({ vat: "lo_xo", bienDo: 1.5, chuKy: 2, soChuKy: 2 }) }),
  z.object({ template: z.literal("chuyen_dong_thang"), ...Base, params: z.object({ x0: Num(-100, 100).default(0), v0: Num(-30, 30).default(2), a: Num(-10, 10).default(1), tMax: Num(2, 15).default(6) }).default({ x0: 0, v0: 2, a: 1, tMax: 6 }) }),
  z.object({ template: z.literal("song_co"), ...Base, params: z.object({ buocSong: Num(0.5, 3).default(2), bienDo: Num(0.3, 1.5).default(1) }).default({ buocSong: 2, bienDo: 1 }) }),
  z.object({ template: z.literal("tong_hop_luc"), ...Base, params: z.object({ cacLuc: z.array(z.object({ doLon: Num(0.5, 10), gocDo: Num(0, 360), nhan: Short(12).optional() })).min(2).max(4) }) }),
  // ---- HyperFrames: các môn khác ----
  z.object({ template: z.literal("dong_thoi_gian"), ...Base, params: z.object({ cacMoc: z.array(z.object({ moc: Short(12), nhan: Short(40), moTa: Short(80).optional() })).min(2).max(7) }) }),
  z.object({ template: z.literal("so_do_venn"), ...Base, params: z.object({ tenA: Short(24), tenB: Short(24), tenGiao: Short(24).optional(), chuaA: z.array(Short(24)).max(4).default([]), chuaB: z.array(Short(24)).max(4).default([]), chuaGiao: z.array(Short(24)).max(4).default([]), xacSuat: z.object({ A: Num(0, 1).optional(), B: Num(0.001, 1), giao: Num(0, 1) }).optional() }) }),
  z.object({ template: z.literal("bieu_do_so_lieu"), ...Base, params: z.object({ kieu: z.enum(["cot", "duong"]).default("cot"), nhan: z.array(Short(16)).min(2).max(8), cacChuoi: z.array(z.object({ ten: Short(24), giaTri: z.array(Num(-1e6, 1e6)).min(2).max(8) })).min(1).max(3), donVi: Short(12).optional() }) }),
  z.object({ template: z.literal("the_ghi_nho"), ...Base, params: z.object({ cacThe: z.array(z.object({ matTruoc: Short(80), matSau: Short(140) })).min(1).max(4) }) }),
  z.object({ template: z.literal("trich_dan_van_ban"), ...Base, params: z.object({ vanBan: Short(400), tuKhoa: z.array(Short(40)).max(5).default([]), tacGia: Short(60).optional(), ghiChu: Short(160).optional() }) }),
  z.object({ template: z.literal("tu_vung"), ...Base, params: z.object({ tu: Short(40), phienAm: Short(40).optional(), loaiTu: Short(20).optional(), nghia: Short(100), viDu: Short(160).optional(), viDuDich: Short(160).optional() }) }),
  z.object({ template: z.literal("can_bang_phuong_trinh_hoa_hoc"), ...Base, params: z.object({ chatThamGia: z.array(Formula).min(1).max(3), sanPham: z.array(Formula).min(1).max(3), heSoCuoi: z.array(z.number().int().min(1).max(12)).min(2).max(6) }) }),
  z.object({ template: z.literal("cay_xac_suat"), ...Base, params: z.object({ goc: Short(20).optional(), cacNhanh: z.array(z.object({ ten: Short(20), xs: Num(0, 1), con: z.array(z.object({ ten: Short(20), xs: Num(0, 1) })).max(3).optional() })).min(2).max(3) }) }),
]).superRefine((s, ctx) => {
  if (s.template === "so_do_venn" && s.params.xacSuat) {
    const x = s.params.xacSuat;
    if (x.giao > x.B || (x.A !== undefined && (x.giao > x.A || x.A + x.B - x.giao > 1 + 1e-9))) ctx.addIssue({ code: "custom", message: "xacSuat không hợp lệ: P(A∩B) ≤ P(A), P(B) và P(A∪B) ≤ 1" });
  }
  if (s.template === "so_sanh_bang") {
    const n = s.params.cotTieuDe.length;
    if (s.params.cacHang.some((r) => r.length !== n)) ctx.addIssue({ code: "custom", message: "Mỗi hàng phải có đúng bằng số cột" });
  }
  if ("xMax" in s.params && "xMin" in s.params && (s.params.xMax as number) <= (s.params.xMin as number)) ctx.addIssue({ code: "custom", message: "xMax phải lớn hơn xMin" });
  if (s.template === "do_thi_luong_giac" && s.params.tuVongTron && s.params.ham !== "sin") ctx.addIssue({ code: "custom", message: "Chỉ hàm sin mới trải từ vòng tròn" });
  if (s.template === "tich_phan_dien_tich" && s.params.b <= s.params.a) ctx.addIssue({ code: "custom", message: "Cận trên b phải lớn hơn cận dưới a" });
  if (s.template === "day_so" && ((s.params.loai === "cap_so_cong" && s.params.d === undefined) || (s.params.loai === "cap_so_nhan" && s.params.q === undefined))) ctx.addIssue({ code: "custom", message: "Cấp số cộng cần d, cấp số nhân cần q" });
  if (s.template === "bieu_do_so_lieu" && s.params.cacChuoi.some((c) => c.giaTri.length !== s.params.nhan.length)) ctx.addIssue({ code: "custom", message: "Mỗi chuỗi số liệu phải có đúng bằng số nhãn" });
  if (s.template === "can_bang_phuong_trinh_hoa_hoc" && s.params.heSoCuoi.length !== s.params.chatThamGia.length + s.params.sanPham.length) ctx.addIssue({ code: "custom", message: "heSoCuoi phải có một hệ số cho mỗi chất" });
  if (s.template === "vecto") {
    const { a, b, k, loai } = s.params;
    const sum = loai === "nhan_so" ? [a[0] * k, a[1] * k] : [a[0] + b[0], a[1] + b[1]];
    if (loai !== "thanh_phan" && loai !== "hinh_chieu" && (Math.abs(sum[0] as number) > 6 || Math.abs(sum[1] as number) > 4)) ctx.addIssue({ code: "custom", message: "Vectơ kết quả vượt khung hình (|x|≤6, |y|≤4)" });
  }
  if ("yMax" in s.params && "yMin" in s.params && (s.params.yMax as number) <= (s.params.yMin as number)) ctx.addIssue({ code: "custom", message: "yMax phải lớn hơn yMin" });
});
export type AnimSpec = z.output<typeof AnimSpec>;

/** Dạng người dùng/AI gửi vào: chưa qua biến đổi (biểu thức còn là chuỗi). Lưu trong cảnh dạng này; AST chỉ sinh khi dựng. */
export const AnimInput = z.record(z.string(), z.unknown());

export const engineOf = (s: { template: TemplateName }) => TEMPLATES[s.template].engine;
