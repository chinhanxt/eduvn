// web/src/diagram/layout.ts — sắp xếp nút: sơ đồ tư duy (cây 2 bên) và lưu đồ (xếp tầng).
import type { DEdge, DiagramDoc, DNode, Shape } from "./types";

/** Đo kích thước chữ + công thức đã render thật (trình duyệt cài qua setLabelMeasurer); null → ước lượng. */
export type LabelMeasurer = (label: string) => { w: number; h: number } | null;
let measurer: LabelMeasurer | null = null;
export const setLabelMeasurer = (m: LabelMeasurer | null): void => {
  measurer = m;
};

/** Kích thước hình theo chữ: đo bằng render thật nếu có, không thì ước lượng theo ký tự (môi trường test). */
export function estimateSize(label: string, shape: Shape, image?: string): { w: number; h: number } {
  if (image) return { w: 168, h: 112 };
  let w = 0;
  let h = 0;
  const m = measurer?.(label);
  if (m) ({ w, h } = m);
  else
    for (const ln of label.split("\n")) {
      const tall = /\\d?frac|\\sqrt|\\sum|\\int/.test(ln);
      const plain = ln.replace(/\\[a-zA-Z]+/g, "x").replace(/[${}\\^_]/g, "");
      w = Math.max(w, plain.length * (ln.includes("$") ? 8 : 7.2));
      h += tall ? 36 : 22;
    }
  const f = shape === "diamond" ? [1.7, 1.9] : shape === "ellipse" ? [1.35, 1.5] : shape === "parallelogram" ? [1.3, 1] : shape === "cloud" ? [1.3, 1.4] : [1, 1];
  return { w: Math.round(Math.max(w * f[0]! + 28, 64)), h: Math.round(Math.max(h * f[1]! + 16, 38)) };
}

const rootOf = (doc: DiagramDoc): DNode | undefined => doc.nodes.find((n) => !n.parent) ?? doc.nodes[0];

/** Cây hai bên quanh gốc; không chồng nhau. Chỉ dùng cạnh cha-con (`parent`); nút mồ côi (ghi chú) giữ nguyên chỗ. */
export function layoutMind(doc: DiagramDoc): DiagramDoc {
  const root = rootOf(doc);
  if (!root) return doc;
  const kids = new Map<string, DNode[]>();
  for (const n of doc.nodes) if (n.parent && n.id !== root.id) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n]);
  const inTree = new Set<string>([root.id]);
  const GY = 14;
  const GAP = [64, 48, 38];
  const memo = new Map<string, number>();
  const sh = (n: DNode, seen = new Set<string>()): number => {
    const m = memo.get(n.id);
    if (m !== undefined) return m;
    seen.add(n.id);
    const k = (kids.get(n.id) ?? []).filter((c) => !seen.has(c.id));
    const v = k.length ? Math.max(n.h, k.reduce((a, c) => a + sh(c, seen), 0) + GY * (k.length - 1)) : n.h;
    memo.set(n.id, v);
    return v;
  };
  const pos = new Map<string, { x: number; y: number }>();
  pos.set(root.id, { x: -root.w / 2, y: -root.h / 2 });
  const place = (n: DNode, side: 1 | -1, edgeX: number, cy: number, depth: number) => {
    const x = side === 1 ? edgeX : edgeX - n.w;
    pos.set(n.id, { x, y: cy - n.h / 2 });
    inTree.add(n.id);
    const k = (kids.get(n.id) ?? []).filter((c) => !inTree.has(c.id));
    if (!k.length) return;
    const gap = GAP[Math.min(depth, GAP.length - 1)]!;
    const nx = side === 1 ? x + n.w + gap : x - gap;
    let y = cy - (k.reduce((a, c) => a + sh(c), 0) + GY * (k.length - 1)) / 2;
    for (const c of k) {
      const h = sh(c);
      place(c, side, nx, y + h / 2, depth + 1);
      y += h + GY;
    }
  };
  const l1 = kids.get(root.id) ?? [];
  const right: DNode[] = [];
  const left: DNode[] = [];
  let rh = 0;
  let lh = 0;
  for (const c of l1) {
    if (rh <= lh) {
      right.push(c);
      rh += sh(c);
    } else {
      left.push(c);
      lh += sh(c);
    }
  }
  for (const [side, group] of [[1, right], [-1, left]] as const) {
    const total = group.reduce((a, c) => a + sh(c), 0) + GY * 2 * Math.max(0, group.length - 1);
    let y = -total / 2;
    for (const c of group) {
      const h = sh(c);
      place(c, side, side === 1 ? root.w / 2 + GAP[0]! : -root.w / 2 - GAP[0]!, y + h / 2, 1);
      y += h + GY * 2;
    }
  }
  return { ...doc, nodes: doc.nodes.map((n) => (pos.has(n.id) ? { ...n, ...pos.get(n.id)! } : n)) };
}

const YES = /^(có|co|yes|đúng|true)$/i;
const NO = /^(không|khong|no|sai|false)$/i;
const prio = (e: DEdge) => (YES.test(e.label?.trim() ?? "") ? 0 : NO.test(e.label?.trim() ?? "") ? 2 : 1);

/** Lưu đồ xếp tầng: tầng theo đường dài nhất, thứ tự trong tầng theo trung bình vị trí cha/con (giảm cắt nhau),
 *  nhánh "Có" ngay dưới nút điều kiện, "Không" lệch sang phải; nút kết thúc (nhiều đường vào) nằm riêng tầng cuối, căn giữa. */
export function layoutFlow(doc: DiagramDoc): DiagramDoc {
  if (!doc.nodes.length) return doc;
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const outs = new Map<string, DEdge[]>();
  const hasIn = new Set<string>();
  for (const e of doc.edges) {
    if (!byId.has(e.from) || !byId.has(e.to) || e.from === e.to) continue;
    outs.set(e.from, [...(outs.get(e.from) ?? []), e]);
    hasIn.add(e.to);
  }
  for (const [k, v] of outs) outs.set(k, [...v].sort((x, y) => prio(x) - prio(y)));
  // DFS: thứ tự thăm, cạnh quay ngược, thứ tự hậu tố
  const state = new Map<string, number>();
  const back = new Set<string>();
  const disc: string[] = [];
  const post: string[] = [];
  const dfs = (id: string) => {
    state.set(id, 1);
    disc.push(id);
    for (const e of outs.get(id) ?? []) {
      const st = state.get(e.to) ?? 0;
      if (st === 1) back.add(e.id);
      else if (st === 0) dfs(e.to);
    }
    state.set(id, 2);
    post.push(id);
  };
  const starts = doc.nodes.filter((n) => !hasIn.has(n.id));
  for (const n of starts.length ? starts : [doc.nodes[0]!]) if (!state.get(n.id)) dfs(n.id);
  for (const n of doc.nodes) if (!state.get(n.id)) dfs(n.id);
  const fwd = (id: string) => (outs.get(id) ?? []).filter((e) => !back.has(e.id));
  const level = new Map<string, number>(doc.nodes.map((n) => [n.id, 0]));
  for (const id of [...post].reverse()) for (const e of fwd(id)) level.set(e.to, Math.max(level.get(e.to)!, level.get(id)! + 1));
  const inN = new Map<string, string[]>();
  for (const n of doc.nodes) for (const e of fwd(n.id)) inN.set(e.to, [...(inN.get(e.to) ?? []), n.id]);
  // nút kết thúc có từ 2 đường vào: tầng riêng ở cuối
  const finals = doc.nodes.filter((n) => !fwd(n.id).length && (inN.get(n.id)?.length ?? 0) >= 2).map((n) => n.id);
  const rest = doc.nodes.filter((n) => !finals.includes(n.id));
  const lastLevel = Math.max(0, ...rest.map((n) => level.get(n.id)!));
  for (const id of finals) level.set(id, lastLevel + 1);
  const layers: string[][] = [];
  for (const id of disc) {
    const l = level.get(id)!;
    (layers[l] ??= []).push(id);
  }
  for (let l = 0; l < layers.length; l++) layers[l] ??= [];
  // quét trọng tâm
  const idx = new Map<string, number>();
  const reindex = () => layers.forEach((ly) => ly.forEach((id, i) => idx.set(id, i)));
  reindex();
  const outN = (id: string) => fwd(id).map((e) => e.to);
  const sweep = (down: boolean) => {
    const range = down ? layers.map((_, i) => i).slice(1) : layers.map((_, i) => i).reverse().slice(1);
    for (const l of range) {
      const key = (id: string) => {
        const nb = (down ? inN.get(id) ?? [] : outN(id)).filter((x) => level.get(x) === l + (down ? -1 : 1));
        return nb.length ? nb.reduce((a, x) => a + idx.get(x)!, 0) / nb.length : idx.get(id)!;
      };
      const cur = new Map(layers[l]!.map((id) => [id, idx.get(id)!]));
      layers[l] = [...layers[l]!].sort((p, q) => key(p) - key(q) || cur.get(p)! - cur.get(q)!);
      layers[l]!.forEach((id, i) => idx.set(id, i));
    }
  };
  for (let pass = 0; pass < 3; pass++) {
    sweep(true);
    sweep(false);
  }
  // toạ độ: mỗi nút ưu tiên nằm dưới trung bình cha; chồng nhau thì đẩy sang phải
  const GX = 64;
  const GY = 72;
  const cx = new Map<string, number>();
  const pos = new Map<string, { x: number; y: number }>();
  let y = 0;
  for (const ly of layers) {
    let right = -Infinity;
    for (const id of ly) {
      const n = byId.get(id)!;
      const ps = (inN.get(id) ?? []).filter((p) => cx.has(p));
      const want = ps.length ? ps.reduce((a, p) => a + cx.get(p)!, 0) / ps.length : right === -Infinity ? 0 : right + GX + n.w / 2;
      const c = Math.max(want, right + GX + n.w / 2);
      cx.set(id, c);
      right = c + n.w / 2;
    }
    const h = Math.max(0, ...ly.map((id) => byId.get(id)!.h));
    for (const id of ly) pos.set(id, { x: cx.get(id)! - byId.get(id)!.w / 2, y: y + (h - byId.get(id)!.h) / 2 });
    y += h + GY;
  }
  // nút kết thúc căn giữa theo khung của phần còn lại
  const others = rest.map((n) => pos.get(n.id)!).filter(Boolean);
  const mid = others.length ? (Math.min(...rest.map((n) => pos.get(n.id)!.x)) + Math.max(...rest.map((n) => pos.get(n.id)!.x + n.w))) / 2 : 0;
  if (finals.length) {
    const tot = finals.reduce((a, id) => a + byId.get(id)!.w, 0) + GX * (finals.length - 1);
    let x = mid - tot / 2;
    for (const id of finals) {
      pos.set(id, { x, y: pos.get(id)!.y });
      x += byId.get(id)!.w + GX;
    }
  }
  const x0 = Math.min(...[...pos.values()].map((p) => p.x));
  const x1 = Math.max(...doc.nodes.map((n) => pos.get(n.id)!.x + n.w));
  const shift = -(x0 + x1) / 2;
  return { ...doc, nodes: doc.nodes.map((n) => ({ ...n, x: Math.round(pos.get(n.id)!.x + shift), y: Math.round(pos.get(n.id)!.y) })) };
}
