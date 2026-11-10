/** Lời giảng → mp3 bằng Edge TTS (giọng vi-VN). Bản thay cho các nhà cung cấp TTS của OpenMAIC. */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export type Tts = {
  /** Trả tên file (trong thư mục audio của bài) + thời lượng ms; null nếu tắt/lỗi. */
  synth(text: string, dir: string, name: string): Promise<{ file: string; durationMs: number } | null>;
};

export const disabledTts: Tts = { synth: async () => null };

/** Bỏ ký hiệu LaTeX/markdown mà giọng đọc không đọc được. */
export function speakable(text: string): string {
  return text
    .replace(/\$\$?([^$]+)\$\$?/g, (_m, f: string) => f.replace(/\\(?:frac|dfrac)\{([^}]*)\}\{([^}]*)\}/g, "$1 phần $2").replace(/\\[a-zA-Z]+/g, " ").replace(/\^2/g, " bình phương").replace(/\^3/g, " lập phương").replace(/\^\{?([^}\s]+)\}?/g, " mũ $1").replace(/[{}]/g, ""))
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Thời lượng thật bằng ffprobe; không có thì suy từ kích thước (CBR). */
async function durationOf(file: string, bytes: number): Promise<number> {
  try {
    const { stdout } = await promisify(execFile)("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { timeout: 15_000 });
    const sec = Number.parseFloat(stdout);
    if (Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000);
  } catch {
    /* dùng ước lượng */
  }
  return Math.round((bytes / BYTES_PER_SEC) * 1000);
}

// mp3 24kHz 48kbps mono = 6000 byte/giây (CBR)
const BYTES_PER_SEC = 6000;

/** Dịch vụ đọc chỉ nhận vài kết nối cùng lúc: giới hạn 2 và thử lại tối đa 5 lần. */
const MAX_PARALLEL = 2;
let active = 0;
const waiters: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  while (active >= MAX_PARALLEL) await new Promise<void>((r) => waiters.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

export function createEdgeTts(voice: string): Tts {
  return {
    async synth(text, dir, name) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const r = await slot(() => once(voice, text, dir, name));
        if (r || !speakable(text)) return r;
        await new Promise((res) => setTimeout(res, 700 * (attempt + 1)));
      }
      return null;
    },
  };
}

async function once(voice: string, text: string, dir: string, name: string): Promise<{ file: string; durationMs: number } | null> {
  const t = speakable(text);
  if (!t) return null;
  await mkdir(dir, { recursive: true });
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(t);
    const chunks: Buffer[] = [];
    for await (const c of audioStream) chunks.push(c as Buffer);
    const buf = Buffer.concat(chunks);
    if (buf.length < 500) return null;
    const file = `${name}.mp3`;
    await writeFile(path.join(dir, file), buf);
    return { file, durationMs: await durationOf(path.join(dir, file), buf.length) };
  } catch {
    return null;
  } finally {
    tts.close();
  }
}
