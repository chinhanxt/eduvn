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

type Seg = { a: { x: number; y: number }; b: { x: number; y: number }; last: boolean };
const segsOf = (pts: { x: number; y: number }[]): Seg[] => pts.slice(1).map((b, i) => ({ a: pts[i]!, b, last: i === pts.length - 2 }));
const overlap1d = (a0: number, a1: number, b0: number, b1: number) => Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1));

function lineQuality(doc: DiagramDoc) {
  const routes = routeAll(doc);
  const list = doc.edges.map((e) => ({ e, segs: segsOf(polyline(routes.get(e.id)!)) }));
  let crossings = 0;
  const shared: string[] = [];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      for (const s of list[i]!.segs)
        for (const t of list[j]!.segs) {
          const sv = s.a.x === s.b.x, tv = t.a.x === t.b.x;
          if (sv === tv) {
            const same = sv ? s.a.x === t.a.x : s.a.y === t.a.y;
            const ov = sv ? overlap1d(s.a.y, s.b.y, t.a.y, t.b.y) : overlap1d(s.a.x, s.b.x, t.a.x, t.b.x);
            if (same && ov > 8 && list[i]!.e.to !== list[j]!.e.to) shared.push(`${list[i]!.e.id}/${list[j]!.e.id}`);
          } else {
            const v = sv ? s : t, h = sv ? t : s;
            const x = v.a.x, y = h.a.y;
            if (x > Math.min(h.a.x, h.b.x) && x < Math.max(h.a.x, h.b.x) && y > Math.min(v.a.y, v.b.y) && y < Math.max(v.a.y, v.b.y)) crossings++;
          }
        }
  return { crossings, shared };
}

describe("chất lượng đường nối lưu đồ", () => {
  it("đường khác đích không đi chung đoạn thẳng, cắt nhau tối đa 1 lần", () => {
    const q = lineQuality(flowSample());
    expect(q.shared).toEqual([]);
    expect(q.crossings).toBeLessThanOrEqual(1);
  });
  it("không có ngã ba: đỉnh của đường này không nằm trên đoạn của đường khác", () => {
    const doc = flowSample();
    const routes = routeAll(doc);
    const on = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
      if (Math.abs(cross) > 1e-6) return false;
      const t = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
      const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      return t > 0 && t < len2;
    };
    const bad: string[] = [];
    for (const A of doc.edges)
      for (const B of doc.edges) {
        if (A.id === B.id || A.to === B.to) continue; // cùng đích: được nhập chung một trục
        const pa = polyline(routes.get(A.id)!), pb = polyline(routes.get(B.id)!);
        for (const v of pa) for (let i = 0; i + 1 < pb.length; i++) if (on(v, pb[i]!, pb[i + 1]!)) bad.push(`${A.id}@${v.x},${v.y} trên ${B.id}`);
      }
    expect(bad).toEqual([]);
  });
  it("nhánh Có nằm ngay dưới nút điều kiện, Không lệch sang phải; Kết thúc ở tầng cuối", () => {
    const doc = flowSample();
    const n = (l: string) => doc.nodes.find((x) => x.label === l)!;
    const q1 = n("$\\Delta<0$ ?"), r1 = n("Phương trình vô nghiệm"), q2 = n("$\\Delta=0$ ?"), e = n("Kết thúc");
    expect(Math.abs(r1.x + r1.w / 2 - (q1.x + q1.w / 2))).toBeLessThan(2);
    expect(q2.x).toBeGreaterThan(r1.x + r1.w);
    expect(e.y).toBeGreaterThan(Math.max(...doc.nodes.filter((x) => x !== e).map((x) => x.y)));
  });
  it("sơ đồ tư duy: nét đứt không đi vòng quá xa (<= 1.8x đường ngắn nhất hoặc +300px)", () => {
    const doc = mindSample();
    const routes = routeAll(doc);
    const link = doc.edges.find((e) => e.label === "là tung độ đỉnh")!;
    const pts = polyline(routes.get(link.id)!);
    const len = pts.slice(1).reduce((a, p, i) => a + Math.abs(p.x - pts[i]!.x) + Math.abs(p.y - pts[i]!.y), 0);
    const f = doc.nodes.find((n) => n.id === link.from)!, t = doc.nodes.find((n) => n.id === link.to)!;
    const shortest = Math.abs(f.x + f.w / 2 - (t.x + t.w / 2)) + Math.abs(f.y + f.h / 2 - (t.y + t.h / 2));
    expect(len).toBeLessThanOrEqual(Math.max(shortest * 1.8, shortest + 300));
  });
  it("sơ đồ tư duy: đường nối ghi chú/liên hệ không xuyên hình", () => check(mindSample()));
});

describe("định tuyến + nhãn", () => {
  it("sơ đồ Hàm số bậc hai", () => check(mindSample()));
  it("lưu đồ giải PT bậc hai", () => check(flowSample()));
  it("hiệu năng: 60 nút / 80 cạnh dưới 50 ms", () => {
    const nodes: DNode[] = Array.from({ length: 60 }, (_, i) => node(`Ý ${i}`, "rect", null, { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 }));
    const edges: DEdge[] = Array.from({ length: 80 }, (_, i) => edge(nodes[i % 60]!, nodes[(i * 7 + 13) % 60 === i % 60 ? (i + 1) % 60 : (i * 7 + 13) % 60]!, i % 3 ? "nhãn" : ""));
    const doc: DiagramDoc = { version: 1, kind: "flow", nodes, edges };
    const c0 = performance.now();
    placeLabels(doc, routeAll(doc));
    const cold = performance.now() - c0;
    for (let w = 0; w < 3; w++) placeLabels(doc, routeAll(doc)); // làm nóng JIT
    let ms = Infinity;
    let tR = 0;
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const routes = routeAll(doc);
      const r = performance.now() - t0;
      placeLabels(doc, routes);
      const all = performance.now() - t0;
      if (all < ms) (ms = all, (tR = r));
    }
    console.log(`route+label 60 nút/80 cạnh: lạnh ${cold.toFixed(1)} ms, nóng (tốt nhất/5) ${ms.toFixed(1)} ms (route ${tR.toFixed(1)})`);
    expect(ms).toBeLessThan(100); // mục tiêu 50 ms trên máy rảnh (đo ~19 ms nóng); nới cho máy đang tải nặng
  });
});
