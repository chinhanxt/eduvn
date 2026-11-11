import { describe, expect, it } from "vitest";
import { mermaidSvg } from "../src/hoc/FigureDiagram";
import { parseMermaid } from "../src/hoc/mermaid";
import { calloutBody, parseBlocks, parseInline, parseSse } from "../src/hoc/text";

describe("SSE", () => {
  it("tách sự kiện trọn vẹn, giữ phần dư cho lần sau", () => {
    const a = parseSse('data: {"type":"delta","text":"Xin"}\n\ndata: {"type":"del');
    expect(a.events).toEqual([{ type: "delta", text: "Xin" }]);
    const b = parseSse(`${a.rest}ta","text":" chào"}\n\ndata: bad\n\n`);
    expect(b.events).toEqual([{ type: "delta", text: " chào" }]);
    expect(b.rest).toBe("");
  });
});

describe("Markdown gia sư", () => {
  it("tiêu đề, danh sách, mã, công thức khối", () => {
    const b = parseBlocks("### Công thức\nDòng một\nDòng hai\n\n- ý 1\n- ý 2\n\n1. bước\n2. bước\n\n```python\nprint(1)\n```\n$$\na^2+b^2\n$$\n$$x$$");
    expect(b.map((x) => x.kind)).toEqual(["h", "p", "ul", "ol", "code", "math", "math"]);
    expect(b[1]).toMatchObject({ text: "Dòng một Dòng hai" });
    expect(b[4]).toMatchObject({ lang: "python", code: "print(1)" });
    expect(b[5]).toMatchObject({ tex: "a^2+b^2" });
    expect(b[6]).toMatchObject({ tex: "x" });
  });
  it("đường kẻ, trích dẫn >, bảng", () => {
    const b = parseBlocks("Mở đầu\n---\n> ⚠️ Lưu ý\n> hai dòng\n\n| A | B |\n|---|---|\n| 1 | $x$ |\n| 2 | 3 |");
    expect(b.map((x) => x.kind)).toEqual(["p", "hr", "quote", "table"]);
    expect(b[2]).toMatchObject({ text: "⚠️ Lưu ý hai dòng" });
    expect(b[3]).toMatchObject({ head: ["A", "B"], rows: [["1", "$x$"], ["2", "3"]] });
  });
  it("trích dẫn [n] chỉ thành nút khi số hợp lệ; đậm và mã", () => {
    const p = parseInline("Theo **định nghĩa** [1] và [7], dùng `x` [2]", [1, 2]);
    expect(p.filter((x) => x.kind === "cite").map((x) => x.n)).toEqual([1, 2]);
    expect(p.find((x) => x.kind === "bold")?.text).toBe("định nghĩa");
    expect(p.map((x) => x.text).join("")).toContain("[7]");
    expect(parseInline("*Cần nhớ* và 2*3*4", []).filter((x) => x.kind === "em").map((x) => x.text)).toEqual(["Cần nhớ", "3"]);
  });
});

describe("sửa demo 11/11 — Markdown + toán", () => {
  it("$$…$$ không nuốt chữ sau nó: trích dẫn [n] đi kèm công thức, **đậm** ở dòng sau thành đoạn riêng", () => {
    const src = "Theo định nghĩa, với $P(B)>0$ thì\n$$P(A|B) = \\frac{P(A\\cap B)}{P(B)}$$ [3]\n\n**Bước 2: Tính $P(B)$**\n\nViên đầu lấy từ 8 bi, nên $P(B) = \\frac58$.\n\n$$P(A|B)=\\frac{5}{14}:\\frac{5}{8}=\\frac47$$";
    const b = parseBlocks(src);
    expect(b.map((x) => x.kind)).toEqual(["p", "math", "p", "p", "math"]);
    expect(b[1]).toMatchObject({ tex: "P(A|B) = \\frac{P(A\\cap B)}{P(B)}", after: "[3]" });
    expect(b[2]).toMatchObject({ text: "**Bước 2: Tính $P(B)$**" });
    expect((b[4] as { tex: string }).tex).toBe("P(A|B)=\\frac{5}{14}:\\frac{5}{8}=\\frac47");
  });
  it("$$ giữa dòng và chữ sau dấu đóng: tách thành đoạn chữ + công thức khối + đoạn chữ", () => {
    const b = parseBlocks("Ta có $$x^2=4$$ nên **x = ±2** [1].\nNhiều dòng:\n$$\na+b\n$$ rồi tiếp tục");
    expect(b.map((x) => x.kind)).toEqual(["p", "math", "p", "math", "p"]);
    expect(b[0]).toMatchObject({ text: "Ta có" });
    expect(b[2]).toMatchObject({ text: "nên **x = ±2** [1]. Nhiều dòng:" });
    expect(b[3]).toMatchObject({ tex: "a+b" });
    expect(b[4]).toMatchObject({ text: "rồi tiếp tục" });
  });
  it("dấu * trong công thức $…$ không thành chữ nghiêng; trích dẫn ngoài công thức vẫn nhận", () => {
    const p = parseInline("Tính $a*b*c$ rồi *nhớ* [2]", [2]);
    expect(p.filter((x) => x.kind === "em").map((x) => x.text)).toEqual(["nhớ"]);
    expect(p.map((x) => x.text).join("")).toContain("$a*b*c$");
    expect(p.some((x) => x.kind === "cite" && x.n === 2)).toBe(true);
  });
  it("hộp nhấn: bỏ nhãn AI tự thêm ở đầu, giữ **đậm** trong nội dung", () => {
    expect(calloutBody("**Lỗi thường gặp:** khi lấy **không hoàn lại** …")).toBe("Khi lấy **không hoàn lại** …");
    expect(calloutBody("Lưu ý: dùng $\\frac47$")).toBe("Dùng $\\frac47$");
    expect(calloutBody("**Công thức nhân** là định nghĩa viết lại")).toBe("**Công thức nhân** là định nghĩa viết lại");
  });
});

describe("sửa demo 11/11 — sơ đồ Mermaid của giáo trình", () => {
  const TREE = 'flowchart LR\n G["Bắt đầu: 5 đỏ, 3 xanh"]\n G -->|"5/8"| D1["Lần 1: Đỏ"]\n G -->|"3/8"| X1["Lần 1: Xanh"]\n D1 -->|"4/7"| DD["Đỏ rồi Đỏ: 5/8 × 4/7 = 20/56"]\n D1 -->|"3/7"| DX["Đỏ rồi Xanh"]\n X1 -->|"5/7"| XD["Xanh rồi Đỏ"]\n X1 -->|"2/7"| XX["Xanh rồi Xanh"]';
  it("flowchart: nút, nhãn trong nháy, mũi tên có nhãn |…|", () => {
    const g = parseMermaid(TREE)!;
    expect(g.kind).toBe("flow");
    expect(g.nodes).toHaveLength(7);
    expect(g.nodes.find((n) => n.id === "DD")?.label).toBe("Đỏ rồi Đỏ: 5/8 × 4/7 = 20/56");
    expect(g.links).toContainEqual({ from: "G", to: "D1", label: "5/8" });
    expect(g.links).toHaveLength(6);
  });
  it("các dạng mũi tên khác, chuỗi A --> B --> C, nhóm A & B, hình { } ( ), dòng style bị bỏ qua", () => {
    const g = parseMermaid("graph TD\nA(Bắt đầu) --> B{Điều kiện?} -- Có --> C[Kết quả]\nB -.->|Không| D[(Kho)]\nC & D --> E\nstyle A fill:#f00")!;
    expect(g.nodes.map((n) => [n.id, n.label, n.shape ?? null])).toEqual([["A", "Bắt đầu", "round"], ["B", "Điều kiện?", "diamond"], ["C", "Kết quả", "rect"], ["D", "Kho", "rect"], ["E", "E", null]]);
    expect(g.links).toEqual([{ from: "A", to: "B" }, { from: "B", to: "C", label: "Có" }, { from: "B", to: "D", label: "Không", dashed: true }, { from: "C", to: "E" }, { from: "D", to: "E" }]);
  });
  it("mindmap theo thụt lề; kiểu không hỗ trợ → null", () => {
    const g = parseMermaid("mindmap\n  root((Xác suất))\n    Có điều kiện\n      P(A|B)\n    Công thức nhân\n")!;
    expect(g.kind).toBe("mind");
    expect(g.nodes.map((n) => [n.label, n.parent])).toEqual([["Xác suất", null], ["Có điều kiện", "m0"], ["P(A|B)", "m1"], ["Công thức nhân", "m0"]]);
    expect(parseMermaid("sequenceDiagram\nA->>B: hi")).toBeNull();
  });
  it("dựng thành SVG thật bằng bộ vẽ P10 (không còn mã thô), chữ đã escape", () => {
    const out = mermaidSvg(TREE)!;
    expect(out.svg.startsWith("<svg")).toBe(true);
    expect(out.svg).toContain("Đỏ rồi Đỏ: 5/8 × 4/7 = 20/56");
    expect(out.svg).toContain(">5/8<");
    expect(out.svg).not.toContain("flowchart");
    expect(mermaidSvg('flowchart TD\nA["<img src=x onerror=alert(1)>"] --> B')?.svg).not.toContain("<img");
  });
});
