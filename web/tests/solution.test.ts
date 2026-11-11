// web/tests/solution.test.ts — P13 trình xem lời giải: tô sáng đúng phần tử refs của bước, nhãn hình không đè nhau
// (kiểm như test P10: khung chữ không chạm nhau và không đè nút), lời nhắn "Chưa hiểu bước này" đủ ngữ cảnh.
import { describe, expect, it } from "vitest";
import fixtures from "../../server/tests/fixtures/dung-hinh.json";
import { fixEscapes, stuckMessage, texToText } from "../src/solution/context";
import { compilePlain, plainNumber } from "../src/solution/expr";
import { type Box, type FigureModel, boxesHit, buildFigureModel, dedupeAngleMarks, figureSvg, highlightOf, knownRefs, solidOverlay } from "../src/solution/figure";
import type { Figure } from "../src/solution/types";

const tree = (): Figure => ({
  kind: "tree",
  spec: {
    nodes: [
      { id: "g", label: "Chọn máy", parent: null },
      { id: "A", label: "Máy A", parent: "g", p: "0,6" },
      { id: "B", label: "Máy B", parent: "g", p: "0,4" },
      { id: "AL", label: "Lỗi", parent: "A", p: "0,02" },
      { id: "AT", label: "Tốt", parent: "A", p: "0,98" },
      { id: "BL", label: "Lỗi", parent: "B", p: "0,05" },
      { id: "BT", label: "Tốt", parent: "B", p: "0,95" },
    ],
  },
});
const tree3 = (): Figure => ({
  kind: "tree",
  spec: {
    nodes: [
      { id: "g", label: "Gieo", parent: null },
      ...["1", "2", "3"].flatMap((k) => [
        { id: `h${k}`, label: `Hộp ${k}`, parent: "g", p: "1/3" },
        { id: `h${k}d`, label: "Bi đỏ", parent: `h${k}`, p: `${k}/5` },
        { id: `h${k}x`, label: "Bi xanh", parent: `h${k}`, p: `${5 - Number(k)}/5` },
      ]),
    ],
  },
});
const graph = (): Figure => ({
  kind: "graph",
  spec: { expr: "x^3 - 3x + 1", xRange: [-3, 3], points: [{ id: "CD", x: "-1", y: "3", label: "Cực đại" }, { id: "CT", x: "1", y: "-1", label: "Cực tiểu" }, { id: "U", x: "0", label: "Uốn" }] },
});
const plane = (): Figure => ({
  kind: "plane",
  spec: {
    points: [{ id: "A", x: 0, y: 3 }, { id: "B", x: -2, y: 0 }, { id: "C", x: 2, y: 0 }, { id: "H", x: 0, y: 0 }, { id: "O", x: 0, y: 1.2 }],
    segments: [["A", "B"], ["B", "C"], ["C", "A"], ["A", "H"]],
    circles: [{ center: "O", r: 1.8 }],
  },
});
const diagram = (): Figure => ({
  kind: "diagram",
  spec: {
    nodes: [{ id: "1", label: "Đặt ẩn x", parent: null }, { id: "2", label: "Lập phương trình", parent: null }, { id: "3", label: "Giải phương trình", parent: null }, { id: "4", label: "Kết luận", parent: null }],
    links: [{ from: "1", to: "2", label: "theo đề" }, { from: "2", to: "3" }, { from: "3", to: "4", label: "đối chiếu điều kiện" }],
  },
});
const solid = (i: number): Figure => ({ kind: "solid3d", spec: fixtures[i]!.spec as never });

/** Hai khung nhãn bất kỳ không chạm nhau. */
function expectNoOverlap(boxes: Box[], what: string) {
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(boxesHit(boxes[i]!, boxes[j]!), `${what}: nhãn ${i} đè nhãn ${j} ${JSON.stringify([boxes[i], boxes[j]])}`).toBe(false);
}
const hlIds = (m: FigureModel, refs: string[]) => new Set(m.els.filter((e) => highlightOf(e, refs) === "hl").flatMap((e) => e.ids));

describe("tô sáng đúng refs của bước", () => {
  it("cây xác suất: nhánh + nhãn xác suất + nút của AL, BL sáng; phần còn lại mờ; không refs → bình thường", () => {
    const m = buildFigureModel(tree());
    const refs = ["AL", "BL"];
    for (const e of m.els) expect(highlightOf(e, refs)).toBe(e.ids.some((id) => refs.includes(id)) ? "hl" : "dim");
    expect(hlIds(m, refs)).toEqual(new Set(refs));
    expect(m.els.filter((e) => highlightOf(e, refs) === "hl").map((e) => e.t).sort()).toEqual(["line", "line", "rect", "rect", "text", "text", "text", "text"]);
    expect(m.els.every((e) => highlightOf(e, []) === null)).toBe(true);
  });
  it("đồ thị: 'f' tô đường cong; id điểm tô chấm + đường gióng + nhãn; trục không bao giờ đổi màu", () => {
    const m = buildFigureModel(graph());
    const curve = m.els.filter((e) => highlightOf(e, ["f"]) === "hl");
    expect(curve.map((e) => e.t)).toEqual(["path"]);
    expect(m.els.filter((e) => highlightOf(e, ["CD"]) === "hl").map((e) => e.t).sort()).toEqual(["circle", "line", "text"]);
    const cd = m.els.find((e) => e.t === "text" && e.ids.includes("CD"));
    expect(cd && cd.t === "text" && cd.text).toBe("Cực đại (−1; 3)");
    const u = m.els.find((e) => e.t === "text" && e.ids.includes("U"));
    expect(u && u.t === "text" && u.text).toBe("Uốn (0; 1)");
  });
  it("hình phẳng: đoạn 'A-H' (cả viết 'H-A') và điểm 'O' (kèm đường tròn tâm O)", () => {
    const m = buildFigureModel(plane());
    expect(m.els.filter((e) => highlightOf(e, ["H-A"]) === "hl").map((e) => e.t)).toEqual(["line"]);
    expect(m.els.filter((e) => highlightOf(e, ["O"]) === "hl").map((e) => e.t).sort()).toEqual(["circle", "circle", "text"]);
    expect(knownRefs(m, ["A-H", "Z", "A-Z"])).toEqual(["A-H"]);
  });
  it("hình không gian: đoạn → nét + 2 điểm + 2 nhãn; mặt → đa giác; tên lạ bị bỏ", () => {
    const m = buildFigureModel(solid(0));
    expect(m.solid).toBeTruthy();
    expect(knownRefs(m, ["S-C", "A-B-C-D", "S-Z", "Q"])).toEqual(["S-C", "A-B-C-D"]);
    const seg = solidOverlay(m.solid!.scene, ["S-C"]);
    expect(seg.map((e) => e.t)).toEqual(["line", "circle", "text", "circle", "text"]);
    // điểm chung của nhiều refs chỉ một nhãn (không chồng nhãn C lên nhau)
    const two = solidOverlay(m.solid!.scene, ["S-C", "A-C"]);
    expect(two.filter((e) => e.t === "text").map((e) => (e.t === "text" ? e.text : ""))).toEqual(["S", "C", "A"]);
    expect(seg.filter((e) => e.t === "text").map((e) => (e.t === "text" ? e.text : ""))).toEqual(["S", "C"]);
    const face = solidOverlay(m.solid!.scene, ["A-B-C-D"]);
    expect(face[0]!.t).toBe("poly");
    expect(face[0]!.t === "poly" && face[0]!.pts).toHaveLength(4);
    // vị trí nhãn tô sáng trùng nhãn SGK (không nhảy chỗ khi đổi bước)
    const lS = m.solid!.scene.labels.find((l) => l.kind === "point" && l.name === "S")!;
    const tS = seg.find((e) => e.t === "text" && e.text === "S")!;
    expect(tS.t === "text" && tS.x).toBe(lS.x);
  });
  it("PNG: SVG độc lập có nền trắng, phần tô sáng mang màu nhấn, phần khác mờ", () => {
    const { svg, w, h } = figureSvg(buildFigureModel(tree()), ["AL"]);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(w).toBeGreaterThan(200);
    expect(h).toBeGreaterThan(100);
    expect(svg).toContain('fill="#fff"');
    expect(svg).toContain("#d9480f");
    expect(svg).toContain('opacity="0.3"');
    const s3 = figureSvg(buildFigureModel(solid(1)), ["S-B-C"]).svg;
    expect(s3).toContain('<g opacity="0.4">');
    expect(s3).toContain("<polygon");
  });
});

describe("nhãn hình không đè", () => {
  it.each([
    ["cây 2 tầng", tree()],
    ["cây 3 nhánh", tree3()],
    ["đồ thị 3 điểm đặc biệt", graph()],
    ["hình phẳng + đường tròn", plane()],
    ["sơ đồ lập luận", diagram()],
  ])("%s", (what, f) => {
    const m = buildFigureModel(f);
    expect(m.labels.length).toBeGreaterThan(2);
    expectNoOverlap(m.labels, what);
  });
  it("hình phẳng: nhãn điểm không đè lên đoạn thẳng", () => {
    const m = buildFigureModel(plane());
    const pts = new Map(plane().kind === "plane" ? (plane() as Extract<Figure, { kind: "plane" }>).spec.points.map((p) => [p.id, p]) : []);
    const segs = m.els.filter((e) => e.t === "line");
    for (const l of m.labels)
      for (const s of segs) {
        if (s.t !== "line") continue;
        for (let k = 1; k < 10; k++) {
          const x = s.x1 + ((s.x2 - s.x1) * k) / 10, y = s.y1 + ((s.y2 - s.y1) * k) / 10;
          expect(x > l.x && x < l.x + l.w && y > l.y && y < l.y + l.h, `nhãn ${JSON.stringify(l)} đè đoạn ${s.ids[0]}`).toBe(false);
        }
      }
    expect(pts.size).toBe(5);
  });
  it.each(fixtures.slice(0, 8).map((f, i) => [i, f.problem.slice(0, 40)] as const))("hình không gian đề %i (%s…): nhãn SGK không đè", (i) => {
    const m = buildFigureModel(solid(i));
    expectNoOverlap(m.labels, `đề ${i}`);
  });
});

describe("biểu thức đồ thị + ngữ cảnh gia sư", () => {
  it("biểu thức an toàn: LaTeX/ký hiệu SGK, từ chối mã lạ", () => {
    expect(compilePlain("x^3 - 3x + 1")(2)).toBe(3);
    expect(compilePlain("\\frac{1}{x} + \\sqrt{x}")(4)).toBe(2.25);
    expect(compilePlain("y = 2sin(x)")(Math.PI / 2)).toBeCloseTo(2);
    expect(plainNumber("√2")).toBeCloseTo(Math.SQRT2);
    expect(plainNumber("-1/2")).toBe(-0.5);
    expect(() => compilePlain("alert(1)")).toThrow();
    expect(() => compilePlain("constructor")).toThrow();
  });
  it("“Chưa hiểu bước này”: đề + các bước trước + bước đang vướng, dặn chỉ gợi ý", () => {
    const steps = [
      { title: "Vẽ cây", body: "Hai nhánh A, B", refs: [] },
      { title: "Xác suất lỗi", body: "$P(L)=0{,}032$", refs: [] },
      { title: "Bayes", body: "$P(A|L)=3/8$", refs: [] },
    ];
    const m = stuckMessage({ problem: "Đề bài máy A, B", steps }, 1);
    expect(m).toContain("Đề bài máy A, B");
    expect(m).toContain("Bước 1 — Vẽ cây: Hai nhánh A, B");
    expect(m).toContain("Bước em chưa hiểu — Bước 2: Xác suất lỗi\n$P(L)=0{,}032$");
    expect(m).not.toContain("Bayes");
    expect(m).toContain("gợi ý từng chút");
    expect(stuckMessage({ problem: "Đề", steps }, 0)).not.toContain("Các bước trước");
  });
});

describe("sửa lỗi hay gặp ở lời giải AI thật (chạy thật 2026-11-11)", () => {
  it('"\\n" hai ký tự → xuống dòng, trừ lệnh LaTeX \\neq, \\notin, \\nabla', () => {
    expect(fixEscapes("Giải $y'=0$:\\n$$3x^2-3=0$$")).toBe("Giải $y'=0$:\n$$3x^2-3=0$$");
    expect(fixEscapes("Ta có:\\n- Đạo hàm\\ny' = 3x^2")).toBe("Ta có:\n- Đạo hàm\ny' = 3x^2");
    expect(fixEscapes("$x \\neq 1$, $a \\notin B$, $\\nabla f$, $x\\ne 0$")).toBe("$x \\neq 1$, $a \\notin B$, $\\nabla f$, $x\\ne 0$");
    expect(fixEscapes("a\\\\n")).toBe("a\\\\n");
  });
  it("đồ thị: nhãn AI đã có toạ độ thì không ghép thêm toạ độ lần hai", () => {
    const m = buildFigureModel({ kind: "graph", spec: { expr: "x^3-3x+1", xRange: [-3, 3], points: [{ id: "CD", x: "-1", y: "3", label: "Cực đại (-1; 3)" }] } });
    const t = m.els.find((e) => e.t === "text" && e.ids.includes("CD"));
    expect(t && t.t === "text" && t.text).toBe("Cực đại (−1; 3)");
  });
  it("đồ thị: đường cong không vượt khung vẽ", () => {
    const m = buildFigureModel(graph());
    const path = m.els.find((e) => e.t === "path");
    const ys = [...(path && path.t === "path" ? path.d : "").matchAll(/[ML][-\d.]+ ([-\d.]+)/g)].map((x) => Number(x[1]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(300);
  });
  it("hình không gian: dấu góc trùng số đo góc tại cùng đỉnh bị bỏ (không hai nhãn 45°)", () => {
    const spec = { ...(fixtures[0]!.spec as object), marks: [{ type: "right", at: "A", a: "S", b: "C" }, { type: "angle", at: "C", a: "S", b: "A" }], measures: [{ type: "angle_line_plane", line: ["S", "C"], plane: ["A", "B", "C"] }] } as never;
    const out = dedupeAngleMarks(spec) as { marks: { type: string }[] };
    expect(out.marks.map((m) => m.type)).toEqual(["right"]);
    const m = buildFigureModel({ kind: "solid3d", spec });
    expect(m.solid!.scene.labels.filter((l) => l.kind === "angle")).toHaveLength(1);
    expectNoOverlap(m.labels, "chóp có góc");
  });
});

describe("công thức → chữ cho thẻ meta/OG", () => {
  it("tích phân, phân số, căn, nhân", () => {
    expect(texToText("Tính tích phân $I = \\displaystyle\\int_1^e \\frac{\\ln x}{x}\\,dx$.")).toBe("Tính tích phân I = ∫[1→e] (ln x)/x dx.");
    expect(texToText("Giải $4^x - 6\\cdot 2^x + 8 = 0$")).toBe("Giải 4^x - 6· 2^x + 8 = 0");
    expect(texToText("$SA = a\\sqrt{2}$, $SA \\perp (ABC)$")).toBe("SA = a√2, SA ⊥ (ABC)");
    expect(texToText("Đáp số **3/8**")).toBe("Đáp số 3/8");
  });
});
