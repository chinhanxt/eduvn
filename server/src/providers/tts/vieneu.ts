/** VieNeu TTS của máy (`vieneu-say`): đọc cả loạt câu một lần (nạp model một lần), nhân giọng từ file mẫu (`--ref`) hoặc giọng có sẵn. Chuyển từ services/aiLessons/tts.ts (P5). */
import path from "node:path";
import type { TtsItem, TtsOptions, TtsPreset, TtsProvider, TtsResult } from "../types";
import { commandExists, fileExists, run, wrapped } from "../util";
import { createBatchTts } from "./batch";
import { speakable } from "./speakable";

export { speakable } from "./speakable";

export type { TtsItem, TtsResult } from "../types";

/** Giao diện cũ của bài giảng AI (P5): mọi TtsProvider đều thoả. */
export type Tts = {
  /** Đọc nhiều câu; trả mảng cùng thứ tự: tên file (trong `dir`) + thời lượng ms, null nếu câu rỗng/lỗi. */
  synthMany(items: TtsItem[], dir: string, opts?: TtsOptions): Promise<(TtsResult | null)[]>;
};

export const disabledTts: Tts = { synthMany: async (items) => items.map(() => null) };

export type VieneuCfg = {
  /** Lệnh đọc (mặc định "vieneu-say"). */
  cmd?: string;
  /** Tiền tố khoá nặng, vd ["/home/x/video-studio/bin/heavy","run","eduvn-tts","--"]. */
  wrap?: string[];
  /** Audio mẫu mặc định để nhân giọng ("Giọng dạy.wav"). */
  ref?: string;
  /** Hoặc tên giọng có sẵn mặc định của VieNeu (khi không có ref). */
  voice?: string;
  /** Số câu tối đa mỗi lần gọi. */
  batch?: number;
};

/** "Ngọc Linh — Nữ · Bắc · Phong cách kể chuyện" → preset. */
export function parsePresetList(stdout: string): TtsPreset[] {
  const out: TtsPreset[] = [];
  for (const line of stdout.split("\n")) {
    const m = /^\s*(.+?)\s+—\s+(.+)$/.exec(line);
    if (!m) continue;
    const [g, region, style] = m[2]!.split("·").map((s) => s.trim());
    out.push({ id: m[1]!, label: m[1]!, gender: g === "Nữ" ? "nu" : g === "Nam" ? "nam" : undefined, region, style });
  }
  return out;
}

export function createVieneuTts(cfg: VieneuCfg = {}): TtsProvider {
  const cmd = cfg.cmd ?? "vieneu-say";
  let presets: Promise<TtsPreset[]> | null = null;
  return createBatchTts({
    info: { id: "vieneu", kind: "tts", label: "VieNeu", description: "Giọng Việt tự chạy trên máy chủ (GPU), nhân giọng từ file mẫu 3–8 giây.", local: true, free: true, gpu: true, clone: true },
    batch: cfg.batch,
    command: ({ txt, wav, seg }, opts: TtsOptions) => {
      const v = opts.voice;
      const voiceArgs = v?.refFile ? ["--ref", v.refFile] : v?.preset ? ["--voice", v.preset] : cfg.ref ? ["--ref", cfg.ref] : cfg.voice ? ["--voice", cfg.voice] : [];
      return wrapped(cfg.wrap, cmd, ["-f", txt, "-o", wav, "--segments", seg, ...voiceArgs]);
    },
    async check() {
      if (!(await commandExists(cmd))) return { ok: false, detail: `Chưa có lệnh ${cmd} trên máy chủ` };
      if (cfg.ref && !cfg.voice && !(await fileExists(cfg.ref))) return { ok: false, detail: `Thiếu file giọng mẫu mặc định: ${path.basename(cfg.ref)}` };
      return { ok: true, detail: cfg.voice ? `Sẵn sàng · giọng ${cfg.voice}` : cfg.ref ? `Sẵn sàng · giọng mẫu ${path.basename(cfg.ref, path.extname(cfg.ref))}` : "Sẵn sàng" };
    },
    presets() {
      presets ??= run(cmd, ["--list"], { timeout: 60_000 }).then(
        ({ stdout }) => parsePresetList(stdout),
        () => {
          presets = null; // lỗi thì lần sau thử lại
          return [];
        },
      );
      return presets;
    },
  });
}
