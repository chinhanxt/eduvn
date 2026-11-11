/** Đường dẫn + cấu hình bộ thành phần services/anim-kit (hợp đồng docs/anim-studio/kit-api.md). */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tokens from "../../../../services/video-theme/tokens.json";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../../..");
export const KIT_DIR = path.join(REPO_ROOT, "services/anim-kit");
export const GEO_DIR = path.join(KIT_DIR, "assets/geo");
export const FONT_DIR = path.join(REPO_ROOT, "services/video-theme/fonts");
export const KIT_VERSION = "1";
export const TOKENS = tokens;

const req = createRequire(import.meta.url);
export const GSAP_DIST = path.join(path.dirname(req.resolve("gsap/package.json")), "dist");
export const KATEX_DIST = path.join(path.dirname(req.resolve("katex/package.json")), "dist");
export const GSAP_FILES = ["gsap.min.js", "DrawSVGPlugin.min.js", "MorphSVGPlugin.min.js", "MotionPathPlugin.min.js"];

/** Hàm của window.EK (kit.js) — lint chặn EK.<tên> khác. */
export const EK_API = ["b", "cue", "end", "color", "combo", "rand", "enter", "exit", "draw", "arrow", "grow", "morph", "count", "mark", "unmark", "focus", "unfocus", "camera", "words", "swap", "follow", "fill", "tint"] as const;

const th = tokens.themes.giay;
/** Tên màu token → hex (bảng phân loại + vai trò của theme). */
export const TOKEN_COLORS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(tokens.palette).filter(([k]) => !k.startsWith("$"))),
  accent: th.accent,
  ink: th.ink,
  ink2: th.ink2,
  ink3: th.ink3,
  ok: th.ok,
  bad: th.bad,
  line: th.line,
  surface: th.surface,
  bg: th.bg,
  sunken: th.sunken,
  grid: th.grid,
  accentSoft: th.accentSoft,
};

export type BeatCfg = { i: number; t0: number; t1: number; cue: number };

/** window.EK_CFG tiêm vào trang. */
export function kitConfig(o: { duration: number; beats: BeatCfg[] }) {
  return {
    duration: o.duration,
    beats: o.beats,
    colors: TOKEN_COLORS,
    combos: tokens.combos,
    motion: tokens.motion,
    markAlpha: th.markAlpha,
    fillAlpha: th.fillAlpha,
  };
}
