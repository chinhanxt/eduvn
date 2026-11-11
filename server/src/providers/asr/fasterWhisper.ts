/** faster-whisper chạy local (model CTranslate2 `small` trong cache HuggingFace của máy chủ), qua khoá việc nặng vì dùng GPU chung. */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ValidationError } from "../../errors";
import type { AsrProvider, AsrResult } from "../types";
import { commandExists, fileExists, isMissing, run, wrapped } from "../util";

export const WHISPER_SCRIPT = fileURLToPath(new URL("./whisper_transcribe.py", import.meta.url));

export type FasterWhisperCfg = {
  python?: string;
  script?: string;
  wrap?: string[];
  /** tiny | base | small | medium | large-v3-turbo… (phải có sẵn trong cache). */
  model?: string;
  device?: "auto" | "cuda" | "cpu";
  hfHome?: string;
  timeoutMs?: number;
};

const REPO: Record<string, string> = { "large-v3-turbo": "mobiuslabsgmbh--faster-whisper-large-v3-turbo" };

export function createFasterWhisperAsr(cfg: FasterWhisperCfg = {}): AsrProvider {
  const python = cfg.python ?? "python3";
  const model = cfg.model ?? "small";
  const modelDir = path.join(cfg.hfHome ?? path.join(homedir(), ".cache/huggingface"), "hub", `models--${REPO[model] ?? `Systran--faster-whisper-${model}`}`);
  return {
    info: { id: "faster-whisper", kind: "asr", label: `faster-whisper (${model})`, description: "Nhận dạng tiếng Việt chạy trên máy chủ của trường; âm thanh không gửi ra ngoài. Dùng GPU nếu rảnh, không thì CPU.", local: true, free: true, gpu: true },
    async check() {
      if (!(await commandExists(python))) return { ok: false, detail: `Chưa có ${python} trên máy chủ` };
      if (!(await fileExists(modelDir))) return { ok: false, detail: `Chưa có model faster-whisper "${model}" trong cache của máy chủ` };
      return { ok: true, detail: `Sẵn sàng · model ${model}` };
    },
    async transcribe(audio, opts = {}): Promise<AsrResult> {
      if (audio.length < 64) throw new ValidationError(["Không nghe thấy tiếng (bản ghi rỗng)"]);
      const dir = await mkdtemp(path.join(tmpdir(), "eduvn-asr-"));
      try {
        const file = path.join(dir, "in.audio");
        await writeFile(file, audio);
        const [bin, args] = wrapped(cfg.wrap, python, [cfg.script ?? WHISPER_SCRIPT, file, "--model", model, "--language", opts.language ?? "vi", "--device", cfg.device ?? "auto", ...(opts.prompt ? ["--prompt", opts.prompt] : [])]);
        let stdout: string;
        try {
          ({ stdout } = await run(bin, args, { timeout: cfg.timeoutMs ?? 10 * 60_000, maxBuffer: 16 * 1024 * 1024, signal: opts.signal }));
        } catch (e) {
          if (isMissing(e)) throw new Error(`Máy chủ chưa có ${python} để nhận dạng giọng nói`);
          const msg = String((e as { stderr?: string }).stderr ?? "").trim().split("\n").pop();
          throw new Error(`Nhận dạng giọng nói lỗi${msg ? `: ${msg}` : ""}`);
        }
        const line = stdout.trim().split("\n").pop() ?? "";
        const r = JSON.parse(line) as { text: string; language: string; duration: number; segments: AsrResult["segments"] };
        return { text: r.text, language: r.language, durationMs: Math.round(r.duration * 1000), segments: r.segments };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
}
