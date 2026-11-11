import { describe, expect, it } from "vitest";
import { badgeSheetHtml, qrSvg, seatLabel } from "../src/pages/classroom/badgeSheet";

describe("thẻ lớp in A4", () => {
  it("8 thẻ mỗi trang, thoát ký tự, đủ mã lớp + STT + PIN", () => {
    const cards = Array.from({ length: 9 }, (_, i) => ({ seat: i + 1, fullName: i === 0 ? "<b>An</b>" : `HS ${i + 1}`, pin: "042917", qrUrl: "u" }));
    const html = badgeSheetHtml({ className: "10A1", subject: "Toán", classCode: "K7M4QX", cards, svgs: cards.map(() => "<svg></svg>") });
    expect(html.match(/<section class="page">/g)).toHaveLength(2);
    expect(html.match(/class="badge"/g)).toHaveLength(9);
    expect(html).toContain("&lt;b&gt;An&lt;/b&gt;");
    expect(html).not.toContain("<b>An</b>");
    expect(html).toContain("Lớp 10A1 · Toán");
    expect(html).toContain("<b>09</b>");
    expect(html).toContain("042917");
    expect(seatLabel(7)).toBe("07");
  });
  it("QR là SVG", async () => {
    expect(await qrSvg("http://localhost:5173/hs/qr#abc")).toMatch(/^<svg/);
  });
});
