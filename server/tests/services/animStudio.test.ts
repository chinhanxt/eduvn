import { describe, expect, it } from "vitest";
import { hashOfSpec } from "../../src/services/anim";
import { CATALOG } from "../../src/services/anim/catalog";
import { hyperframesHtml } from "../../src/services/anim/hfHtml";
import { slideSceneHtml } from "../../src/services/anim/hfStudio";
import { AnimSpec } from "../../src/services/anim/spec";
import { VT, addF, combo, mulF, schedule, titleHtml, toFrac } from "../../src/services/anim/studio";

/** Thời điểm mọi tween trong dòng thời gian GSAP sinh ra (tham số vị trí cuối mỗi lệnh tl.*). */
const times = (html: string) =>
  [...html.matchAll(/tl\.(?:fromTo|to)\((?:[^;]*?)\}, ([\d.]+)\);/g)].map((m) => Number(m[1])).sort((a, b) => a - b);

const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (c[0] as number) + 0.7152 * (c[1] as number) + 0.0722 * (c[2] as number);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

describe("token video Giấy học thuật", () => {
  it("mọi màu chữ/vật thể đạt AA (≥ 4,5:1) trên nền giấy; tổ hợp không dùng cam làm màu chủ đạo", () => {
    const th = VT.themes.giay;
    for (const k of ["ink", "ink2", "ink3", "accent", "ok", "bad"] as const) expect(contrast(th[k], th.bg), k).toBeGreaterThanOrEqual(4.5);
    for (const [k, v] of Object.entries(VT.palette)) if (!k.startsWith("$")) expect(contrast(v, th.bg), k).toBeGreaterThanOrEqual(4.5);
    for (const name of Object.keys(VT.combos).filter((k) => !k.startsWith("$"))) {
      const c = combo(name as never);
      expect(c.length).toBeGreaterThanOrEqual(3);
      expect(c).not.toContain(VT.palette.cam);
    }
    expect(VT.canvas).toEqual({ w: 1920, h: 1080, fps: 30 });
  });

  it("lịch beat phủ đều thân cảnh, chừa mở đầu và giữ kết", () => {
    const B = schedule(57, [1, 1, 1, 1, 1, 1]);
    expect(B[0]?.start).toBeGreaterThan(0);
    const last = B[B.length - 1] as (typeof B)[number];
    expect(last.start + last.slot).toBeLessThanOrEqual(57);
    expect(57 - (last.start + last.slot)).toBeLessThanOrEqual(VT.motion.holdMax + 0.01);
    expect(B[1]?.at(1, 3)).toBeCloseTo((B[1]?.start as number) + (B[1]?.slot as number) / 3, 1);
  });

  it("phân số xác suất: nhận mẫu số nhỏ, nhân/cộng rút gọn", () => {
    expect(toFrac(0.625)).toMatchObject({ n: 5, d: 8 });
    expect(toFrac(0.5714)).toMatchObject({ n: 4, d: 7 });
    expect(toFrac(0.123456).d).toBeUndefined();
    expect(mulF(toFrac(0.625), toFrac(0.5714))).toMatchObject({ n: 5, d: 14 });
    expect(addF([{ v: 5 / 14, n: 5, d: 14 }, { v: 15 / 56, n: 15, d: 56 }])).toMatchObject({ n: 5, d: 8 });
  });

  it("tiêu đề: cụm khái niệm chính tô màu nhấn, chữ AI vẫn escape", () => {
    expect(titleHtml("Sơ đồ cây: bốc bi")).toMatch(/^<span class="kw"><span class="w">Sơ<\/span> <span class="w">đồ<\/span> <span class="w">cây<\/span><\/span>/);
    expect(titleHtml("Xác suất có điều kiện là gì?")).toContain('<span class="kw"><span class="w">Xác</span>');
    expect(titleHtml("<b>x</b> và y")).toContain("&lt;b&gt;");
  });
});

describe("mẫu studio (Venn, cây, từng bước)", () => {
  const venn = { template: "so_do_venn", thoiLuong: 57, tieuDe: "Xác suất có điều kiện qua biểu đồ Venn", params: { tenA: "Biến cố A", tenB: "Biến cố B", tenGiao: "A ∩ B", chuaB: ["Không gian mẫu mới"], chuaGiao: ["P(A|B) xét trên B"], xacSuat: { A: 0.45, B: 0.5, giao: 0.3 } } };

  it("Venn có xác suất: 1920×1080, khung Ω biến hình thành vòng B, số đếm lên, công thức với số; không khoảng chết > 4 s", () => {
    const html = hyperframesHtml(AnimSpec.parse(venn) as never);
    expect(html).toContain('data-width="1920"');
    expect(html).toContain('data-height="1080"');
    expect(html).toMatch(/tl\.to\("#mo", \{"attr":\{"x":[\d.]+,"y":[\d.]+,"width":\d+/);
    expect(html).toContain("onUpdate");
    expect(html).toContain("không gian mẫu mới");
    expect(html).toMatch(/id="f2">[^]*?class="mfrac"/);
    expect(html).toContain("assets/fonts/Inter-SemiBold.ttf");
    const ts = times(html).filter((t) => t < 57 - VT.motion.holdMax);
    const gaps = ts.slice(1).map((t, i) => t - (ts[i] as number));
    expect(Math.max(...gaps)).toBeLessThanOrEqual(4);
    expect(Math.max(...ts)).toBeGreaterThan(57 * 0.8);
  });

  it("xacSuat sai (giao > B) bị chặn; không có xacSuat vẫn hợp lệ như cũ", () => {
    expect(AnimSpec.safeParse({ ...venn, params: { ...venn.params, xacSuat: { B: 0.2, giao: 0.3 } } }).success).toBe(false);
    const { xacSuat: _x, ...plain } = venn.params;
    expect(AnimSpec.safeParse({ ...venn, params: plain }).success).toBe(true);
  });

  it("cây xác suất: nhãn phân số, nhánh dựng xong trước nửa sau, kết bằng xác suất toàn phần", () => {
    const spec = AnimSpec.parse({ template: "cay_xac_suat", thoiLuong: 30, tieuDe: "Bốc bi", params: { goc: "Bốc 2 bi", cacNhanh: [{ ten: "Đỏ", xs: 0.625, con: [{ ten: "Đỏ", xs: 0.5714 }, { ten: "Xanh", xs: 0.4286 }] }, { ten: "Xanh", xs: 0.375, con: [{ ten: "Đỏ", xs: 0.7143 }, { ten: "Xanh", xs: 0.2857 }] }] } });
    const html = hyperframesHtml(spec as never);
    expect(html).toContain('class="mfrac"');
    expect(html).toContain("Xác suất toàn phần");
    // nhánh cuối cùng (#f3) được vẽ trước 60% thời lượng
    const m = html.match(/tl\.fromTo\("#f3", \{"strokeDashoffset":1\}[^;]*?, ([\d.]+)\);/);
    expect(Number(m?.[1])).toBeLessThan(30 * 0.6);
  });

  it("từng bước: tiêu đề không đè danh sách, phân số ở cỡ hiển thị, dòng cuối là thẻ kết", () => {
    const spec = AnimSpec.parse({ template: "dien_giai_tung_buoc", thoiLuong: 30, tieuDe: "Xác suất có điều kiện: lấy bi không hoàn lại", params: { cacDong: ["Đề bài dài ".repeat(10), "Bước 1", "Bước 2", "Ta có $P(B|A) = \\frac{4}{7}$", "Lưu ý: mẫu số giảm"] } });
    const html = hyperframesHtml(spec as never);
    const listTop = Number(html.match(/#lst\{position:absolute;left:[\d.]+px;top:([\d.]+)px/)?.[1]);
    const h1 = html.match(/<h1 id="tt" style="left:[\d.]+px;top:(\d+)px;[^"]*font-size:(\d+)px/);
    expect(listTop).toBeGreaterThanOrEqual(Number(h1?.[1]) + Number(h1?.[2]) * 1.16);
    expect(html).toMatch(/class="mfrac"/);
    expect(html).toContain('class="ecap">Ghi nhớ<');
  });

  it("cảnh slide cùng hệ: tiêu đề, các ý, công thức, thẻ ghi chú, lời giảng", () => {
    const html = slideSceneHtml({ thoiLuong: 12, meta: "Toán 11", tieuDe: "Xác suất có điều kiện", yChinh: ["Ý một", "Ý hai có $x$"], congThuc: "P(A\\mid B)", ghiChu: { tieuDe: "Lưu ý", noiDung: "Chỉ khi $P(B)>0$" }, captions: [{ t: 0.5, text: "Câu <một>" }] });
    expect(html).toContain('id="fm"');
    expect(html).toContain('id="gc"');
    expect(html).toContain("&lt;một&gt;");
    expect(html.match(/class="yi"/g)).toHaveLength(2);
  });

  it("băm cache đổi khi có lời giảng kèm", () => {
    const s = AnimSpec.parse(venn);
    expect(hashOfSpec(s, "hd")).not.toBe(hashOfSpec(s, "hd", "giay", { captions: [{ t: 1, text: "a" }] }));
    expect(hashOfSpec(s, "hd")).not.toBe(hashOfSpec(s, "normal"));
  });

  it("danh mục ghi tham số xacSuat cho Venn", () => {
    expect(CATALOG.find((c) => c.id === "so_do_venn")?.thamSo).toContain("xacSuat");
  });
});
