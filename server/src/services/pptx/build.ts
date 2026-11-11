// Trang SVG → dự án ppt-master (svg_output/, notes/, audio/, images/, animations.json) → .pptx gốc.
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Canvas, Page } from "./pages";
import { type SidecarCfg, type TemplateInfo, runSidecar } from "./sidecar";
import { PAPER_STYLE, type Style, hexColor } from "./svg";

const exec = promisify(execFile);

export type PptxBuildOpts = {
  /** Thư mục chứa mp3 lời giảng (tên tệp trong Page.audio). */
  audioDir?: string;
  /** Nhúng giọng đọc từng trang (trình chiếu tự chạy theo lời). */
  narration?: boolean;
  /** Phần tử xuất hiện theo lời giảng. */
  animations?: boolean;
  transition?: string;
  template?: { file: string; info: TemplateInfo } | null;
  images?: Map<string, string>;
  ffmpeg?: string;
  sidecar?: SidecarCfg;
  /** Giữ thư mục dự án để soi lỗi. */
  keepDir?: boolean;
};

export type PptxBuildResult = { buffer: Buffer; route: string; warnings: string[]; formulas: number; slides: number };

const EMU_PER_PX = 9525;

/** Kích thước trang theo mẫu (px, 96 dpi) hoặc 16:9 mặc định. */
export function canvasFor(info?: TemplateInfo | null): Canvas {
  if (!info) return { W: 1280, H: 720 };
  return { W: Math.round((info.width / EMU_PER_PX) * 100) / 100, H: Math.round((info.height / EMU_PER_PX) * 100) / 100 };
}

/** Phong cách lấy từ theme của mẫu/slide tham khảo: màu nhấn accent1–6, chữ dk1, nền lt1, phông major/minor. */
export function styleFromTheme(info: Pick<TemplateInfo, "theme" | "background">, transparentBg: boolean): Style {
  const c = info.theme.colors;
  const accents = [1, 2, 3, 4, 5, 6].map((i) => c[`accent${i}`]).filter((x): x is string => !!x);
  const bg = info.background && info.background.startsWith("#") ? info.background : c.lt1 ?? PAPER_STYLE.bg;
  return {
    ...PAPER_STYLE,
    bg: hexColor(bg, PAPER_STYLE.bg),
    ink: hexColor(c.dk1, PAPER_STYLE.ink),
    muted: hexColor(c.dk2, PAPER_STYLE.muted),
    primary: hexColor(accents[0], PAPER_STYLE.primary),
    palette: accents.length >= 3 ? accents.map((a) => hexColor(a, PAPER_STYLE.primary)) : PAPER_STYLE.palette,
    head: info.theme.fonts.major || PAPER_STYLE.head,
    body: info.theme.fonts.minor || PAPER_STYLE.body,
    transparentBg,
  };
}

async function concatAudio(ffmpeg: string, parts: { file?: string; ms: number }[], dir: string | undefined, out: string): Promise<void> {
  const args: string[] = ["-loglevel", "error", "-y"];
  const labels: string[] = [];
  let i = 0;
  for (const p of parts) {
    const f = p.file && dir ? path.join(dir, path.basename(p.file)) : null;
    const ok = f ? await stat(f).then((s) => s.size > 200, () => false) : false;
    if (ok && f) args.push("-i", f);
    else args.push("-f", "lavfi", "-t", String(Math.max(1, p.ms / 1000)), "-i", "anullsrc=r=24000:cl=mono");
    labels.push(`[${i}:a]aformat=sample_rates=24000:channel_layouts=mono[a${i}]`);
    i++;
  }
  if (i === 0) {
    args.push("-f", "lavfi", "-t", "3", "-i", "anullsrc=r=24000:cl=mono");
    labels.push("[0:a]aformat=sample_rates=24000:channel_layouts=mono[a0]");
    i = 1;
  }
  const fc = `${labels.join(";")};${Array.from({ length: i }, (_x, k) => `[a${k}]`).join("")}concat=n=${i}:v=0:a=1[out]`;
  await exec(ffmpeg, [...args, "-filter_complex", fc, "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "4", out], { timeout: 120_000 });
}

/** Dựng .pptx từ các trang. */
export async function buildPptx(pages: Page[], o: PptxBuildOpts = {}): Promise<PptxBuildResult> {
  const dir = await mkdtemp(path.join(tmpdir(), "eduvn-pptx-"));
  try {
    const proj = path.join(dir, "du_an");
    await mkdir(path.join(proj, "svg_output"), { recursive: true });
    await mkdir(path.join(proj, "notes"), { recursive: true });
    await mkdir(path.join(proj, "images"), { recursive: true });
    await mkdir(path.join(proj, "validation"), { recursive: true });
    for (const [name, data] of o.images ?? []) {
      const b64 = data.slice(data.indexOf(",") + 1);
      await writeFile(path.join(proj, "images", name), Buffer.from(b64, "base64"));
    }
    const narration = !!o.narration;
    if (narration) await mkdir(path.join(proj, "audio"), { recursive: true });
    const anim: Record<string, { groups: Record<string, unknown> }> = {};
    const leadIn = 0.4;
    for (const p of pages) {
      await writeFile(path.join(proj, "svg_output", `${p.stem}.svg`), p.svg, "utf8");
      if (p.notes?.trim()) await writeFile(path.join(proj, "notes", `${p.stem}.md`), p.notes.replace(/^#/gm, "\\#"), "utf8");
      if (narration) {
        const parts = p.audio?.length ? p.audio : [{ ms: 4000 }];
        await concatAudio(o.ffmpeg ?? "ffmpeg", parts, o.audioDir, path.join(proj, "audio", `${p.stem}.mp3`));
      }
      if (o.animations && p.reveals?.length) {
        const groups: Record<string, unknown> = {};
        const sorted = [...p.reveals].sort((a, b) => a.at - b.at);
        sorted.forEach((r, i) => {
          const effect = r.effect ?? "entrance_fade";
          groups[r.group] = narration
            ? { effect, order: i + 1, trigger: "with-previous", delay: Math.round((Math.max(0, r.at) + leadIn + (r.at < 0 ? 0.6 + i * 0.8 : 0)) * 100) / 100, duration: 0.5 }
            : { effect, order: i + 1, trigger: "on-click", duration: 0.45 };
        });
        anim[p.stem] = { groups };
      }
    }
    if (Object.keys(anim).length) await writeFile(path.join(proj, "animations.json"), JSON.stringify({ version: 1, slides: anim }, null, 1));
    const output = path.join(dir, "ket-qua.pptx");
    const job = {
      project: proj,
      output,
      narration,
      transition: o.transition ?? "fade",
      ...(o.template ? { template: { path: o.template.file, useMasterBackground: true }, slides: pages.map((p) => ({ layout: p.layout, ...(p.ph?.title && { title: p.ph.title }), ...(p.ph?.subtitle && { subtitle: p.ph.subtitle }), ...(p.ph?.body && { body: p.ph.body }) })) } : {}),
    };
    await writeFile(path.join(dir, "job.json"), JSON.stringify(job), "utf8");
    const r = await runSidecar<{ output: string; route: string; formulas: number; warnings: string[]; detail?: string }>(["build", path.join(dir, "job.json")], { cfg: o.sidecar });
    if (!r.ok) throw new Error(`${r.error ?? "ppt-master lỗi"}${r.detail ? `: ${r.detail.split("\n").slice(-3).join(" | ")}` : ""}`);
    return { buffer: await readFile(output), route: r.route, warnings: r.warnings ?? [], formulas: r.formulas ?? 0, slides: pages.length };
  } finally {
    if (!o.keepDir) await rm(dir, { recursive: true, force: true });
  }
}
