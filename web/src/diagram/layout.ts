// web/src/diagram/layout.ts — sắp xếp nút: sơ đồ tư duy (cây 2 bên) và lưu đồ (xếp tầng).
import type { DEdge, DiagramDoc, DNode, Shape } from "./types";

/** Ước lượng kích thước hình theo chữ (công thức LaTeX tính gần đúng). */
export function estimateSize(label: string, shape: Shape, image?: string): { w: number; h: number } {
  if (image) return { w: 168, h: 112 };
  const lines = label.split("\n");
  let w = 0;
  let h = 0;
  for (const ln of lines) {
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

/** Lưu đồ xếp tầng từ trên xuống (BFS theo cạnh), mỗi tầng căn giữa quanh x = 0. */
export function layoutFlow(doc: DiagramDoc): DiagramDoc {
  if (!doc.nodes.length) return doc;
  const out = new Map<string, DEdge[]>();
  const hasIn = new Set<string>();
  for (const e of doc.edges) {
    out.set(e.from, [...(out.get(e.from) ?? []), e]);
    hasIn.add(e.to);
  }
  const level = new Map<string, number>();
  const starts = doc.nodes.filter((n) => !hasIn.has(n.id));
  const queue = (starts.length ? starts : [doc.nodes[0]!]).map((n) => n.id);
  for (const id of queue) level.set(id, 0);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    for (const e of out.get(id) ?? []) {
      if (level.has(e.to)) continue;
      level.set(e.to, level.get(id)! + 1);
      queue.push(e.to);
    }
  }
  // kéo tầng xuống theo đường dài nhất trên các cạnh xuôi (theo tầng BFS) để các nhánh gom về cuối
  const fwd = doc.edges.filter((e) => (level.get(e.to) ?? -1) > (level.get(e.from) ?? Infinity));
  for (let pass = 0; pass < doc.nodes.length; pass++) {
    let moved = false;
    for (const e of fwd) {
      const want = level.get(e.from)! + 1;
      if (level.get(e.to)! < want) (level.set(e.to, want), (moved = true));
    }
    if (!moved) break;
  }
  const maxL = Math.max(0, ...level.values());
  for (const n of doc.nodes) if (!level.has(n.id)) level.set(n.id, maxL + 1);
  const rows = new Map<number, DNode[]>();
  for (const n of doc.nodes) rows.set(level.get(n.id)!, [...(rows.get(level.get(n.id)!) ?? []), n]);
  const GX = 56;
  const GY = 64;
  const pos = new Map<string, { x: number; y: number }>();
  let y = 0;
  for (const l of [...rows.keys()].sort((a, b) => a - b)) {
    const row = rows.get(l)!;
    const total = row.reduce((a, n) => a + n.w, 0) + GX * (row.length - 1);
    let x = -total / 2;
    for (const n of row) {
      pos.set(n.id, { x: Math.round(x), y: Math.round(y) });
      x += n.w + GX;
    }
    y += Math.max(...row.map((n) => n.h)) + GY;
  }
  return { ...doc, nodes: doc.nodes.map((n) => ({ ...n, ...pos.get(n.id)! })) };
}
