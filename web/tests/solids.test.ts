// web/tests/solids.test.ts
import { describe, expect, it } from "vitest";
import { type SolidState, SOLIDS, angleDeg, fmtDeg, hiddenEdges, nextPointName, pickEdgePoint, pickPoint, project, resolvePoint, sectionPolygon, shapeName, solidScene } from "../src/board/solids";

const cube = (p: Partial<SolidState> = {}): SolidState => ({ kind: "cube", cx: 400, cy: 360, size: 200, th: 0.62, ph: 0.42, points: [], section: null, angle: null, ...p });
const MNP = [{ name: "M", a: 0, b: 1, t: 0.5 }, { name: "N", a: 1, b: 2, t: 0.5 }, { name: "P", a: 2, b: 6, t: 0.5 }];

describe("hình lập phương", () => {
  it("nhìn chéo: đúng 3 cạnh khuất", () => {
    expect(hiddenEdges(cube()).filter(Boolean)).toHaveLength(3);
  });
  it("mặt phẳng qua trung điểm AB, BC, CC' cắt theo lục giác đều, góc 120°", () => {
    const st = cube({ points: MNP });
    const poly = sectionPolygon(SOLIDS.cube, resolvePoint(st, "M")!, resolvePoint(st, "N")!, resolvePoint(st, "P")!);
    expect(poly).toHaveLength(6);
    expect(shapeName(poly!)).toBe("lục giác đều");
    expect(angleDeg(poly![5]!, poly![0]!, poly![1]!)).toBeCloseTo(120, 6);
  });
  it("mặt chéo ACC'A' là hình chữ nhật", () => {
    const st = cube();
    const poly = sectionPolygon(SOLIDS.cube, resolvePoint(st, "A")!, resolvePoint(st, "C")!, resolvePoint(st, "C'")!);
    expect(shapeName(poly!)).toBe("hình chữ nhật");
  });
  it("3 điểm thẳng hàng → không có mặt phẳng", () => {
    const st = cube({ points: [{ name: "M", a: 0, b: 1, t: 0.5 }] });
    expect(sectionPolygon(SOLIDS.cube, resolvePoint(st, "A")!, resolvePoint(st, "M")!, resolvePoint(st, "B")!)).toBeNull();
  });
  it("góc ABC = 90°; định dạng dấu phẩy", () => {
    const st = cube();
    expect(angleDeg(resolvePoint(st, "A")!, resolvePoint(st, "B")!, resolvePoint(st, "C")!)).toBeCloseTo(90, 6);
    expect(fmtDeg(54.7356)).toBe("54,7°");
  });
  it("cảnh có thiết diện + góc + nhãn", () => {
    const sc = solidScene(cube({ points: MNP, section: ["M", "N", "P"], angle: ["M", "N", "P"] }));
    expect(sc.section?.name).toBe("lục giác đều");
    expect(sc.labels.map((l) => l.name)).toEqual(["A", "B", "C", "D", "A'", "B'", "C'", "D'", "M", "N", "P"]);
    expect(sc.angle?.value).toBeCloseTo(120, 6);
  });
});

describe("chọn điểm trên màn hình", () => {
  it("bấm gần trung điểm AB → điểm trên cạnh, t = 1/2; bấm vào đỉnh → không tạo điểm mới", () => {
    const st = cube();
    const [ax, ay] = project(st, SOLIDS.cube.verts[0]!);
    const [bx, by] = project(st, SOLIDS.cube.verts[1]!);
    expect(pickEdgePoint(st, (ax + bx) / 2 + 2, (ay + by) / 2 - 1)).toEqual({ a: 0, b: 1, t: 0.5 });
    expect(pickEdgePoint(st, ax, ay)).toBeNull();
    expect(pickPoint(st, ax + 3, ay - 2)).toBe("A");
  });
  it("tên điểm kế tiếp bỏ tên đã dùng", () => {
    expect(nextPointName(cube())).toBe("M");
    expect(nextPointName(cube({ points: [{ name: "M", a: 0, b: 1, t: 0.5 }] }))).toBe("N");
  });
});

describe("hình chóp S.ABCD", () => {
  it("mặt phẳng qua trung điểm SA, SB, SC song song đáy → hình vuông", () => {
    const st: SolidState = { kind: "pyramid4", cx: 400, cy: 360, size: 200, th: 0.6, ph: 0.4, points: [{ name: "M", a: 4, b: 0, t: 0.5 }, { name: "N", a: 4, b: 1, t: 0.5 }, { name: "P", a: 4, b: 2, t: 0.5 }], section: null, angle: null };
    const poly = sectionPolygon(SOLIDS.pyramid4, resolvePoint(st, "M")!, resolvePoint(st, "N")!, resolvePoint(st, "P")!);
    expect(poly).toHaveLength(4);
    expect(shapeName(poly!)).toBe("hình vuông");
  });
});
