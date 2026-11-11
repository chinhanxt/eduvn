// Port ý tưởng từ OpenMAIC lib/video-export (compile → IR → emit) (MIT), đã sửa: không dùng render-service/HyperFrames;
// IR chụp khung bằng Chrome headless (playwright-core + trình duyệt có sẵn) rồi FFmpeg ghép giọng đọc.
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import katex from "katex";
import { chromium } from "playwright-core";
import { readVendor } from "../services/aiLessons/vendor";
import type { StoredScene } from "../services/aiLessons/types";
import { type Timeline, compileTimeline, toSrt } from "./aiLessonTimeline";
import { interactiveDoc } from "./interactiveHtml";
import { type Canvas, type QuizQ, quizHtml, quizQuestionHtml, slideHtml } from "./slideHtml";

const run = promisify(execFile);
const W = 1280;
const H = 720;
const KATEX_CSS = '<link rel="stylesheet" href="/vendor/interactive/katex@0.16.38/dist/katex.min.css">';

// Khung video: 1280×720, phần hình (slide/câu hỏi/hoạt hình) thu vào 1100×619 ở trên, dải phụ đề 101 px nền đặc ở dưới (tối đa 2 dòng) — phụ đề không đè nội dung.
const STAGE_W = 1100;
const STAGE_H = 619;
const BAND_BG = "#0d1024";
const BAND_CSS = `html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}#v{position:absolute;left:${(W - STAGE_W) / 2}px;top:0;width:${STAGE_W}px;height:${STAGE_H}px;border:0;background:#fff}#band{position:absolute;left:0;right:0;top:${STAGE_H}px;height:${H - STAGE_H}px;display:flex;align-items:center;justify-content:center;padding:0 48px;box-sizing:border-box;background:${BAND_BG};color:#fff;text-align:center;font:600 25px/1.3 'Be Vietnam Pro','Segoe UI',Roboto,'Noto Sans','DejaVu Sans',sans-serif}#s{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}`;
/** Trang khung: slide/câu hỏi (tài liệu HTML do ta dựng, đã escape) nhúng thẳng vào ô 1100×619 + dải phụ đề; cảnh tương tác (mã AI) vào iframe sandbox "allow-scripts". */
export const framed = (inner: string, sub: string, sandbox: string) => {
  const subHtml = sub.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const band = `<div id="band"><span id="s">${subHtml}</span></div>`;
  if (sandbox) return `<!doctype html><html><head><meta charset="utf-8"><style>body{background:${BAND_BG}}${BAND_CSS}</style></head><body><iframe id="v" sandbox="${sandbox}" srcdoc="${inner.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe>${band}</body></html>`;
  const head = /<head>([\s\S]*?)<\/head>/.exec(inner)?.[1] ?? "";
  const body = /<body>([\s\S]*)<\/body>/.exec(inner)?.[1] ?? inner;
  return `<!doctype html><html><head>${head}<style>body{background:${BAND_BG}}${BAND_CSS}#v{overflow:hidden}</style></head><body><div id="v">${body}</div>${band}</body></html>`;
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

export type VideoOpts = { chromePath: string; outDir: string; /** Thư mục clip hoạt hình toán (<hash>.mp4). */ animDir?: string; onProgress?: (done: number, total: number) => void };
export type VideoResult = { video: string; srt: string; totalMs: number; frames: number; diagnostics: string[] };

/** Máy chủ HTTP tạm trên 127.0.0.1 phục vụ khung hiện tại + /vendor/interactive. (page.route của Playwright không chặn
 *  được yêu cầu từ iframe srcdoc sandbox gốc mờ → KaTeX/Chart.js của cảnh tương tác không tải, công thức hiện thô.) */
export async function frameServer(): Promise<{ origin: string; set(html: string): void; close(): Promise<void> }> {
  let current = "";
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/frame") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(current);
      return;
    }
    void readVendor(url.pathname).then((v) => {
      if (!v) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": v.mime, "access-control-allow-origin": "*", "cache-control": "max-age=3600" });
      res.end(v.body);
    }, () => {
      res.writeHead(500);
      res.end();
    });
  });
  await new Promise<void>((ok, bad) => srv.once("error", bad).listen(0, "127.0.0.1", () => ok()));
  const { port } = srv.address() as { port: number };
  return { origin: `http://127.0.0.1:${port}`, set: (h) => void (current = h), close: () =>
      new Promise((ok) => {
        srv.close(() => ok());
        srv.closeAllConnections();
      }) };
}

/** Chờ cảnh tương tác ổn định trước khi chụp: phông xong, KaTeX đã dựng (không còn \(…\) thô), DOM thôi đổi ~0,7 s; tối thiểu 1,2 s, tối đa 6 s. */
export async function settleInteractive(page: import("playwright-core").Page): Promise<void> {
  const t0 = Date.now();
  const f = page.frames().find((x) => x !== page.mainFrame());
  if (!f) return;
  await f.evaluate(() => document.fonts.ready).catch(() => undefined);
  let last = "";
  let since = Date.now();
  while (Date.now() - t0 < 6000) {
    const sig = await f.evaluate(() => {
      const t = document.body?.innerText ?? "";
      return `${document.body?.innerHTML.length ?? 0}|${/\\\(|\\\[/.test(t) ? "raw" : "ok"}`;
    }).catch(() => "x|raw");
    if (sig !== last) {
      last = sig;
      since = Date.now();
    } else if (sig.endsWith("ok") && Date.now() - since >= 700 && Date.now() - t0 >= 1200) return;
    await page.waitForTimeout(150);
  }
}

let busy: Promise<unknown> = Promise.resolve();
/** Mỗi lúc chỉ dựng một video (tránh treo máy khi nhiều GV bấm cùng lúc). */
export function renderLessonVideo(title: string, scenes: StoredScene[], audioDir: string, opts: VideoOpts): Promise<VideoResult> {
  const job = busy.catch(() => undefined).then(() => doRender(title, scenes, audioDir, opts));
  busy = job;
  return job;
}

async function doRender(title: string, scenes: StoredScene[], audioDir: string, opts: VideoOpts): Promise<VideoResult> {
  const tl: Timeline = compileTimeline(title, scenes);
  if (tl.segments.length === 0) throw new Error("Bài giảng chưa có cảnh nào để dựng video");
  await mkdir(opts.outDir, { recursive: true });
  const work = await mkdtemp(path.join(tmpdir(), "eduvn-video-"));
  const browser = await chromium.launch({ executablePath: opts.chromePath, args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"] });
  const fs = await frameServer();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const show = async (html: string) => {
      fs.set(html);
      await page.goto(`${fs.origin}/frame`, { waitUntil: "load" });
      for (const f of page.frames()) await f.evaluate(() => document.fonts.ready).catch(() => undefined);
    };
    // Chrome thỉnh thoảng trả "Unable to capture screenshot" khi máy nặng (demo 11/11): chờ rồi chụp lại, tối đa 2 lần
    const snap = async (o: { path: string; omitBackground?: boolean }) => {
      for (let k = 0; ; k++) {
        try {
          await page.screenshot(o);
          return;
        } catch (e) {
          if (k >= 2) throw e;
          await page.waitForTimeout(700 * (k + 1));
        }
      }
    };
    const setSub = (t: string) => page.evaluate((x) => { const el = document.getElementById("s"); if (el) el.textContent = x; }, t);

    const clips: string[] = [];
    let frameN = 0;
    const total = tl.segments.reduce((n, s) => n + Math.max(s.cues.length, 1), 0);
    for (const [si, seg] of tl.segments.entries()) {
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
          if (!cue.text) continue;
          await setSub(cue.text);
          const png = path.join(work, `s${String(frameN++).padStart(5, "0")}.png`);
          await snap({ path: png, omitBackground: true });
          subs.push({ png, startMs: cue.startMs, endMs: cue.startMs + cue.durationMs });
        }
        const dur = (seg.durationMs / 1000).toFixed(3);
        const audio = seg.audioFile ? ["-i", path.join(audioDir, seg.audioFile)] : ["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono"];
        const inputs = ["-ss", `${(seg.anim?.offsetMs ?? 0) / 1000}`, "-i", animFile, ...audio, ...subs.flatMap((x) => ["-i", x.png])];
        let chain = `[0:v]tpad=stop_mode=clone:stop_duration=${dur},fps=25,scale=${STAGE_W}:${STAGE_H},pad=${W}:${H}:${(W - STAGE_W) / 2}:0:color=0x${BAND_BG.slice(1)}[b0]`;
        subs.forEach((x, k) => {
          chain += `;[b${k}][${k + 2}:v]overlay=0:0:enable='between(t,${(x.startMs / 1000).toFixed(3)},${(x.endMs / 1000).toFixed(3)})'[b${k + 1}]`;
        });
        const clip = path.join(work, `c${si}.mp4`);
        await run("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${chain};[b${subs.length}]format=yuv420p[v]`, "-map", "[v]", "-map", "1:a", "-t", dur, "-af", "apad", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-c:a", "aac", "-b:a", "96k", "-ar", "24000", "-ac", "1", clip], { timeout: 300_000 });
        clips.push(clip);
        opts.onProgress?.(frameN, total);
        continue;
      }
      for (const cue of cues) {
        const png = path.join(work, `f${String(frameN++).padStart(5, "0")}.png`);
        const sub = cue.text;
        if (seg.kind === "slide") {
          await show(framed(slideHtml((sc.content as unknown as { canvas: Canvas }).canvas, { latex, focusId: seg.focusId, effect: seg.effect, extraHead: KATEX_CSS }), sub, ""));
        } else if (seg.kind === "quiz") {
          const qs = (sc.content as unknown as { questions: QuizQ[] }).questions;
          const q = seg.quizIndex !== undefined ? qs[seg.quizIndex] : undefined;
          await show(framed(q ? quizQuestionHtml(sc.title, q, seg.quizIndex as number, qs.length, { latex, reveal: seg.reveal, extraHead: KATEX_CSS }) : quizHtml(sc.title, qs, { latex, reveal: seg.reveal, extraHead: KATEX_CSS }), sub, ""));
        } else if (!interactiveReady) {
          const html = (sc.content as { html?: string }).html ?? "";
          await show(framed(interactiveDoc(html), sub, "allow-scripts"));
          await settleInteractive(page);
          interactiveReady = true;
        }
        if (seg.kind === "interactive") await setSub(sub);
        await snap({ path: png });
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
      await run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, ...audio, "-t", dur, "-vf", `fps=25,scale=${W}:${H},format=yuv420p`, "-af", "apad", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-c:a", "aac", "-b:a", "96k", "-ar", "24000", "-ac", "1", clip], { timeout: 300_000 });
      clips.push(clip);
    }
    const all = path.join(work, "all.txt");
    await writeFile(all, clips.map((c) => `file '${c}'`).join("\n"));
    const video = path.join(opts.outDir, "bai-giang.mp4");
    // Ghép: các đoạn x264 khác tham số (đoạn hoạt hình dựng qua filter_complex, đoạn slide từ ảnh PNG) → ghép -c copy làm vỡ
    // luồng H.264 ("non-existing PPS", demo 11/11 khi bài mở đầu bằng hoạt hình). Hình mã hoá lại một lượt, tiếng giữ nguyên.
    await run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", all, "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", video], { timeout: 600_000 });
    const srt = path.join(opts.outDir, "phu-de.srt");
    await writeFile(srt, toSrt(tl));
    return { video, srt, totalMs: tl.totalMs, frames: frameN, diagnostics: tl.diagnostics };
  } finally {
    await browser.close().catch(() => undefined);
    await fs.close().catch(() => undefined);
    await rm(work, { recursive: true, force: true });
  }
}
