// web/src/diagram/ops.ts — các thao tác thuần trên DiagramDoc (thêm/xoá nút, nối, mẫu).
import { estimateSize, layoutFlow, layoutMind } from "./layout";
import type { DEdge, DiagramDoc, DiagramKind, DNode, Rect, Shape } from "./types";
import { newId } from "./types";

export const BRANCH = ["#4f6bed", "#16a34a", "#e08a00", "#ef4444", "#8b5cf6", "#0ea5e9", "#db2777", "#0d9488"];
export const ROOT_COLOR = "#4f6bed";

const hit = (a: Rect, b: Rect) => a.x < b.x + b.w + 8 && b.x < a.x + a.w + 8 && a.y < b.y + b.h + 8 && b.y < a.y + a.h + 8;

export function makeNode(kind: DiagramKind, label: string, over: Partial<DNode> = {}): DNode {
  const shape: Shape = over.shape ?? (kind === "mind" ? "round" : "rect");
  return { id: newId(), x: 0, y: 0, ...estimateSize(label, shape, over.image), shape, label, color: ROOT_COLOR, parent: null, ...over };
}

function freeSpot(doc: DiagramDoc, n: DNode, dx = 0, dy = 24): DNode {
  let m = n;
  for (let i = 0; i < 60 && doc.nodes.some((o) => o.id !== m.id && hit(m, o)); i++) m = { ...m, x: m.x + dx, y: m.y + dy };
  return m;
}

const kidsOf = (doc: DiagramDoc, id: string) => doc.nodes.filter((n) => n.parent === id);

/** Thêm nút con (Tab). Sơ đồ tư duy: nhánh con của `pid`; lưu đồ: bước kế tiếp nối bằng mũi tên. */
export function addChild(doc: DiagramDoc, pid: string | null): { doc: DiagramDoc; id: string } {
  const p = doc.nodes.find((n) => n.id === pid) ?? doc.nodes.find((n) => !n.parent) ?? doc.nodes[0];
  if (!p) {
    const r = makeNode(doc.kind, doc.kind === "mind" ? "Chủ đề" : "Bắt đầu", { x: -60, y: -20, shape: doc.kind === "mind" ? "round" : "ellipse" });
    return { doc: { ...doc, nodes: [r] }, id: r.id };
  }
  if (doc.kind === "flow") {
    const n = freeSpot(doc, makeNode("flow", "Bước mới", { x: p.x + p.w / 2 - 60, y: p.y + p.h + 56, color: p.color }), 40, 0);
    return { doc: { ...doc, nodes: [...doc.nodes, n], edges: [...doc.edges, { id: newId(), from: p.id, to: n.id, kind: "link" }] }, id: n.id };
  }
  const root = doc.nodes.find((n) => !n.parent)!;
  const top = p.id === root.id;
  const color = top ? BRANCH[kidsOf(doc, root.id).length % BRANCH.length]! : p.color;
  const right = top ? kidsOf(doc, root.id).length % 2 === 0 : p.x + p.w / 2 >= root.x + root.w / 2;
  const sibs = kidsOf(doc, p.id).sort((a, b) => a.y - b.y);
  const last = sibs[sibs.length - 1];
  const w = estimateSize("Ý mới", "round").w;
  const n = freeSpot(doc, makeNode("mind", "Ý mới", { parent: p.id, color, x: right ? p.x + p.w + 56 : p.x - 56 - w, y: last ? last.y + last.h + 14 : p.y }));
  return { doc: { ...doc, nodes: [...doc.nodes, n], edges: [...doc.edges, { id: newId(), from: p.id, to: n.id, kind: "tree" }] }, id: n.id };
}

/** Thêm nút ngang hàng (Enter). */
export function addSibling(doc: DiagramDoc, id: string): { doc: DiagramDoc; id: string } {
  const s = doc.nodes.find((n) => n.id === id);
  if (!s) return addChild(doc, null);
  if (doc.kind === "flow") {
    const n = freeSpot(doc, makeNode("flow", "Bước mới", { x: s.x + s.w + 48, y: s.y, color: s.color }), 0, 24);
    const inc = doc.edges.find((e) => e.to === s.id);
    return { doc: { ...doc, nodes: [...doc.nodes, n], edges: inc ? [...doc.edges, { id: newId(), from: inc.from, to: n.id, kind: "link" }] : doc.edges }, id: n.id };
  }
  if (!s.parent) return addChild(doc, id);
  const n = freeSpot(doc, makeNode("mind", "Ý mới", { parent: s.parent, color: s.color, x: s.x, y: s.y + s.h + 14 }));
  return { doc: { ...doc, nodes: [...doc.nodes, n], edges: [...doc.edges, { id: newId(), from: s.parent, to: n.id, kind: "tree" }] }, id: n.id };
}

/** Xoá nút (kèm cả nhánh con trong sơ đồ tư duy) và mọi đường nối dính vào. */
export function removeNodes(doc: DiagramDoc, ids: string[]): DiagramDoc {
  const gone = new Set(ids);
  for (let grow = true; grow; ) {
    grow = false;
    for (const n of doc.nodes) if (n.parent && gone.has(n.parent) && !gone.has(n.id)) (gone.add(n.id), (grow = true));
  }
  return { ...doc, nodes: doc.nodes.filter((n) => !gone.has(n.id)), edges: doc.edges.filter((e) => !gone.has(e.from) && !gone.has(e.to)) };
}

export function addLink(doc: DiagramDoc, from: string, to: string): { doc: DiagramDoc; id: string | null } {
  if (from === to || doc.edges.some((e) => e.from === from && e.to === to)) return { doc, id: null };
  const e: DEdge = { id: newId(), from, to, kind: "link", dashed: doc.kind === "mind" };
  return { doc: { ...doc, edges: [...doc.edges, e] }, id: e.id };
}

export function setLabel(doc: DiagramDoc, id: string, label: string): DiagramDoc {
  return { ...doc, nodes: doc.nodes.map((n) => (n.id === id ? { ...n, label, ...(n.image ? {} : estimateSize(label, n.shape)) } : n)) };
}
export function setShape(doc: DiagramDoc, id: string, shape: Shape): DiagramDoc {
  return { ...doc, nodes: doc.nodes.map((n) => (n.id === id ? { ...n, shape, ...(n.image ? {} : estimateSize(n.label, shape)) } : n)) };
}

/** Đo lại kích thước mọi hình theo chữ/công thức (ảnh giữ nguyên). */
export const resizeAll = (doc: DiagramDoc): DiagramDoc => ({ ...doc, nodes: doc.nodes.map((n) => (n.image ? n : { ...n, ...estimateSize(n.label, n.shape) })) });

/** Sắp xếp lại toàn bộ theo kiểu sơ đồ. */
export const arrange = (doc: DiagramDoc): DiagramDoc => (doc.kind === "mind" ? layoutMind(doc) : layoutFlow(doc));

/** Dựng sơ đồ từ danh sách nút/nối (mẫu, kết quả AI) rồi sắp xếp. */
export function buildDoc(kind: DiagramKind, nodes: { id: string; label: string; parent?: string | null; shape?: Shape }[], links: { from: string; to: string; label?: string; dashed?: boolean }[]): DiagramDoc {
  const idMap = new Map(nodes.map((n) => [n.id, newId()]));
  const rootId = nodes.find((n) => !n.parent)?.id;
  const branchOf = new Map<string, string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const colorOf = (id: string): string => {
    if (id === rootId) return ROOT_COLOR;
    let cur = byId.get(id)!;
    while (cur.parent && cur.parent !== rootId && byId.has(cur.parent)) cur = byId.get(cur.parent)!;
    if (!branchOf.has(cur.id)) branchOf.set(cur.id, BRANCH[branchOf.size % BRANCH.length]!);
    return branchOf.get(cur.id)!;
  };
  const dn: DNode[] = nodes.map((n) => {
    const shape: Shape = n.shape ?? (kind === "mind" ? "round" : "rect");
    return { id: idMap.get(n.id)!, x: 0, y: 0, ...estimateSize(n.label, shape), shape, label: n.label, color: kind === "mind" ? colorOf(n.id) : ROOT_COLOR, parent: kind === "mind" && n.parent && idMap.has(n.parent) ? idMap.get(n.parent)! : null };
  });
  const edges: DEdge[] = [];
  if (kind === "mind") for (const n of dn) if (n.parent) edges.push({ id: newId(), from: n.parent, to: n.id, kind: "tree" });
  for (const l of links) if (idMap.has(l.from) && idMap.has(l.to)) edges.push({ id: newId(), from: idMap.get(l.from)!, to: idMap.get(l.to)!, kind: "link", label: l.label || undefined, dashed: l.dashed ?? kind === "mind" });
  return arrange({ version: 1, kind, nodes: dn, edges });
}

export function sampleDoc(kind: DiagramKind): DiagramDoc {
  if (kind === "mind")
    return buildDoc("mind", [
      { id: "r", label: "Hàm số bậc hai\n$y=ax^2+bx+c$" },
      { id: "a", label: "Đồ thị", parent: "r" },
      { id: "a1", label: "Parabol, đỉnh $I(-\\dfrac{b}{2a};-\\dfrac{\\Delta}{4a})$", parent: "a" },
      { id: "a2", label: "Trục đối xứng $x=-\\dfrac{b}{2a}$", parent: "a" },
      { id: "b", label: "Sự biến thiên", parent: "r" },
      { id: "b1", label: "$a>0$: nghịch biến rồi đồng biến", parent: "b" },
      { id: "b2", label: "Giá trị nhỏ nhất $-\\dfrac{\\Delta}{4a}$", parent: "b" },
      { id: "c", label: "Phương trình $ax^2+bx+c=0$", parent: "r" },
      { id: "c1", label: "$\\Delta=b^2-4ac$", parent: "c" },
      { id: "c2", label: "Hệ thức Vi-ét", parent: "c" },
      { id: "d", label: "Ứng dụng", parent: "r" },
      { id: "d1", label: "Bài toán diện tích lớn nhất", parent: "d" },
    ], [{ from: "b2", to: "a1", label: "là tung độ đỉnh", dashed: true }]);
  return buildDoc("flow", [
    { id: "s", label: "Bắt đầu", shape: "ellipse" },
    { id: "a", label: "Nhập $a\\neq0,\\ b,\\ c$", shape: "parallelogram" },
    { id: "d", label: "$\\Delta=b^2-4ac$" },
    { id: "q1", label: "$\\Delta<0$ ?", shape: "diamond" },
    { id: "r1", label: "Vô nghiệm", shape: "round" },
    { id: "q2", label: "$\\Delta=0$ ?", shape: "diamond" },
    { id: "r2", label: "Nghiệm kép $x=-\\dfrac{b}{2a}$", shape: "round" },
    { id: "r3", label: "Hai nghiệm phân biệt", shape: "round" },
    { id: "e", label: "Kết thúc", shape: "ellipse" },
  ], [
    { from: "s", to: "a" }, { from: "a", to: "d" }, { from: "d", to: "q1" }, { from: "q1", to: "r1", label: "Có" }, { from: "q1", to: "q2", label: "Không" },
    { from: "q2", to: "r2", label: "Có" }, { from: "q2", to: "r3", label: "Không" }, { from: "r1", to: "e" }, { from: "r2", to: "e" }, { from: "r3", to: "e" },
  ].map((l) => ({ ...l, dashed: false })));
}
