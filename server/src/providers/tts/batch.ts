// Khung chung cho engine đọc theo lô qua lệnh ngoài: ghi lines.txt → lệnh xuất all.wav + segments JSON [{start,end}] → cắt từng câu ra mp3.
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ProviderHealth, ProviderInfo, TtsItem, TtsOptions, TtsPreset, TtsProvider, TtsResult } from "../types";
import { atempo, probeMs, run } from "../util";
import { speakable } from "./speakable";

const TAIL_PAD_S = 0.2;
export type BatchFiles = { txt: string; wav: string; seg: string };

export function createBatchTts(o: {
  info: ProviderInfo;
  /** [bin, args] để đọc lines.txt → all.wav + seg.json. */
  command: (f: BatchFiles, opts: TtsOptions) => [string, string[]];
  check: () => Promise<ProviderHealth>;
  presets: () => Promise<TtsPreset[]>;
  /** Engine tự đổi tốc độ (không cần atempo sau). */
  nativeSpeed?: boolean;
  batch?: number;
}): TtsProvider {
  const batch = o.batch ?? 40;

  async function readBatch(items: TtsItem[], dir: string, opts: TtsOptions): Promise<(TtsResult | null)[]> {
    const out: (TtsResult | null)[] = items.map(() => null);
    const lines = items.map((it, i) => ({ i, name: it.name, text: speakable(it.text).replace(/\s*\n\s*/g, " ") })).filter((l) => l.text);
    if (lines.length === 0) return out;
    const work = await mkdtemp(path.join(tmpdir(), "eduvn-tts-"));
    try {
      const f = { txt: path.join(work, "lines.txt"), wav: path.join(work, "all.wav"), seg: path.join(work, "seg.json") };
      await writeFile(f.txt, lines.map((l) => l.text).join("\n"), "utf8");
      const [bin, args] = o.command(f, opts);
      await run(bin, args, { timeout: 30 * 60_000, maxBuffer: 8 * 1024 * 1024 });
      const segs = JSON.parse(await readFile(f.seg, "utf8")) as { start: number; end: number }[];
      await mkdir(dir, { recursive: true });
      const tempo = o.nativeSpeed ? null : atempo(opts.speed ?? 1);
      // đệm 0,2 s lặng cuối để chữ cuối không bị cụt; đổi tốc độ giữ cao độ
      const af = [tempo, `apad=pad_dur=${TAIL_PAD_S}`].filter(Boolean).join(",");
      for (const [k, l] of lines.entries()) {
        const s = segs[k];
        if (!s) continue;
        const file = `${l.name}.mp3`;
        const dst = path.join(dir, file);
        await run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(s.start), "-t", String(s.end - s.start), "-i", f.wav, "-af", af, "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "64k", dst], { timeout: 60_000 });
        out[l.i] = { file, durationMs: await probeMs(dst) };
      }
    } finally {
      await rm(work, { recursive: true, force: true });
    }
    return out;
  }

  return {
    info: o.info,
    check: o.check,
    presets: o.presets,
    async synthMany(items, dir, opts = {}) {
      const res: (TtsResult | null)[] = [];
      for (let i = 0; i < items.length; i += batch) {
        try {
          res.push(...(await readBatch(items.slice(i, i + batch), dir, opts)));
        } catch {
          res.push(...items.slice(i, i + batch).map(() => null));
        }
      }
      return res;
    },
  };
}
