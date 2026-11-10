// web/tests/geometry3d.test.ts — bộ giải dựng hình, nét khuất, nhãn, số đo, 10 đề mẫu.
import { describe, expect, it } from "vitest";
import { parseSpec } from "../../server/src/domain/geometry3d";
import fixtures from "../../server/tests/fixtures/dung-hinh.json";
import { fmtAngle, fmtLen, fmtRatio, surd } from "../src/geometry3d/fmt";
import { PRESETS, PRESET_MAP, defaultMode, legacySpec } from "../src/geometry3d/presets";
import { type Scene, SGK_VIEW, buildScene, projection, visRuns, makeHidden } from "../src/geometry3d/render";
import { solve } from "../src/geometry3d/solver";
import type { ConstructionSpec } from "../src/geometry3d/spec";
import { sceneSvg } from "../src/geometry3d/svg";

const scene = (spec: ConstructionSpec, view = SGK_VIEW[defaultMode(spec)]) => buildScene(solve(spec), view, { cx: 400, cy: 300, size: 200 });
/** Cạnh khối (theo tên) có phần khuất không — dựa trên bộ giải + phép chiếu. */
function hiddenEdges(spec: ConstructionSpec): string[] {
  const s = solve(spec);
  const { d } = projection(SGK_VIEW[defaultMode(spec)]);
  const hid = makeHidden(s, d);
  const out: string[] = [];
  for (const b of s.bodies)
    if (b.type === "poly")
      for (const [i, j] of b.edges) {
        const runs = visRuns((t) => {
          const a = s.pts.get(i)!, c = s.pts.get(j)!;
          return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
        }, hid);
        if (runs.some((r) => r.hidden)) out.push([i, j].sort().join(""));
      }
  return out.sort();
}

describe("định dạng số đo kiểu SGK", () => {
  it("nhận ra căn thức", () => {
    expect(surd(Math.sqrt(6) / 3)).toEqual([1, 6, 3]);
    expect(fmtLen(Math.sqrt(6) / 3)).toBe("a√6/3");
    expect(fmtLen(2 * Math.sqrt(5) / 5)).toBe("2a√5/5");
    expect(fmtLen(0.5)).toBe("a/2");
    expect(fmtLen(1)).toBe("a");
    expect(fmtLen(Math.PI)).toMatch(/^≈ 3,14a$/);
    expect(fmtRatio(Math.sqrt(2) / 2)).toBe("√2/2");
    expect(fmtAngle(45)).toBe("45°");
    expect(fmtAngle((Math.atan(Math.sqrt(2)) * 180) / Math.PI)).toBe("≈ 54,7° (tan = √2)");
  });
});

describe("nét khuất tính theo mặt che", () => {
  it("lập phương góc SGK: đúng 3 cạnh khuất, cùng đi qua D", () => {
    expect(hiddenEdges(PRESET_MAP.get("lap_phuong")!.spec())).toEqual(["AD", "CD", "DD'"]);
  });
  it("chóp SA ⊥ đáy vuông: SA thấy, chỉ AD, DC, SD khuất", () => {
    expect(hiddenEdges(PRESET_MAP.get("chop_vuong_sa")!.spec())).toEqual(["AD", "CD", "DS"]);
  });
  it("chóp đều: đường cao SO và hai đường chéo đáy khuất hoàn toàn (nằm trong khối)", () => {
    const sc = scene(PRESET_MAP.get("chop_tu_giac_deu")!.spec());
    const aux = sc.lines.filter((l) => l.kind === "aux");
    expect(aux.length).toBeGreaterThanOrEqual(3);
    expect(aux.every((l) => l.hidden)).toBe(true);
  });
  it("tứ diện: chỉ cạnh BD phía sau khuất", () => {
    const spec = PRESET_MAP.get("tu_dien")!.spec();
    expect(hiddenEdges(spec)).toEqual(["BD"]);
  });
  it("hình nón/trụ: nửa sau đường tròn đáy nét đứt, nửa trước nét liền; mặt trên trụ thấy hết", () => {
    for (const id of ["non", "tru"]) {
      const sc = scene(PRESET_MAP.get(id)!.spec());
      const curves = sc.lines.filter((l) => l.kind === "edge" && l.pts.length > 10);
      expect(curves.some((l) => l.hidden)).toBe(true);
      expect(curves.some((l) => !l.hidden)).toBe(true);
    }
    const s = solve(PRESET_MAP.get("tru")!.spec());
    const hid = makeHidden(s, projection(SGK_VIEW.ortho).d);
    // điểm trên vành trên: luôn thấy; điểm trên vành dưới phía sau: khuất
    expect(hid([0, 0.8, 1.6])).toBe(false);
    expect(hid([0, 0.8, 0])).toBe(true);
    expect(hid([0, -0.8, 0])).toBe(false);
  });
  it("mặt cầu: tâm khuất, đường xích đạo nửa sau đứt", () => {
    const s = solve(PRESET_MAP.get("cau")!.spec());
    const hid = makeHidden(s, projection(SGK_VIEW.ortho).d);
    expect(hid([0, 0, 0])).toBe(true);
    expect(hid([0, -1, 0])).toBe(false);
    expect(hid([0, 1, 0])).toBe(true);
  });
});

describe("bộ giải ràng buộc", () => {
  it("điểm theo tỉ lệ, trung điểm, giao điểm, hình chiếu", () => {
    const s = solve({
      points: [
        { type: "polygon", ids: ["A", "B", "C", "D"], shape: "square" },
        { type: "above", id: "S", of: "A", height: 1 },
        { type: "midpoint", id: "M", of: ["S", "C"] },
        { type: "ratio", id: "N", from: "S", to: "B", t: 1 / 3 },
        { type: "intersect", id: "O", line: ["A", "C"], line2: ["B", "D"] },
        { type: "intersect", id: "K", line: ["S", "O"], plane: ["A", "M", "B"] },
        { type: "foot", id: "H", from: "A", line: ["S", "B"] },
      ],
      bodies: [{ type: "pyramid", base: ["A", "B", "C", "D"], apex: "S" }],
    });
    expect(s.errors).toEqual([]);
    const v = (n: string) => s.pts.get(n)!;
    expect(v("O")[0]).toBeCloseTo(0, 9);
    expect(v("M")[2]).toBeCloseTo(0.5, 9);
    expect(v("N")[2]).toBeCloseTo(2 / 3, 9);
    // H là trung điểm SB (tam giác SAB vuông cân tại A)
    expect(v("H")[2]).toBeCloseTo(0.5, 9);
    expect(v("K")[2]).toBeGreaterThan(0);
  });
  it("AI khai báo điểm trước khi dùng vẫn giải được; điểm thiếu → lỗi tiếng Việt", () => {
    const s = solve({ points: [{ type: "midpoint", id: "M", of: ["A", "B"] }, { type: "coord", id: "A", at: [0, 0, 0] }, { type: "coord", id: "B", at: [2, 0, 0] }], bodies: [] });
    expect(s.pts.get("M")).toEqual([1, 0, 0]);
    expect(solve({ points: [{ type: "midpoint", id: "M", of: ["A", "X"] }, { type: "coord", id: "A", at: [0, 0, 0] }], bodies: [] }).errors[0]).toBe("Chưa có điểm X");
  });
  it("hai đường chéo nhau không có giao điểm", () => {
    const s = solve({ ...PRESET_MAP.get("lap_phuong")!.spec(), points: [...PRESET_MAP.get("lap_phuong")!.spec().points, { type: "intersect", id: "I", line: ["A", "B"], line2: ["C", "C'"] }] });
    expect(s.errors.join()).toMatch(/chéo nhau/);
  });
  it("thiết diện lập phương qua trung điểm AB, BC, CC′ là lục giác đều, đỉnh mới được đặt tên", () => {
    const base = PRESET_MAP.get("lap_phuong")!.spec();
    const s = solve({ ...base, points: [...base.points, { type: "midpoint", id: "M", of: ["A", "B"] }, { type: "midpoint", id: "N", of: ["B", "C"] }, { type: "midpoint", id: "P", of: ["C", "C'"] }], sections: [{ through: ["M", "N", "P"] }] });
    expect(s.polys[0]!.shape).toBe("lục giác đều");
    expect(s.polys[0]!.names).toHaveLength(6);
    expect(new Set(s.polys[0]!.names).size).toBe(6);
    expect(s.info[0]).toMatch(/^Thiết diện .+: lục giác đều$/);
  });
});

describe("10 đề mẫu (spec do AI trả, qua zod của server rồi bộ giải)", () => {
  for (const [i, f] of (fixtures as { problem: string; spec: unknown; expect: { info?: string[]; section?: number; polygon?: string } }[]).entries()) {
    it(`đề ${i + 1}: ${f.problem.slice(0, 60)}…`, () => {
      const p = parseSpec(f.spec);
      if (!p.ok) throw new Error(p.issues.join("; "));
      const spec = p.spec as ConstructionSpec;
      const s = solve(spec);
      expect(s.errors).toEqual([]);
      for (const t of f.expect.info ?? []) expect(s.info.join(" | ")).toContain(t);
      if (f.expect.section) expect(s.polys.find((x) => x.kind === "section")?.names).toHaveLength(f.expect.section);
      if (f.expect.polygon) expect(s.polys[0]?.shape).toBe(f.expect.polygon);
      const sc = scene(spec);
      expect(sc.errors).toEqual([]);
      expect(sc.lines.length).toBeGreaterThan(3);
      expect(sceneSvg(sc, "print").svg).toContain("<svg");
    });
  }
});

/** Ô chữ của đỉnh khối có cắt nét nào không. */
function labelHits(sc: Scene): string[] {
  const out: string[] = [];
  for (const l of sc.labels) {
    if (l.kind !== "point" || !l.vertex) continue;
    const b = { x0: l.x - l.w / 2, y0: l.y - l.h / 2, x1: l.x + l.w / 2, y1: l.y + l.h / 2 };
    for (const ln of sc.lines)
      for (let i = 1; i < ln.pts.length; i++) {
        const [a, c] = [ln.pts[i - 1]!, ln.pts[i]!];
        for (let k = 0; k <= 20; k++) {
          const x = a[0] + ((c[0] - a[0]) * k) / 20, y = a[1] + ((c[1] - a[1]) * k) / 20;
          if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) {
            out.push(l.name);
            k = 21;
            i = ln.pts.length;
          }
        }
      }
  }
  return [...new Set(out)];
}

describe("nhãn đỉnh", () => {
  it("mọi hình mẫu: tên đỉnh khối không đè lên nét nào", () => {
    for (const p of PRESETS) expect(labelHits(scene(p.spec())), p.id).toEqual([]);
  });
  it("tên A′ hiển thị dấu phẩy trên kiểu sách", () => {
    expect(scene(PRESET_MAP.get("lap_phuong")!.spec()).labels.map((l) => l.text)).toContain("A′");
  });
});

describe("tương thích bảng cũ", () => {
  it("hình lập phương cũ có điểm trên cạnh + thiết diện + góc dựng lại được", () => {
    const spec = legacySpec({ kind: "cube", points: [{ name: "M", a: 0, b: 1, t: 0.5 }, { name: "N", a: 1, b: 2, t: 0.5 }, { name: "P", a: 2, b: 6, t: 0.5 }], section: ["M", "N", "P"], angle: ["M", "N", "P"] });
    const s = solve(spec);
    expect(s.errors).toEqual([]);
    expect(s.polys[0]!.shape).toBe("lục giác đều");
    expect(s.marks.find((m) => m.type === "angle")).toMatchObject({ text: "120°" });
  });
  it("mọi loại cũ đều ra hình", () => {
    for (const kind of ["cube", "cuboid", "pyramid4", "pyramid3", "prism3"]) expect(solve(legacySpec({ kind, points: [], section: null, angle: null })).bodies).toHaveLength(1);
  });
});
