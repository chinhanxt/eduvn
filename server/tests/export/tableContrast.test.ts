import { describe, expect, it } from "vitest";
import { elementHtml } from "../../src/export/slideHtml";

describe("bảng trong slide AI", () => {
  it("ô nền tối có chữ trắng, ô nền sáng giữ chữ đậm", () => {
    const el = {
      id: "t1",
      type: "table",
      left: 0,
      top: 0,
      width: 400,
      height: 100,
      data: [
        [{ text: "Tiêu chí", style: { backcolor: "#1f3a93" } }, { text: "Ghi chú", style: { backcolor: "#fff4cc" } }],
        [{ text: "Số bước" }, { text: "Tô đỏ", style: { color: "#cc0000" } }],
      ],
    };
    const html = elementHtml(el as never, { latex: (t) => t });
    expect(html).toMatch(/background:#1f3a93;color:#ffffff;">Tiêu chí/);
    expect(html).toMatch(/background:#fff4cc;color:#232842;">Ghi chú/);
    expect(html).toMatch(/color:#cc0000;">Tô đỏ/);
  });
});
