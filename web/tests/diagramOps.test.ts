import { describe, expect, it } from "vitest";
import { addChild, addLink, addSibling, buildDoc, removeNodes, sampleDoc } from "../src/diagram/ops";
import { routeAll } from "../src/diagram/route";

describe("thao tác sơ đồ", () => {
  it("Tab thêm con, Enter thêm ngang hàng, xoá kéo theo nhánh con", () => {
    const m = sampleDoc("mind");
    const root = m.nodes.find((n) => !n.parent)!;
    const c = addChild(m, root.id);
    expect(c.doc.nodes.find((n) => n.id === c.id)!.parent).toBe(root.id);
    expect(c.doc.edges.some((e) => e.to === c.id && e.kind === "tree")).toBe(true);
    const s = addSibling(c.doc, c.id);
    expect(s.doc.nodes.find((n) => n.id === s.id)!.parent).toBe(root.id);
    const g = addChild(s.doc, c.id);
    const after = removeNodes(g.doc, [c.id]);
    expect(after.nodes.some((n) => n.id === c.id || n.id === g.id)).toBe(false);
    expect(after.edges.every((e) => after.nodes.some((n) => n.id === e.from) && after.nodes.some((n) => n.id === e.to))).toBe(true);
  });
  it("nối mũi tên không trùng, không tự nối", () => {
    const f = sampleDoc("flow");
    const [a, b] = f.nodes;
    const l = addLink(f, b!.id, a!.id);
    expect(l.id).not.toBeNull();
    expect(addLink(l.doc, b!.id, a!.id).id).toBeNull();
    expect(addLink(f, a!.id, a!.id).id).toBeNull();
  });
  it("buildDoc từ kết quả AI: sắp xếp, mọi đường đều có tuyến", () => {
    const d = buildDoc("mind", [{ id: "1", label: "Quang hợp" }, { id: "2", label: "Ánh sáng", parent: "1" }, { id: "3", label: "CO2", parent: "1" }], [{ from: "2", to: "3", label: "cần" }]);
    expect(d.nodes).toHaveLength(3);
    expect(routeAll(d).size).toBe(d.edges.length);
  });
});
