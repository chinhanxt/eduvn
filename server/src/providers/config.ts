// Biến môi trường của nhà cung cấp phụ (đọc riêng, không đụng config.ts chung). Mặc định = phương án tự chạy có sẵn trên máy dev.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";

const Env = z.object({
  DATA_DIR: z.string().min(1).default("./data"),
  HEAVY_BIN: z.string().min(1).optional(),
  PYTHON_BIN: z.string().min(1).default("python3"),
  TTS_PROVIDER: z.enum(["vieneu", "off"]).default("vieneu"),
  VIENEU_CMD: z.string().min(1).default("vieneu-say"),
  VIENEU_REF: z.string().min(1).default(path.join(homedir(), "video-studio/voices/Giọng dạy.wav")),
  VIENEU_VOICE: z.string().min(1).optional(),
  OMNIVOICE: z.enum(["on", "off"]).default("on"),
  /** Giọng mẫu mặc định của OmniVoice (+ lời mẫu ở file .txt cùng tên nếu có). */
  OMNIVOICE_REF: z.string().min(1).default(path.join(homedir(), "video-studio/voices/Giọng tâm sự.wav")),
  ASR_PROVIDER: z.enum(["faster-whisper", "off"]).default("faster-whisper"),
  WHISPER_MODEL: z.string().min(1).default("small"),
  WHISPER_DEVICE: z.enum(["auto", "cuda", "cpu"]).default("auto"),
  HF_HOME: z.string().min(1).optional(),
  SOFFICE_BIN: z.string().min(1).default("soffice"),
});
export type ProviderEnv = z.infer<typeof Env>;

export function loadProviderEnv(env: Record<string, string | undefined> = process.env): ProviderEnv {
  return Env.parse(env);
}

/** Lời mẫu cạnh file wav ("Giọng tâm sự.txt"). */
export function refTextOf(wav: string): string | undefined {
  const txt = wav.replace(/\.[^.]+$/, ".txt");
  return existsSync(txt) ? readFileSync(txt, "utf8").trim() || undefined : undefined;
}
