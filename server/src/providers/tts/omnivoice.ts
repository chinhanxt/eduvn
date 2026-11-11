/** OmniVoice (k2-fsa, Apache-2.0) chạy trên máy chủ: nhân giọng theo file mẫu + lời mẫu, tự đổi tốc độ. Gọi omnivoice_say.py qua khoá việc nặng. */
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TtsProvider } from "../types";
import { commandExists, fileExists, wrapped } from "../util";
import { createBatchTts } from "./batch";

export const OMNIVOICE_SCRIPT = fileURLToPath(new URL("./omnivoice_say.py", import.meta.url));

export type OmnivoiceCfg = {
  python?: string;
  script?: string;
  wrap?: string[];
  /** Giọng mẫu mặc định khi lời gọi không chọn giọng (wav + lời mẫu). */
  ref?: string;
  refText?: string;
  /** Thư mục cache HuggingFace có model k2-fsa/OmniVoice (kiểm sẵn sàng, không tải mới). */
  hfHome?: string;
  device?: "cuda" | "cpu";
  batch?: number;
};

export function createOmnivoiceTts(cfg: OmnivoiceCfg = {}): TtsProvider {
  const python = cfg.python ?? "python3";
  const script = cfg.script ?? OMNIVOICE_SCRIPT;
  const modelDir = path.join(cfg.hfHome ?? path.join(homedir(), ".cache/huggingface"), "hub/models--k2-fsa--OmniVoice");
  return createBatchTts({
    info: { id: "omnivoice", kind: "tts", label: "OmniVoice", description: "Nhân giọng theo file mẫu + lời mẫu, tự chạy trên máy chủ (GPU). Chậm hơn VieNeu, giống giọng mẫu hơn.", local: true, free: true, gpu: true, clone: true },
    batch: cfg.batch ?? 20,
    nativeSpeed: true,
    command: ({ txt, wav, seg }, opts) => {
      const ref = opts.voice?.refFile ?? cfg.ref;
      if (!ref) throw new Error("OmniVoice cần giọng mẫu (file wav)");
      const refText = opts.voice?.refFile ? opts.voice.refText : cfg.refText;
      return wrapped(cfg.wrap, python, [script, "-f", txt, "-o", wav, "--segments", seg, "--ref", ref, ...(refText ? ["--ref-text", refText] : []), "--speed", String(opts.speed ?? 1), "--device", cfg.device ?? "cuda"]);
    },
    async check() {
      if (!(await commandExists(python))) return { ok: false, detail: `Chưa có ${python} trên máy chủ` };
      if (!(await fileExists(modelDir))) return { ok: false, detail: "Chưa có model k2-fsa/OmniVoice trong cache HuggingFace của máy chủ" };
      if (cfg.ref && !(await fileExists(cfg.ref))) return { ok: false, detail: `Thiếu file giọng mẫu mặc định: ${path.basename(cfg.ref)}` };
      return { ok: true, detail: cfg.ref ? `Sẵn sàng · giọng mẫu ${path.basename(cfg.ref, path.extname(cfg.ref))}` : "Sẵn sàng · chọn giọng mẫu trong thư viện giọng" };
    },
    presets: async () => [],
  });
}
