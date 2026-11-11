// Port ý tưởng từ OpenMAIC lib/video-export (compile → IR → emit) (MIT), đã sửa: không dùng render-service/HyperFrames;
// IR chụp khung bằng Chrome headless (playwright-core + trình duyệt có sẵn) rồi FFmpeg ghép giọng đọc.
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import katex from "katex";
import { chromium } from "playwright-core";
import { readVendor } from "../services/aiLessons/vendor";
import { qrPath } from "../services/pptx/svg";
import type { StoredScene } from "../services/aiLessons/types";
import { type Timeline, compileTimeline, toSrt } from "./aiLessonTimeline";
import { type Canvas, type QuizQ, quizHtml, quizQuestionHtml, slideHtml } from "./slideHtml";

const run = promisify(execFile);
const W = 1280;
const H = 720;
const ORIGIN = "http://eduvn.local";
const KATEX_CSS = '<link rel="stylesheet" href="/vendor/interactive/katex@0.16.38/dist/katex.min.css">';

// Khung video: 1280×720, phần hình (slide/câu hỏi/hoạt hình) thu vào 1100×619 ở trên, dải phụ đề 101 px nền đặc ở dưới (tối đa 2 dòng) — phụ đề không đè nội dung.
const STAGE_W = 1100;
const STAGE_H = 619;
const BAND_BG = "#0d1024";
const BAND_CSS = `html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}#v{position:absolute;left:${(W - STAGE_W) / 2}px;top:0;width:${STAGE_W}px;height:${STAGE_H}px;border:0;background:#fff}#band{position:absolute;left:0;right:0;top:${STAGE_H}px;height:${H - STAGE_H}px;display:flex;align-items:center;justify-content:center;padding:0 48px;box-sizing:border-box;background:${BAND_BG};color:#fff;text-align:center;font:600 25px/1.3 'Be Vietnam Pro','Segoe UI',Roboto,'Noto Sans','DejaVu Sans',sans-serif}#s{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}`;
/** Trang khung: slide/câu hỏi (tài liệu HTML do ta dựng, đã escape) nhúng thẳng vào ô 1100×619 + dải phụ đề; cảnh tương tác (mã AI) vào iframe sandbox "allow-scripts". */
// Không in phụ đề (OM-810): hình chiếm trọn khung, không có dải dưới (phụ đề đi riêng tệp .srt).
const NOBAND_CSS = `#v{left:0!important;width:${W}px!important;height:${H}px!important}#band{display:none}`;
/** Mã QR "Vào … để làm" góc phải trên (cảnh câu hỏi/tương tác — OM-811). */
const qrBadge = (url: string) => `<div id="qr" style="position:absolute;right:16px;top:12px;z-index:30;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e6decc;border-radius:12px;padding:8px 12px 8px 8px;box-shadow:0 2px 10px rgba(0,0,0,.08);font:600 15px/1.3 Inter,'Segoe UI',Roboto,sans-serif;color:#1f2428"><svg width="92" height="92" viewBox="0 0 92 92">${qrPath(url, 0, 0, 92, "#1f2428")}</svg><span>Quét mã hoặc vào<br><b style="color:#2f5d8a">${url.replace(/^https?:\/\//, "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</b><br>để tự làm</span></div>`;
const framed = (inner: string, sub: string, sandbox: string, o: { noBand?: boolean; qr?: string } = {}) => {
  const subHtml = sub.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const band = `<div id="band"><span id="s">${subHtml}</span></div>${o.qr ? qrBadge(o.qr) : ""}`;
  const extra = o.noBand ? NOBAND_CSS : "";
  if (sandbox) return `<!doctype html><html><head><meta charset="utf-8"><style>body{background:${BAND_BG}}${BAND_CSS}${extra}</style></head><body><iframe id="v" sandbox="${sandbox}" srcdoc="${inner.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe>${band}</body></html>`;
  const head = /<head>([\s\S]*?)<\/head>/.exec(inner)?.[1] ?? "";
  const body = /<body>([\s\S]*)<\/body>/.exec(inner)?.[1] ?? inner;
  return `<!doctype html><html><head>${head}<style>body{background:${BAND_BG}}${BAND_CSS}#v{overflow:hidden}${extra}</style></head><body><div id="v">${body}</div>${band}</body></html>`;
};
/** Chỉ dải phụ đề trên nền trong suốt (để phủ lên clip hoạt hình). */
const bandOnly = () => `<!doctype html><html><head><meta charset="utf-8"><style>body{background:transparent}${BAND_CSS}</style></head><body><div id="band"><span id="s"></span></div></body></html>`;

const latex = (tex: string) => {
  try {
    return katex.renderToString(tex, { throwOnError: false, output: "html" });
  } catch {
    return tex;
  }
};

export type VideoOpts = {
  chromePath: string;
  outDir: string;
  /** Thư mục clip hoạt hình toán (<hash>.mp4). */ animDir?: string;
  onProgress?: (done: number, total: number) => void;
  /** OM-810: độ phân giải (cao px: 720/1080/2160), khung hình/giây, chất lượng, in cứng phụ đề. */
  height?: 720 | 1080 | 2160;
  fps?: 24 | 25 | 30 | 60;
  quality?: "nhap" | "chuan" | "cao";
  burnSubtitles?: boolean;
  /** OM-811: liên kết mở bài → mã QR trên khung câu hỏi/tương tác. */
  qrUrl?: string;
  /** OM-812: huỷ việc dựng. */
  signal?: AbortSignal;
  /** Tên tệp ra (mặc định bai-giang.mp4 / phu-de.srt). */
  baseName?: string;
};
export type VideoResult = { video: string; srt: string; totalMs: number; frames: number; diagnostics: string[] };

let busy: Promise<unknown> = Promise.resolve();
/** Mỗi lúc chỉ dựng một video (tránh treo máy khi nhiều GV bấm cùng lúc). */
export function renderLessonVideo(title: string, scenes: StoredScene[], audioDir: string, opts: VideoOpts): Promise<VideoResult> {
  const job = busy.catch(() => undefined).then(() => doRender(title, scenes, audioDir, opts));
  busy = job;
  return job;
}

async function doRender(title: string, scenes: StoredScene[], audioDir: string, opts: VideoOpts): Promise<VideoResult> {
  const OH = opts.height ?? 720;
  const OW = Math.round((OH * 16) / 9);
  const FPS = opts.fps ?? 25;
  const Q = { nhap: ["veryfast", "30"], chuan: ["veryfast", "27"], cao: ["medium", "21"] }[opts.quality ?? "chuan"] as [string, string];
  const noBand = opts.burnSubtitles === false;
  const sig = opts.signal;
  const halt = () => {
    if (sig?.aborted) throw new Error("Đã huỷ dựng video");
  };
  const ff = (args: string[]) => run("ffmpeg", args, { timeout: 300_000, signal: sig });
  const tl: Timeline = compileTimeline(title, scenes);
  if (tl.segments.length === 0) throw new Error("Bài giảng chưa có cảnh nào để dựng video");
  await mkdir(opts.outDir, { recursive: true });
  const work = await mkdtemp(path.join(tmpdir(), "eduvn-video-"));
  const browser = await chromium.launch({ executablePath: opts.chromePath, args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: OH / H });
    const page = await ctx.newPage();
    let current = "";
    await page.route(`${ORIGIN}/**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/frame") return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: current });
      const v = await readVendor(url.pathname);
      if (v) return route.fulfill({ status: 200, contentType: v.mime, body: v.body, headers: { "access-control-allow-origin": "*" } });
      return route.fulfill({ status: 404, body: "" });
    });
    const show = async (html: string) => {
      current = html;
      await page.goto(`${ORIGIN}/frame`, { waitUntil: "load" });
      for (const f of page.frames()) await f.evaluate(() => document.fonts.ready).catch(() => undefined);
    };
    const qrFor = (kind: string) => (opts.qrUrl && (kind === "quiz" || kind === "interactive") ? opts.qrUrl : undefined);
    const setSub = (t: string) => page.evaluate((x) => { const el = document.getElementById("s"); if (el) el.textContent = x; }, t);

    const clips: string[] = [];
    let frameN = 0;
    const total = tl.segments.reduce((n, s) => n + Math.max(s.cues.length, 1), 0);
    for (const [si, seg] of tl.segments.entries()) {
      halt();
      const sc = scenes[seg.sceneIndex] as StoredScene;
      const cues = seg.cues.length > 0 ? seg.cues : [{ text: "", startMs: 0, durationMs: seg.durationMs }];
      const shots: { png: string; durationMs: number }[] = [];
      let interactiveReady = false;
      const animFile = seg.anim && opts.animDir ? path.join(opts.animDir, `${seg.anim.hash}.mp4`) : null;
      if (animFile && (await stat(animFile).then((f) => f.size > 0, () => false))) {
        // Cảnh có hoạt hình: clip thu vào khung phía trên; phụ đề là PNG (chỉ dải dưới, nền đặc) phủ lên đúng mốc.
        await show(bandOnly());
        const subs: { png: string; startMs: number; endMs: number }[] = [];
        for (const cue of cues) {
          if (!cue.text || noBand) continue;
          await setSub(cue.text);
          const png = path.join(work, `s${String(frameN++).padStart(5, "0")}.png`);
          await page.screenshot({ path: png, omitBackground: true });
          subs.push({ png, startMs: cue.startMs, endMs: cue.startMs + cue.durationMs });
        }
        const dur = (seg.durationMs / 1000).toFixed(3);
        const audio = seg.audioFile ? ["-i", path.join(audioDir, seg.audioFile)] : ["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono"];
        const inputs = ["-ss", `${(seg.anim?.offsetMs ?? 0) / 1000}`, "-i", animFile, ...audio, ...subs.flatMap((x) => ["-i", x.png])];
        const sw = noBand ? OW : Math.round((STAGE_W * OH) / H);
        const sh = noBand ? OH : Math.round((STAGE_H * OH) / H);
        let chain = `[0:v]tpad=stop_mode=clone:stop_duration=${dur},fps=${FPS},scale=${sw}:${sh}:force_original_aspect_ratio=decrease,pad=${OW}:${OH}:(ow-iw)/2:${noBand ? "(oh-ih)/2" : "0"}:color=0x${(noBand ? "#ffffff" : BAND_BG).slice(1)}[b0]`;
        subs.forEach((x, k) => {
          chain += `;[${k + 2}:v]scale=${OW}:${OH}[o${k}];[b${k}][o${k}]overlay=0:0:enable='between(t,${(x.startMs / 1000).toFixed(3)},${(x.endMs / 1000).toFixed(3)})'[b${k + 1}]`;
        });
        const clip = path.join(work, `c${si}.mp4`);
        await ff(["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${chain};[b${subs.length}]format=yuv420p[v]`, "-map", "[v]", "-map", "1:a", "-t", dur, "-af", "apad", "-c:v", "libx264", "-preset", Q[0], "-crf", Q[1], "-c:a", "aac", "-b:a", "96k", "-ar", "24000", "-ac", "1", clip]);
        clips.push(clip);
        opts.onProgress?.(frameN, total);
        continue;
      }
      for (const cue of cues) {
        halt();
        const png = path.join(work, `f${String(frameN++).padStart(5, "0")}.png`);
        const sub = noBand ? "" : cue.text;
        const fo = { noBand, qr: qrFor(seg.kind) };
        if (seg.kind === "slide") {
          await show(framed(slideHtml((sc.content as unknown as { canvas: Canvas }).canvas, { latex, focusId: seg.focusId, effect: seg.effect, extraHead: KATEX_CSS }), sub, "", fo));
        } else if (seg.kind === "quiz") {
          const qs = (sc.content as unknown as { questions: QuizQ[] }).questions;
          const q = seg.quizIndex !== undefined ? qs[seg.quizIndex] : undefined;
          await show(framed(q ? quizQuestionHtml(sc.title, q, seg.quizIndex as number, qs.length, { latex, reveal: seg.reveal, extraHead: KATEX_CSS }) : quizHtml(sc.title, qs, { latex, reveal: seg.reveal, extraHead: KATEX_CSS }), sub, "", fo));
        } else if (!interactiveReady) {
          const html = (sc.content as { html?: string }).html ?? "";
          await show(framed(html, sub, "allow-scripts", fo));
          await page.waitForTimeout(1800);
          interactiveReady = true;
        }
        if (seg.kind === "interactive") await setSub(sub);
        await page.screenshot({ path: png });
        shots.push({ png, durationMs: cue.durationMs });
        opts.onProgress?.(frameN, total);
      }
      const list = path.join(work, `l${si}.txt`);
      const lines = shots.flatMap((x) => [`file '${x.png}'`, `duration ${(x.durationMs / 1000).toFixed(3)}`]);
      lines.push(`file '${shots[shots.length - 1]?.png}'`);
      await writeFile(list, lines.join("\n"));
      const clip = path.join(work, `c${si}.mp4`);
      const dur = (seg.durationMs / 1000).toFixed(3);
      const audio = seg.audioFile ? ["-i", path.join(audioDir, seg.audioFile)] : ["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono"];
      await ff(["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, ...audio, "-t", dur, "-vf", `fps=${FPS},scale=${OW}:${OH},format=yuv420p`, "-af", "apad", "-c:v", "libx264", "-preset", Q[0], "-crf", Q[1], "-c:a", "aac", "-b:a", "96k", "-ar", "24000", "-ac", "1", clip]);
      clips.push(clip);
    }
    const all = path.join(work, "all.txt");
    await writeFile(all, clips.map((c) => `file '${c}'`).join("\n"));
    halt();
    const video = path.join(opts.outDir, `${opts.baseName ?? "bai-giang"}.mp4`);
    await ff(["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", all, "-c", "copy", "-movflags", "+faststart", video]);
    const srt = path.join(opts.outDir, opts.baseName ? `${opts.baseName}.srt` : "phu-de.srt");
    await writeFile(srt, toSrt(tl));
    return { video, srt, totalMs: tl.totalMs, frames: frameN, diagnostics: tl.diagnostics };
  } finally {
    await browser.close().catch(() => undefined);
    await rm(work, { recursive: true, force: true });
  }
}
