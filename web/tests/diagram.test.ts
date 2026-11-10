import { describe, expect, it } from "vitest";
import { estimateSize, layoutFlow, layoutMind } from "../src/diagram/layout";
import { placeLabels } from "../src/diagram/labels";
import { polyline, routeAll, segHitsRect } from "../src/diagram/route";
import type { DEdge, DiagramDoc, DNode, Rect, Shape } from "../src/diagram/types";
import { rectOf } from "../src/diagram/types";

let seq = 0;
const node = (label: string, shape: Shape = "round", parent: string | null = null, extra: Partial<DNode> = {}): DNode => ({ id: `n${seq++}`, x: 0, y: 0, ...estimateSize(label, shape), shape, label, color: "#4f6bed", parent, ...extra });
const edge = (from: DNode, to: DNode, label = "", kind: DEdge["kind"] = "link"): DEdge => ({ id: `e${seq++}`, from: from.id, to: to.id, kind, ...(label ? { label } : {}), ...(kind === "link" ? { dashed: false } : {}) });

function mindSample(): DiagramDoc {
  const root = node("Hàm số bậc hai\n$y=ax^2+bx+c$", "round");
  const tree: DNode[] = [root];
  const kid = (p: DNode, t: string) => {
    const n = node(t, "round", p.id);
    tree.push(n);
    return n;
  };
  const dt = kid(root, "Đồ thị");
  const parabol = kid(dt, "Parabol, đỉnh $I(-\\dfrac{b}{2a};-\\dfrac{\\Delta}{4a})$");
  kid(dt, "Trục đối xứng $x=-\\dfrac{b}{2a}$");
  const sbt = kid(root, "Sự biến thiên");
  kid(sbt, "$a>0$: nghịch biến");
  const min = kid(sbt, "Giá trị nhỏ nhất $-\\dfrac{\\Delta}{4a}$");
  const pt = kid(root, "Phương trình $ax^2+bx+c=0$");
  kid(pt, "$\\Delta=b^2-4ac$");
  const nghiem = kid(pt, "Nghiệm $x_{1,2}$");
  kid(nghiem, "Hệ thức Vi-ét");
  const dau = kid(root, "Dấu tam thức");
  kid(dau, "$\\Delta<0$: cùng dấu $a$");
  const ud = kid(root, "Ứng dụng");
  kid(ud, "Diện tích lớn nhất");
  const cloud = node("Mẹo: đỉnh luôn nằm\ntrên trục đối xứng", "cloud");
  tree.push(cloud);
  const edges: DEdge[] = tree.filter((n) => n.parent).map((n) => edge(tree.find((p) => p.id === n.parent)!, n, "", "tree"));
  edges.push(edge(min, parabol, "là tung độ đỉnh"), edge(cloud, root));
  const laid = layoutMind({ version: 1, kind: "mind", nodes: tree, edges });
  // ghi chú đặt phía trên-trái gốc
  laid.nodes = laid.nodes.map((n) => (n.id === cloud.id ? { ...n, x: -300, y: -330 } : n));
  return laid;
}

function flowSample(): DiagramDoc {
  const s = node("Bắt đầu", "ellipse");
  const a = node("Nhập $a\\neq0,\\ b,\\ c$", "parallelogram");
  const d = node("$\\Delta=b^2-4ac$", "rect");
  const q1 = node("$\\Delta<0$ ?", "diamond");
  const r1 = node("Phương trình vô nghiệm", "round");
  const q2 = node("$\\Delta=0$ ?", "diamond");
  const r2 = node("Nghiệm kép $x=-\\dfrac{b}{2a}$", "round");
  const r3 = node("Hai nghiệm $x_{1,2}$", "round");
  const e = node("Kết thúc", "ellipse");
  const edges = [edge(s, a), edge(a, d), edge(d, q1), edge(q1, r1, "Có"), edge(q1, q2, "Không"), edge(q2, r2, "Có"), edge(q2, r3, "Không"), edge(r1, e), edge(r2, e), edge(r3, e)];
  return layoutFlow({ version: 1, kind: "flow", nodes: [s, a, d, q1, r1, q2, r2, r3, e], edges });
}

const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function check(doc: DiagramDoc) {
  const routes = routeAll(doc);
  expect(routes.size).toBe(doc.edges.length);
  for (const e of doc.edges) {
    const pts = polyline(routes.get(e.id)!);
    for (const n of doc.nodes) {
      if (n.id === e.from || n.id === e.to) continue;
      for (let i = 0; i + 1 < pts.length; i++) expect(segHitsRect(pts[i]!, pts[i + 1]!, rectOf(n)), `đường ${e.id} xuyên nút ${n.label}`).toBe(false);
    }
  }
  const labels = placeLabels(doc, routes);
  const arr = [...labels.entries()];
  for (const [id, r] of arr) {
    for (const n of doc.nodes) expect(hit(r, rectOf(n)), `nhãn ${id} đè nút ${n.label}`).toBe(false);
    for (const [id2, r2] of arr) if (id2 !== id) expect(hit(r, r2)).toBe(false);
  }
  return { routes, labels };
}

describe("layout", () => {
  it("sơ đồ tư duy: hai bên gốc, không chồng nhau", () => {
    const doc = mindSample();
    const tree = doc.nodes.filter((n) => n.label !== "Mẹo: đỉnh luôn nằm\ntrên trục đối xứng");
    for (let i = 0; i < tree.length; i++) for (let j = i + 1; j < tree.length; j++) expect(hit(rectOf(tree[i]!), rectOf(tree[j]!)), `${tree[i]!.label} / ${tree[j]!.label}`).toBe(false);
    expect(tree.some((n) => n.x + n.w < 0)).toBe(true);
    expect(tree.some((n) => n.x > 0)).toBe(true);
  });
  it("lưu đồ: xếp tầng, mỗi tầng nằm dưới tầng trước", () => {
    const doc = flowSample();
    const y = (l: string) => doc.nodes.find((n) => n.label === l)!.y;
    expect(y("Bắt đầu")).toBeLessThan(y("Kết thúc"));
    expect(y("Bắt đầu")).toBeLessThan(y("$\\Delta=b^2-4ac$"));
  });
});

describe("định tuyến + nhãn", () => {
  it("sơ đồ Hàm số bậc hai", () => check(mindSample()));
  it("lưu đồ giải PT bậc hai", () => check(flowSample()));
  it("hiệu năng: 60 nút / 80 cạnh dưới 50 ms", () => {
    const nodes: DNode[] = Array.from({ length: 60 }, (_, i) => node(`Ý ${i}`, "rect", null, { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 }));
    const edges: DEdge[] = Array.from({ length: 80 }, (_, i) => edge(nodes[i % 60]!, nodes[(i * 7 + 13) % 60 === i % 60 ? (i + 1) % 60 : (i * 7 + 13) % 60]!, i % 3 ? "nhãn" : ""));
    const doc: DiagramDoc = { version: 1, kind: "flow", nodes, edges };
    routeAll(doc); // làm nóng JIT
    const t0 = performance.now();
    const routes = routeAll(doc);
    const tR = performance.now() - t0;
    placeLabels(doc, routes);
    const ms = performance.now() - t0;
    console.log(`route+label 60 nút/80 cạnh: ${ms.toFixed(1)} ms (route ${tR.toFixed(1)})`);
    expect(ms).toBeLessThan(50);
  });
});
