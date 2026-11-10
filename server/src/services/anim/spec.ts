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
]).superRefine((s, ctx) => {
  if (s.template === "so_sanh_bang") {
    const n = s.params.cotTieuDe.length;
    if (s.params.cacHang.some((r) => r.length !== n)) ctx.addIssue({ code: "custom", message: "Mỗi hàng phải có đúng bằng số cột" });
  }
  if (s.template === "do_thi_ham_so" && s.params.xMax <= s.params.xMin) ctx.addIssue({ code: "custom", message: "xMax phải lớn hơn xMin" });
  if (s.template === "do_thi_ham_so" && s.params.yMax <= s.params.yMin) ctx.addIssue({ code: "custom", message: "yMax phải lớn hơn yMin" });
});
export type AnimSpec = z.output<typeof AnimSpec>;

/** Dạng người dùng/AI gửi vào: chưa qua biến đổi (biểu thức còn là chuỗi). Lưu trong cảnh dạng này; AST chỉ sinh khi dựng. */
export const AnimInput = z.record(z.string(), z.unknown());

export const engineOf = (s: { template: TemplateName }) => TEMPLATES[s.template].engine;
