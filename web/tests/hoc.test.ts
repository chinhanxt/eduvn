import { describe, expect, it } from "vitest";
import { parseBlocks, parseInline, parseSse } from "../src/hoc/text";

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
