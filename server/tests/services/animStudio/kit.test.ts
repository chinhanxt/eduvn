import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import tokens from "../../../../services/video-theme/tokens.json";
import { EK_API, KIT_DIR, kitConfig } from "../../../src/services/animStudio/kit";

const css = readFileSync(path.join(KIT_DIR, "kit.css"), "utf8");
const js = readFileSync(path.join(KIT_DIR, "kit.js"), "utf8");

type Call = { m: string; target: unknown; vars: Record<string, unknown>; pos: unknown };

/** Chạy kit.js trong vm với gsap/DOM giả: ghi lại lệnh tween. */
function loadKit(nodes: Record<string, object[]> = {}) {
  const calls: Call[] = [];
  const rec = (m: string) => (target: unknown, a: Record<string, unknown>, b?: unknown, c?: unknown) => {
    calls.push({ m, target, vars: m === "fromTo" ? (b as Record<string, unknown>) : a, pos: m === "fromTo" ? c : b });
    return tl;
  };
  const tl = { to: rec("to"), fromTo: rec("fromTo"), from: rec("from"), set: rec("set") };
  const T = 20;
  const window: Record<string, unknown> = { EK_CFG: kitConfig({ duration: T, beats: [{ i: 0, t0: 0, t1: 6, cue: 1.2 }, { i: 1, t0: 6, t1: 20, cue: 6 }] }) };
  const document = { querySelectorAll: (s: string) => nodes[s] ?? [], createElementNS: () => ({ setAttribute() {}, style: {}, appendChild() {} }) };
  const ctx = vm.createContext({ window, document, gsap: { registerPlugin() {} }, getComputedStyle: () => ({ position: "absolute" }), SVGElement: class {}, WeakSet, Math, Object, Array, String, Number, isFinite, parseInt });
  vm.runInContext(js, ctx);
  return { EK: window.EK as Record<string, (...a: unknown[]) => unknown>, tl, calls };
}

describe("kit.css", () => {
  it("biến màu khớp tokens.json (theme giấy + bảng phân loại)", () => {
    const th = tokens.themes.giay;
    for (const [k, v] of Object.entries({ bg: th.bg, ink: th.ink, ink3: th.ink3, accent: th.accent, line: th.line, surface: th.surface, ok: th.ok, bad: th.bad })) expect(css).toContain(`--${k}:${v};`);
    for (const [k, v] of Object.entries(tokens.palette)) if (!k.startsWith("$")) expect(css).toContain(`--c-${k}:${v};`);
  });
  it("lưới 12 cột đúng token (lề 120, rãnh 24)", () => {
    expect(css).toContain(".ek-col-1{left:120px}");
    expect(css).toContain(".ek-col-12{left:1682px}");
    expect(css).toContain(".ek-span-12{width:1680px}");
  });
  it("không có màu literal ngoài khối :root và hàm rgba của token", () => {
    const body = css.replace(/:root\{[\s\S]*?\n\}/, "");
    expect(body.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
  it("cỡ chữ ≥ 36 px trừ .ek-meta", () => {
    const sizes = [...css.matchAll(/([.#][\w-]+)[^{}]*\{[^}]*font-size:(\d+)px/g)].filter((m) => Number(m[2]) < 36).map((m) => m[1]);
    expect(sizes).toEqual([".ek-meta"]);
  });
});

describe("kit.js", () => {
  it("API đúng hợp đồng kit-api.md", () => {
    const { EK } = loadKit();
    const fns = Object.keys(EK).filter((k) => typeof EK[k] === "function").sort();
    expect(fns).toEqual([...EK_API].sort());
    const doc = readFileSync(path.resolve(KIT_DIR, "../../docs/anim-studio/kit-api.md"), "utf8");
    for (const f of EK_API) expect(doc).toContain(`EK.${f}(`);
  });
  it("mốc beat từ EK_CFG", () => {
    const { EK } = loadKit();
    expect(EK.b!(1, 0.5)).toBe(13);
    expect(EK.cue!(0)).toBe(1.2);
    expect(EK.end!(0)).toBe(6);
    expect(() => EK.b!(5)).toThrow(/không có beat 5/);
  });
  it("enter dùng ease token, selector không khớp thì ném lỗi", () => {
    const { EK, tl, calls } = loadKit({ "#a": [{}] });
    EK.enter!(tl, "#a", 1.234);
    expect(calls[0]).toMatchObject({ m: "fromTo", pos: 1.23, vars: { opacity: 1, ease: tokens.motion.ease.enter } });
    expect(() => EK.enter!(tl, "#khong", 1)).toThrow(/không có phần tử khớp/);
  });
  it("camera tối đa 1 lần và phải chậm", () => {
    const { EK, tl } = loadKit({ ".ek-world": [{}] });
    expect(() => EK.camera!(tl, 1, 0.5, { scale: 1.1 })).toThrow(/chậm/);
    const k2 = loadKit({ ".ek-world": [{}] });
    k2.EK.camera!(k2.tl, 1, 2, { x: -100 });
    expect(() => k2.EK.camera!(k2.tl, 5, 2, { x: 0 })).toThrow(/1 chuyển động camera/);
  });
  it("màu chỉ theo token; count định dạng Việt", () => {
    const el = { textContent: "" };
    const { EK, tl, calls } = loadKit({ "#n": [el] });
    expect(() => EK.color!("cam-chay")).toThrow(/không phải màu token/);
    expect(EK.color!("lam")).toBe(tokens.palette.lam);
    EK.count!(tl, "#n", 0, 1234.5, 2, 1);
    expect(el.textContent).toBe("0,0");
    (calls[0]!.vars.onUpdate as () => void).call(null);
    expect(el.textContent).toBe("0,0");
  });
  it("rand có hạt giống tất định", () => {
    const { EK } = loadKit();
    const a = (EK.rand!(7) as () => number)();
    const b = (EK.rand!(7) as () => number)();
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });
});
