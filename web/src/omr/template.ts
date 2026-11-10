// web/src/omr/template.ts
/** Phiếu trả lời trắc nghiệm theo CV 7991 (A4): MỘT nguồn dữ liệu sinh cả bản in (sheetSvg.ts) lẫn
 *  toạ độ ô để quét (decode.ts). Đơn vị: mm trên khổ A4 210×297. Ý tưởng bố cục & mốc góc tham khảo
 *  OMRChecker (MIT) và LazyOMR (MIT), xem THIRD_PARTY_LICENSES.md. */
export type Entry = { no: number; section: string; sectionNo: number };
export type Pt = { x: number; y: number };
export type GroupKind = "id" | "mcq" | "tf" | "digit";
export type Group = {
  id: string;
  kind: GroupKind;
  /** Số câu (id: 0). */
  no: number;
  /** tf: ý a–d (0–3); digit: cột 0–3; id: cột 0–5. */
  sub: number;
  page: number;
  labels: string[];
  pts: Pt[];
  /** Hộp bao [x0,y0,x1,y1] để cắt ảnh duyệt. */
  box: [number, number, number, number];
};
export type Text = { page: number; x: number; y: number; s: string; size: number; bold?: boolean; anchor?: "start" | "middle" | "end" };
export type Template = {
  w: number;
  h: number;
  /** Bán kính ô tròn (mm). */
  r: number;
  pages: number;
  markerSize: number;
  /** Tâm 4 mốc góc theo thứ tự trên-trái, trên-phải, dưới-phải, dưới-trái. */
  markers: Pt[];
  qr: { x: number; y: number; size: number };
  groups: Group[];
  texts: Text[];
};

export const PAGE_W = 210;
export const PAGE_H = 297;
export const BUBBLE_R = 1.9;
export const ID_DIGITS = 6;
const MARKER = 8;
const LEFT = 14;
const CELL_W = 46;
const BOTTOM = 274;
const P1_TOP = 84;
const PN_TOP = 36;
const ROW = 5.4;

export function qrPayload(examId: string, code: string, page: number): string {
  return `EDUVN|${examId}|${code}|${page + 1}`;
}
export function parseQr(raw: string): { examId: string; code: string; page: number } | null {
  const p = raw.split("|");
  const page = Number(p[3]);
  if (p.length !== 4 || p[0] !== "EDUVN" || !p[1] || !p[2] || !Number.isInteger(page) || page < 1) return null;
  return { examId: p[1], code: p[2], page: page - 1 };
}

const box = (pts: Pt[], pad: number): [number, number, number, number] => [
  Math.min(...pts.map((p) => p.x)) - pad,
  Math.min(...pts.map((p) => p.y)) - pad,
  Math.max(...pts.map((p) => p.x)) + pad,
  Math.max(...pts.map((p) => p.y)) + pad,
];

export function buildTemplate(entries: readonly Entry[], opts: { title: string; code: string }): Template {
  const groups: Group[] = [];
  const texts: Text[] = [];
  const mk = (page: number, kind: GroupKind, id: string, no: number, sub: number, labels: string[], pts: Pt[]) =>
    groups.push({ id, kind, no, sub, page, labels, pts, box: box(pts, BUBBLE_R + 1) });

  // Trang 1: tiêu đề, họ tên, SBD
  const t0 = (s: string, x: number, y: number, size: number, extra: Partial<Text> = {}) => texts.push({ page: 0, x, y, s, size, ...extra });
  t0(opts.title.slice(0, 48), 16, 25, 4.6, { bold: true });
  t0(`Mã đề: ${opts.code}`, 16, 36, 6, { bold: true });
  t0("Họ và tên: ................................................", 16, 48, 3.4);
  t0("Lớp: ......................   Ngày: ....../....../......", 16, 57, 3.4);
  t0("Tô kín ô tròn bằng bút chì đen 2B; không gạch xoá, không viết ngoài ô.", 16, 67, 2.6);
  t0("Phần tự luận (nếu có) làm vào giấy riêng.", 16, 71, 2.6);
  t0("SỐ BÁO DANH", 133, 31, 2.8, { bold: true, anchor: "middle" });
  for (let c = 0; c < ID_DIGITS; c++) {
    const pts = Array.from({ length: 10 }, (_, k) => ({ x: 113 + c * 8.5, y: 36 + k * 4.6 }));
    mk(0, "id", `id.${c}`, 0, c, Array.from({ length: 10 }, (_, k) => String(k)), pts);
  }

  // Bố cục dọc: đặt từng khối, hết chỗ thì sang trang mới.
  let page = 0;
  let y = P1_TOP;
  const place = (h: number): number => {
    if (y + h > BOTTOM) {
      page++;
      y = PN_TOP;
    }
    const at = y;
    y += h + 3;
    return at;
  };
  const title = (s: string, at: number) => texts.push({ page, x: LEFT, y: at + 3.6, s, size: 3.4, bold: true });
  const section = (s: string) => entries.filter((e) => e.section === s).sort((a, b) => a.sectionNo - b.sectionNo);

  const mcq = section("mcq");
  for (let b = 0; b < mcq.length; b += 40) {
    const band = mcq.slice(b, b + 40);
    const rows = Math.ceil(band.length / 4);
    const at = place((b === 0 ? 7 : 0) + rows * ROW);
    const y0 = at + (b === 0 ? 7 : 0);
    if (b === 0) title("PHẦN I. Trắc nghiệm nhiều lựa chọn", at);
    band.forEach((e, i) => {
      const x0 = LEFT + Math.floor(i / rows) * CELL_W;
      const yy = y0 + (i % rows) * ROW + ROW / 2;
      texts.push({ page, x: x0 + 6, y: yy + 1.2, s: String(e.no), size: 3.4, bold: true, anchor: "end" });
      mk(page, "mcq", `m${e.no}`, e.no, 0, ["A", "B", "C", "D"], [0, 1, 2, 3].map((k) => ({ x: x0 + 11 + k * 7.5, y: yy })));
    });
  }

  const tf = section("true_false");
  for (let b = 0; b < tf.length; b += 4) {
    const rowQs = tf.slice(b, b + 4);
    const at = place((b === 0 ? 7 : 0) + 30);
    const y0 = at + (b === 0 ? 7 : 0);
    if (b === 0) title("PHẦN II. Trắc nghiệm đúng/sai (mỗi câu 4 ý a, b, c, d)", at);
    rowQs.forEach((e, i) => {
      const x0 = LEFT + i * CELL_W;
      texts.push({ page, x: x0, y: y0 + 3, s: `Câu ${e.no}`, size: 3.2, bold: true });
      texts.push({ page, x: x0 + 22, y: y0 + 3, s: "Đ", size: 2.8, bold: true, anchor: "middle" });
      texts.push({ page, x: x0 + 31, y: y0 + 3, s: "S", size: 2.8, bold: true, anchor: "middle" });
      for (let k = 0; k < 4; k++) {
        const yy = y0 + 8 + k * ROW;
        texts.push({ page, x: x0 + 12, y: yy + 1.1, s: `${"abcd"[k]})`, size: 3, anchor: "end" });
        mk(page, "tf", `t${e.no}.${k}`, e.no, k, ["Đ", "S"], [{ x: x0 + 22, y: yy }, { x: x0 + 31, y: yy }]);
      }
    });
  }

  const sa = section("short_answer");
  for (let b = 0; b < sa.length; b += 5) {
    const rowQs = sa.slice(b, b + 5);
    const at = place((b === 0 ? 7 : 0) + 53);
    const y0 = at + (b === 0 ? 7 : 0);
    if (b === 0) title("PHẦN III. Trả lời ngắn (tô dấu - ở cột 1, dấu phẩy , ở các cột sau, rồi các chữ số)", at);
    rowQs.forEach((e, i) => {
      const x0 = LEFT + i * 36.4;
      texts.push({ page, x: x0, y: y0 + 3, s: `Câu ${e.no}`, size: 3.2, bold: true });
      for (let c = 0; c < 4; c++) {
        const x = x0 + 5 + c * 7;
        const pts = Array.from({ length: 11 }, (_, k) => ({ x, y: y0 + 8 + k * 4.6 }));
        mk(page, "digit", `d${e.no}.${c}`, e.no, c, [c === 0 ? "-" : ",", ...Array.from({ length: 10 }, (_, k) => String(k))], pts);
      }
    });
  }

  const pages = page + 1;
  if (pages > 1) for (let p = 1; p < pages; p++) texts.push({ page: p, x: LEFT, y: 25, s: `${opts.title.slice(0, 36)} — Mã đề ${opts.code}`, size: 3.6, bold: true });
  for (let p = 0; p < pages; p++) texts.push({ page: p, x: 178, y: 54, s: `Trang ${p + 1}/${pages}`, size: 2.8, anchor: "middle" });

  return {
    w: PAGE_W,
    h: PAGE_H,
    r: BUBBLE_R,
    pages,
    markerSize: MARKER,
    markers: [{ x: 12, y: 12 }, { x: 198, y: 12 }, { x: 198, y: 285 }, { x: 12, y: 285 }],
    qr: { x: 163, y: 18, size: 30 },
    groups,
    texts,
  };
}
