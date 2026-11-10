/** Dựng ảnh mẫu (thumbnail) cho thư viện hoạt hình: render ví dụ của từng mẫu ở chất lượng thấp rồi lấy một khung.
 *  Chạy trong khoá nặng:  heavy run eduvn-anim-thumbs -- flock /tmp/eduvn-heavy.lock pnpm exec tsx scripts/anim-thumbs.ts [id,id,…]
 *  Ghi web/public/anim-thumbs/<id>.png (320×180), /tmp/p5b-tpl-<id>.png (640×360) và /tmp/p5b-tpl-times.json. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG } from "../src/services/anim/catalog";
import { createAnimService } from "../src/services/anim";

const only = process.argv[2]?.split(",");
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/public/anim-thumbs");
mkdirSync(out, { recursive: true });
const svc = createAnimService({ dataDir: "/tmp/p5b-thumbs", manimHome: path.join(homedir(), "Apps/manim"), tinytexBin: path.join(homedir(), "Apps/tinytex/bin/x86_64-linux"), quality: "low" });
const times: Record<string, number | string> = {};
for (const c of CATALOG) {
  if (only && !only.includes(c.id)) continue;
  const t0 = Date.now();
  try {
    const dur = Math.min(c.thoiLuong[0], 8);
    const r = await svc.render({ template: c.id, thoiLuong: dur, tieuDe: c.ten, params: c.viDu });
    const at = String(Math.max(dur * 0.78, 1));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", at, "-i", r.file, "-frames:v", "1", "-vf", "scale=320:180", path.join(out, `${c.id}.png`)]);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", at, "-i", r.file, "-frames:v", "1", `/tmp/p5b-tpl-${c.id}.png`]);
    times[c.id] = Math.round((Date.now() - t0) / 100) / 10;
    console.log(c.id, "ok", times[c.id], "s");
  } catch (e) {
    times[c.id] = `LỖI: ${(e as Error).message.slice(0, 300)}`;
    console.log(c.id, times[c.id]);
  }
  writeFileSync("/tmp/p5b-tpl-times.json", JSON.stringify(times, null, 1));
}
