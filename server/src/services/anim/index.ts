/** Dựng hoạt hình toán từ mẫu cố định: Manim (Python) hoặc HyperFrames (HTML). Hàng đợi 1 việc, bọc khoá nặng, cache theo băm đặc tả. */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { HF_TEMPLATES, type HfSpec, hyperframesHtml } from "./hfHtml";
import { AnimSpec, TEMPLATES, type TemplateName } from "./spec";

export { AnimSpec, TEMPLATES, type TemplateName } from "./spec";
export { CATALOG, prefilter } from "./catalog";
const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
/** Mẫu → [tệp Python, lớp Scene] trong services/manim. */
const MANIM_CLASS: Record<string, [string, string]> = {
  do_thi_ham_so: ["templates.py", "DoThiHamSo"],
  bien_doi_cong_thuc: ["templates.py", "BienDoiCongThuc"],
  hinh_hoc_dien_tich: ["templates.py", "HinhHocDienTich"],
  truc_so: ["templates.py", "TrucSo"],
  vong_tron_luong_giac: ["templates_toan.py", "VongTronLuongGiac"],
  do_thi_luong_giac: ["templates_toan.py", "DoThiLuongGiac"],
  vecto: ["templates_toan.py", "Vecto"],
  hinh_khong_gian_xoay: ["templates_toan.py", "HinhKhongGianXoay"],
  dao_ham_tiep_tuyen: ["templates_toan.py", "DaoHamTiepTuyen"],
  tich_phan_dien_tich: ["templates_toan.py", "TichPhanDienTich"],
  giao_diem_he_pt: ["templates_toan.py", "GiaoDiemHePt"],
  phep_bien_hinh: ["templates_toan.py", "PhepBienHinh"],
  day_so: ["templates_toan.py", "DaySo"],
  dao_dong_dieu_hoa: ["templates_ly.py", "DaoDongDieuHoa"],
  chuyen_dong_thang: ["templates_ly.py", "ChuyenDongThang"],
  song_co: ["templates_ly.py", "SongCo"],
  tong_hop_luc: ["templates_ly.py", "TongHopLuc"],
};
export const HF_VERSION = "0.9.28";
/** Đổi khi sửa mẫu → cache cũ không dùng lại. */
const TEMPLATE_VERSION = "2";

export type AnimCfg = {
  dataDir: string;
  /** Tiền tố khoá nặng, vd [".../heavy","run","eduvn-anim","--"]. */
  wrap?: string[];
  manimHome: string;
  tinytexBin: string;
  /** Thư mục chứa các tệp mẫu Python (mặc định: services/manim trong repo). */
  manimDir?: string;
  /** Lệnh HyperFrames (mặc định npx --yes hyperframes@bản đã ghim). */
  hfCmd?: string[];
  /** low = thử nhanh (360p/15fps, draft); normal = 720p/30fps. */
  quality?: "low" | "normal";
};

export type AnimResult = { hash: string; file: string; durationMs: number };

export const hashOfSpec = (spec: AnimSpec, quality: "low" | "normal" = "normal") => createHash("sha256").update(JSON.stringify({ v: TEMPLATE_VERSION, q: quality, spec })).digest("hex").slice(0, 24);

async function probeMs(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { timeout: 15_000 });
  return Math.round(Number.parseFloat(stdout) * 1000);
}

async function findFile(dir: string, name: string): Promise<string | null> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const r = await findFile(p, name);
      if (r) return r;
    } else if (e.name === name) return p;
  }
  return null;
}

export function createAnimService(cfg: AnimCfg) {
  const quality = cfg.quality ?? "normal";
  const dir = path.join(cfg.dataDir, "anim");
  const manimDir = cfg.manimDir ?? path.resolve(here, "../../../../services/manim");
  const hfCmd = cfg.hfCmd ?? ["npx", "--yes", `hyperframes@${HF_VERSION}`];
  const inflight = new Map<string, Promise<AnimResult>>();
  let tail: Promise<unknown> = Promise.resolve();
  const wrapped = (bin: string, args: string[]): [string, string[]] => {
    const [b, ...pre] = [...(cfg.wrap ?? []), bin];
    return [b as string, [...pre, ...args]];
  };

  /** Kiểm đặc tả (ném ZodError tiếng Việt nếu sai) và trả bản đã biên dịch + băm. */
  function prepare(input: unknown): { spec: AnimSpec; hash: string } {
    const spec = AnimSpec.parse(input);
    return { spec, hash: hashOfSpec(spec, quality) };
  }
  const fileOf = (hash: string) => path.join(dir, `${hash}.mp4`);

  async function manim(spec: AnimSpec, work: string, out: string): Promise<void> {
    const [file, cls] = MANIM_CLASS[spec.template] as [string, string];
    const specFile = path.join(work, "spec.json");
    await writeFile(specFile, JSON.stringify(spec), "utf8");
    const low = quality === "low";
    const [bin, args] = wrapped(path.join(cfg.manimHome, "bin/manim"), ["render", "-r", low ? "640,360" : "1280,720", "--fps", low ? "15" : "30", "--media_dir", path.join(work, "media"), "--progress_bar", "none", "-o", "clip.mp4", path.join(manimDir, file), cls]);
    await run(bin, args, { cwd: work, timeout: 20 * 60_000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, EDUVN_SPEC: specFile, PYTHONPATH: manimDir, PATH: `${cfg.tinytexBin}:${process.env.PATH ?? ""}` } });
    const made = await findFile(path.join(work, "media", "videos"), "clip.mp4");
    if (!made) throw new Error("Manim không tạo ra video");
    await cp(made, out);
  }

  async function hyperframes(spec: AnimSpec, work: string, out: string): Promise<void> {
    if (!(HF_TEMPLATES as readonly string[]).includes(spec.template)) throw new Error("Mẫu không thuộc HyperFrames");
    const hf = spec as HfSpec;
    const proj = path.join(work, "proj");
    await mkdir(path.join(proj, "assets", "katex"), { recursive: true });
    const katexDist = path.join(path.dirname(createRequire(import.meta.url).resolve("katex/package.json")), "dist");
    await cp(path.join(katexDist, "katex.min.css"), path.join(proj, "assets/katex/katex.min.css"));
    await cp(path.join(katexDist, "fonts"), path.join(proj, "assets/katex/fonts"), { recursive: true });
    await writeFile(path.join(proj, "index.html"), hyperframesHtml(hf), "utf8");
    await writeFile(path.join(proj, "hyperframes.json"), JSON.stringify({ paths: { blocks: "compositions", components: "compositions/components", assets: "assets" } }), "utf8");
    const [bin, args] = wrapped(hfCmd[0] as string, [...hfCmd.slice(1), "render", proj, "--output", out, "--fps", quality === "low" ? "15" : "30", "--quality", quality === "low" ? "draft" : "looks", "--workers", "2", "--quiet"]);
    await run(bin, args, { cwd: work, timeout: 20 * 60_000, maxBuffer: 16 * 1024 * 1024 });
  }

  async function build(spec: AnimSpec, hash: string): Promise<AnimResult> {
    const out = fileOf(hash);
    const have = await stat(out).then((s) => s.size > 0, () => false);
    if (have) return { hash, file: out, durationMs: await probeMs(out) };
    await mkdir(dir, { recursive: true });
    const work = await mkdtemp(path.join(tmpdir(), "eduvn-anim-"));
    try {
      const tmp = path.join(work, "out.mp4");
      if (TEMPLATES[spec.template as TemplateName].engine === "manim") await manim(spec, work, tmp);
      else await hyperframes(spec, work, tmp);
      // chuẩn hoá: H.264 yuv420p, đúng thời lượng (cắt/đệm khung cuối), không âm thanh
      const fin = path.join(work, "fin.mp4");
      await run("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-vf", `tpad=stop_mode=clone:stop_duration=1,scale=${quality === "low" ? "640:360" : "1280:720"},format=yuv420p`, "-t", String(spec.thoiLuong), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", fin], { timeout: 300_000 });
      await rename(fin, `${out}.part`).catch(async () => cp(fin, `${out}.part`));
      await rename(`${out}.part`, out);
      return { hash, file: out, durationMs: await probeMs(out) };
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }

  /** Dựng (hoặc lấy từ cache). Mỗi lúc chỉ một việc; cùng đặc tả dùng chung một lượt. */
  function render(input: unknown): Promise<AnimResult> {
    const { spec, hash } = prepare(input);
    const hit = inflight.get(hash);
    if (hit) return hit;
    const job = tail.catch(() => undefined).then(() => build(spec, hash));
    tail = job;
    inflight.set(hash, job);
    const clear = () => void inflight.delete(hash);
    job.then(clear, clear);
    return job;
  }

  return { prepare, render, fileOf, dir, quality };
}
export type AnimService = ReturnType<typeof createAnimService>;
