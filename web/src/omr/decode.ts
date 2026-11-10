// web/src/omr/decode.ts
/** Quét phiếu bằng OpenCV.js: tìm 4 mốc góc → nắn phối cảnh → khử bóng → đọc độ đậm từng ô →
 *  giải mã phần I/II/III + SBD. Hướng làm theo OMRChecker (MIT: CropOnMarkers + ngưỡng so tương đối
 *  trong nhóm) và sjreeves/bubble-sheet-omr (MIT: chạy trọn trong trình duyệt). */
import jsQR from "jsqr";
import { type Group, type Template, buildTemplate, parseQr } from "./template";

// OpenCV.js không có type gọn → dùng any ở ranh giới này.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Cv = any;

export const PX_MM = 6;
export type Img = { data: Uint8ClampedArray; width: number; height: number };
export type Warped = {
  /** Ảnh xám đã nắn + khử bóng, PX_MM px/mm. */
  gray: Uint8Array;
  w: number;
  h: number;
  qr: { examId: string; code: string; page: number } | null;
  ms: number;
};

let cvPromise: Promise<{ cv: Cv }> | null = null;
/** Tải OpenCV.js lười (≈13 MB, chỉ khi vào trang quét). */
/** Cho môi trường test Node đã nạp sẵn OpenCV bằng require. */
export function setCv(cv: Cv): void {
  cvPromise = Promise.resolve({ cv });
}
export async function loadCv(): Promise<Cv> {
  cvPromise ??= import("./cvLoader").then((m) => m.readyCv());
  return (await cvPromise).cv;
}

type P = { x: number; y: number };

function findMarkers(cv: Cv, gray: Cv): P[] {
  const maxDim = Math.max(gray.cols, gray.rows);
  const k = Math.min(1, 1200 / maxDim);
  const small = new cv.Mat();
  const blur = new cv.Mat();
  const bin = new cv.Mat();
  const kern = cv.Mat.ones(3, 3, cv.CV_8U);
  const contours = new cv.MatVector();
  const hier = new cv.Mat();
  try {
    cv.resize(gray, small, new cv.Size(Math.round(gray.cols * k), Math.round(gray.rows * k)), 0, 0, cv.INTER_AREA);
    cv.GaussianBlur(small, blur, new cv.Size(5, 5), 0);
    const block = (Math.round(Math.max(small.cols, small.rows) * 0.085) | 1) + 0;
    cv.adaptiveThreshold(blur, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, block, 18);
    cv.morphologyEx(bin, bin, cv.MORPH_OPEN, kern);
    cv.findContours(bin, contours, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    const dim = Math.max(small.cols, small.rows);
    const cands: (P & { area: number })[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const area = cv.contourArea(c);
      if (area >= (0.012 * dim) ** 2 && area <= (0.06 * dim) ** 2) {
        const r = cv.minAreaRect(c);
        const ratio = r.size.width / Math.max(1e-6, r.size.height);
        const fill = area / Math.max(1e-6, r.size.width * r.size.height);
        if (ratio > 0.7 && ratio < 1.43 && fill > 0.8) {
          const m = cv.moments(c);
          cands.push({ x: m.m10 / m.m00 / k, y: m.m01 / m.m00 / k, area });
        }
      }
      c.delete();
    }
    if (cands.length < 4) throw new Error("Không thấy đủ 4 mốc góc — chụp rõ cả tờ phiếu, đủ sáng.");
    const by = (f: (p: P) => number) => cands.reduce((a, b) => (f(b) < f(a) ? b : a));
    const pts = [by((p) => p.x + p.y), by((p) => -(p.x - p.y)), by((p) => -(p.x + p.y)), by((p) => p.x - p.y)];
    if (new Set(pts).size < 4) throw new Error("Không xác định được 4 góc phiếu.");
    const areas = pts.map((p) => (p as P & { area: number }).area).sort((a, b) => a - b);
    if (areas[3]! > areas[0]! * 3) throw new Error("Các mốc góc không đều nhau — chụp lại, tránh vật tối ở mép ảnh.");
    return pts.map(({ x, y }) => ({ x, y }));
  } finally {
    for (const m of [small, blur, bin, kern, hier]) m.delete();
    contours.delete();
  }
}

/** Khử bóng: chia cho nền ước lượng bằng closing trên bản thu nhỏ. */
function flatten(cv: Cv, g: Cv): void {
  const small = new cv.Mat();
  const bg = new cv.Mat();
  const bgFull = new cv.Mat();
  const kern = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(25, 25));
  try {
    cv.resize(g, small, new cv.Size(g.cols >> 2, g.rows >> 2), 0, 0, cv.INTER_AREA);
    cv.morphologyEx(small, bg, cv.MORPH_CLOSE, kern);
    cv.GaussianBlur(bg, bg, new cv.Size(9, 9), 0);
    cv.resize(bg, bgFull, new cv.Size(g.cols, g.rows), 0, 0, cv.INTER_LINEAR);
    cv.divide(g, bgFull, g, 255);
  } finally {
    for (const m of [small, bg, bgFull, kern]) m.delete();
  }
}

function warpWith(cv: Cv, gray: Cv, corners: P[], t: Template): Uint8Array {
  const src = cv.matFromArray(4, 1, cv.CV_32FC2, corners.flatMap((p) => [p.x, p.y]));
  const dst = cv.matFromArray(4, 1, cv.CV_32FC2, t.markers.flatMap((p) => [p.x * PX_MM, p.y * PX_MM]));
  const M = cv.getPerspectiveTransform(src, dst);
  const out = new cv.Mat();
  try {
    cv.warpPerspective(gray, out, M, new cv.Size(Math.round(t.w * PX_MM), Math.round(t.h * PX_MM)), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    flatten(cv, out);
    return new Uint8Array(out.data);
  } finally {
    for (const m of [src, dst, M, out]) m.delete();
  }
}

function readQr(gray: Uint8Array, w: number, t: Template): ReturnType<typeof parseQr> {
  const m = 3;
  const x0 = Math.round((t.qr.x - m) * PX_MM);
  const y0 = Math.round((t.qr.y - m) * PX_MM);
  const cw = Math.round((t.qr.size + 2 * m) * PX_MM);
  const rgba = new Uint8ClampedArray(cw * cw * 4);
  for (let y = 0; y < cw; y++) {
    for (let x = 0; x < cw; x++) {
      const v = gray[(y0 + y) * w + x0 + x] ?? 255;
      const o = (y * cw + x) * 4;
      rgba[o] = rgba[o + 1] = rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
  }
  const r = jsQR(rgba, cw, cw, { inversionAttempts: "dontInvert" });
  return r ? parseQr(r.data) : null;
}

/** Tìm mốc, nắn phối cảnh, đọc QR (thử 4 hướng xoay nếu cần). */
const GEOMETRY = buildTemplate([], { title: "", code: "" });
export function warpPage(cv: Cv, img: Img, t: Template = GEOMETRY): Warped {
  const t0 = performance.now();
  const rgba = cv.matFromArray(img.height, img.width, cv.CV_8UC4, img.data as unknown as number[]);
  const full = new cv.Mat();
  const g = new cv.Mat();
  try {
    cv.cvtColor(rgba, full, cv.COLOR_RGBA2GRAY);
    const k = Math.min(1, 2400 / Math.max(img.width, img.height));
    if (k < 1) cv.resize(full, g, new cv.Size(Math.round(img.width * k), Math.round(img.height * k)), 0, 0, cv.INTER_AREA);
    else full.copyTo(g);
    const corners = findMarkers(cv, g);
    const w = Math.round(t.w * PX_MM);
    const h = Math.round(t.h * PX_MM);
    let first: Uint8Array | null = null;
    for (const rot of [0, 2, 1, 3]) {
      const c = corners.map((_, i) => corners[(i + rot) % 4]!);
      const gray = warpWith(cv, g, c, t);
      first ??= gray;
      const qr = readQr(gray, w, t);
      if (qr) return { gray, w, h, qr, ms: performance.now() - t0 };
    }
    return { gray: first!, w, h, qr: null, ms: performance.now() - t0 };
  } finally {
    for (const m of [rgba, full, g]) m.delete();
  }
}

// ---------- Đọc ô ----------
export type GroupRead = {
  id: string;
  /** Tỉ lệ điểm ảnh "mực" trong từng ô 0..1. */
  fills: number[];
  /** Ô được chọn (-1 = bỏ trống). */
  pick: number;
  state: "ok" | "empty" | "doubt";
  reason?: string;
};

const INK = 166; // 0,65 × 255 sau khi khử bóng
const MARKED = 0.5;
const FAINT = 0.25;

export function fillOf(w: Warped, x: number, y: number, rPx: number): number {
  let ink = 0;
  let n = 0;
  const r2 = rPx * rPx;
  for (let yy = Math.floor(y - rPx); yy <= Math.ceil(y + rPx); yy++) {
    for (let xx = Math.floor(x - rPx); xx <= Math.ceil(x + rPx); xx++) {
      if ((xx - x) ** 2 + (yy - y) ** 2 > r2 || xx < 0 || yy < 0 || xx >= w.w || yy >= w.h) continue;
      n++;
      if (w.gray[yy * w.w + xx]! < INK) ink++;
    }
  }
  return n ? ink / n : 0;
}

/** Quy tắc nhóm (so tương đối trong nhóm): rỗng / đậm rõ / mờ / hai ô / tẩy. */
export function judge(id: string, fills: number[]): GroupRead {
  const order = fills.map((f, i) => [f, i] as const).sort((a, b) => b[0] - a[0]);
  const [f1, i1] = order[0]!;
  const f2 = order[1]?.[0] ?? 0;
  if (f1 < FAINT) return { id, fills, pick: -1, state: "empty" };
  if (f1 < MARKED) return { id, fills, pick: i1, state: "doubt", reason: "tô mờ" };
  if (f2 >= MARKED) return { id, fills, pick: i1, state: "doubt", reason: "tô hai ô" };
  if (f2 >= 0.3 && f2 > 0.5 * f1) return { id, fills, pick: i1, state: "doubt", reason: "có dấu tẩy" };
  return { id, fills, pick: i1, state: "ok" };
}

export function readGroups(w: Warped, t: Template, page: number): GroupRead[] {
  const rPx = t.r * 0.65 * PX_MM;
  return t.groups
    .filter((g) => g.page === page)
    .map((g) => judge(g.id, g.pts.map((p) => fillOf(w, p.x * PX_MM, p.y * PX_MM, rPx))));
}

// ---------- Ghép đáp án ----------
export type Resp = number | (boolean | null)[] | string;
export type Assembled = { sbd: string; responses: Record<number, Resp> };

/** `pick(g)` trả ô chọn của nhóm (đã gồm phần GV sửa); -1 = trống. */
export function assemble(t: Template, pick: (g: Group) => number): Assembled {
  const responses: Record<number, Resp> = {};
  const sbd: string[] = [];
  const digits = new Map<number, string[]>();
  const tfs = new Map<number, (boolean | null)[]>();
  for (const g of t.groups) {
    const p = pick(g);
    if (g.kind === "id") sbd[g.sub] = p < 0 ? "?" : String(p);
    else if (g.kind === "mcq") {
      if (p >= 0) responses[g.no] = p;
    } else if (g.kind === "tf") {
      const a = tfs.get(g.no) ?? [null, null, null, null];
      a[g.sub] = p < 0 ? null : p === 0;
      tfs.set(g.no, a);
    } else {
      const a = digits.get(g.no) ?? ["", "", "", ""];
      a[g.sub] = p < 0 ? "" : p === 0 ? g.labels[0]! : String(p - 1);
      digits.set(g.no, a);
    }
  }
  for (const [no, a] of tfs) if (a.some((v) => v !== null)) responses[no] = a;
  for (const [no, a] of digits) if (a.join("")) responses[no] = a.join("");
  const sbdStr = sbd.join("");
  return { sbd: sbdStr.replace(/\?/g, "") === "" ? "" : sbdStr, responses };
}
