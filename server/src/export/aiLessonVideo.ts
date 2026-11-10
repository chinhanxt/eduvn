// Port ý tưởng từ OpenMAIC lib/video-export (compile → IR → emit) (MIT), đã sửa: không dùng render-service/HyperFrames;
// IR chụp khung bằng Chrome headless (playwright-core + trình duyệt có sẵn) rồi FFmpeg ghép giọng đọc.
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import katex from "katex";
import { chromium } from "playwright-core";
import { readVendor } from "../services/aiLessons/vendor";
import type { StoredScene } from "../services/aiLessons/types";
import { type Timeline, compileTimeline, toSrt } from "./aiLessonTimeline";
import { type Canvas, type QuizQ, quizHtml, slideHtml } from "./slideHtml";

const run = promisify(execFile);
const W = 1280;
const H = 720;
const ORIGIN = "http://eduvn.local";
const KATEX_CSS = '<link rel="stylesheet" href="/vendor/interactive/katex@0.16.38/dist/katex.min.css">';

const latex = (tex: string) => {
  try {
    return katex.renderToString(tex, { throwOnError: false, output: "html" });
  } catch {
    return tex;
  }
};

export type VideoOpts = { chromePath: string; outDir: string; onProgress?: (done: number, total: number) => void };
export type VideoResult = { video: string; srt: string; totalMs: number; frames: number; diagnostics: string[] };

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
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
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
      await page.evaluate(() => document.fonts.ready);
    };

    const clips: string[] = [];
    let frameN = 0;
    const total = tl.segments.reduce((n, s) => n + Math.max(s.cues.length, 1), 0);
    for (const [si, seg] of tl.segments.entries()) {
      const sc = scenes[seg.sceneIndex] as StoredScene;
      const cues = seg.cues.length > 0 ? seg.cues : [{ text: "", startMs: 0, durationMs: seg.durationMs }];
      const shots: { png: string; durationMs: number }[] = [];
      let interactiveReady = false;
      for (const cue of cues) {
        const png = path.join(work, `f${String(frameN++).padStart(5, "0")}.png`);
        const sub = cue.text;
        if (seg.kind === "slide") {
          await show(slideHtml((sc.content as unknown as { canvas: Canvas }).canvas, { latex, focusId: seg.focusId, effect: seg.effect, subtitle: sub, extraHead: KATEX_CSS }));
        } else if (seg.kind === "quiz") {
          await show(quizHtml(sc.title, (sc.content as unknown as { questions: QuizQ[] }).questions, { latex, reveal: seg.reveal, subtitle: sub, extraHead: KATEX_CSS }));
        } else if (!interactiveReady) {
          const html = (sc.content as { html?: string }).html ?? "";
          await show(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#fff}iframe{border:0;width:100%;height:100%}#sub{position:fixed;left:50%;transform:translateX(-50%);bottom:16px;max-width:90%;background:rgba(0,0,0,.62);color:#fff;font:600 26px/1.35 sans-serif;padding:6px 16px;border-radius:8px;text-align:center}</style></head><body><iframe sandbox="allow-scripts" srcdoc="${html.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe><div id="sub"></div></body></html>`);
          await page.waitForTimeout(1800);
          interactiveReady = true;
        }
        if (seg.kind === "interactive") await page.evaluate((t) => {
          const el = document.getElementById("sub");
          if (el) {
            el.textContent = t;
            el.style.display = t ? "block" : "none";
          }
        }, sub);
        await page.screenshot({ path: png });
        shots.push({ png, durationMs: cue.durationMs });
        opts.onProgress?.(frameN, total);
      }
      const list = path.join(work, `l${si}.txt`);
      const lines = shots.flatMap((s) => [`file '${s.png}'`, `duration ${(s.durationMs / 1000).toFixed(3)}`]);
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
    await run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", all, "-c", "copy", "-movflags", "+faststart", video], { timeout: 300_000 });
    const srt = path.join(opts.outDir, "phu-de.srt");
    await writeFile(srt, toSrt(tl));
    return { video, srt, totalMs: tl.totalMs, frames: frameN, diagnostics: tl.diagnostics };
  } finally {
    await browser.close().catch(() => undefined);
    await rm(work, { recursive: true, force: true });
  }
}
