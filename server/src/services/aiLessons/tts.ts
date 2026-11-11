/** Lời giảng → mp3 bằng VieNeu TTS của máy (`vieneu-say`, giọng mẫu "Giọng dạy"). Đọc cả loạt câu một lần (nạp model một lần). */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export type TtsItem = { text: string; name: string };
export type TtsResult = { file: string; durationMs: number };

export type Tts = {
  /** Đọc nhiều câu; trả mảng cùng thứ tự: tên file (trong `dir`) + thời lượng ms, null nếu câu rỗng/lỗi. */
  synthMany(items: TtsItem[], dir: string): Promise<(TtsResult | null)[]>;
};

export const disabledTts: Tts = { synthMany: async (items) => items.map(() => null) };

/** Bỏ ký hiệu LaTeX/markdown mà giọng đọc không đọc được. */
export function speakable(text: string): string {
  return text
    .replace(/\$\$?([^$]+)\$\$?/g, (_m, f: string) => f.replace(/\\(?:frac|dfrac)\{([^}]*)\}\{([^}]*)\}/g, "$1 phần $2").replace(/\\(?:frac|dfrac)\s*(\d)(\d)/g, "$1 phần $2").replace(/\\[a-zA-Z]+/g, " ").replace(/\^2/g, " bình phương").replace(/\^3/g, " lập phương").replace(/\^\{?([^}\s]+)\}?/g, " mũ $1").replace(/[{}]/g, ""))
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type VieneuCfg = {
  /** Lệnh đọc (mặc định "vieneu-say"). */
  cmd?: string;
  /** Tiền tố khoá nặng, vd ["/home/x/video-studio/bin/heavy","run","eduvn-tts","--"]. */
  wrap?: string[];
  /** Audio mẫu để nhân giọng ("Giọng dạy.wav"). */
  ref?: string;
  /** Hoặc tên giọng có sẵn của VieNeu (khi không có ref). */
  voice?: string;
  /** Số câu tối đa mỗi lần gọi. */
  batch?: number;
};

const TAIL_PAD_S = 0.2;

async function probeMs(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { timeout: 15_000 });
  return Math.round(Number.parseFloat(stdout) * 1000);
}

export function createVieneuTts(cfg: VieneuCfg = {}): Tts {
  const cmd = cfg.cmd ?? "vieneu-say";
  const batch = cfg.batch ?? 40;

  async function readBatch(items: TtsItem[], dir: string): Promise<(TtsResult | null)[]> {
    const out: (TtsResult | null)[] = items.map(() => null);
    const lines = items.map((it, i) => ({ i, name: it.name, text: speakable(it.text).replace(/\s*\n\s*/g, " ") })).filter((l) => l.text);
    if (lines.length === 0) return out;
    const work = await mkdtemp(path.join(tmpdir(), "eduvn-tts-"));
    try {
      const txt = path.join(work, "lines.txt");
      const wav = path.join(work, "all.wav");
      const seg = path.join(work, "seg.json");
      await writeFile(txt, lines.map((l) => l.text).join("\n"), "utf8");
      const args = ["-f", txt, "-o", wav, "--segments", seg, ...(cfg.ref ? ["--ref", cfg.ref] : cfg.voice ? ["--voice", cfg.voice] : [])];
      const [bin, ...pre] = [...(cfg.wrap ?? []), cmd];
      await run(bin as string, [...pre, ...args], { timeout: 30 * 60_000, maxBuffer: 8 * 1024 * 1024 });
      const segs = JSON.parse(await readFile(seg, "utf8")) as { start: number; end: number }[];
      await mkdir(dir, { recursive: true });
      for (const [k, l] of lines.entries()) {
        const s = segs[k];
        if (!s) continue;
        const file = `${l.name}.mp3`;
        const dst = path.join(dir, file);
        // đệm 0,2 s lặng cuối để chữ cuối không bị cụt
        await run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(s.start), "-t", String(s.end - s.start), "-i", wav, "-af", `apad=pad_dur=${TAIL_PAD_S}`, "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "64k", dst], { timeout: 60_000 });
        out[l.i] = { file, durationMs: await probeMs(dst) };
      }
    } finally {
      await rm(work, { recursive: true, force: true });
    }
    return out;
  }

  return {
    async synthMany(items, dir) {
      const res: (TtsResult | null)[] = [];
      for (let i = 0; i < items.length; i += batch) {
        try {
          res.push(...(await readBatch(items.slice(i, i + batch), dir)));
        } catch {
          res.push(...items.slice(i, i + batch).map(() => null));
        }
      }
      return res;
    },
  };
}
