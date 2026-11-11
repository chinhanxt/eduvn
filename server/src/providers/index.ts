// Dựng registry nhà cung cấp phụ từ biến môi trường. Không chạy lệnh nào khi dựng (adapter nạp lười).
import type { Ai } from "../services/ai";
import { browserTts } from "./tts/browser";
import { createOmnivoiceTts } from "./tts/omnivoice";
import { createVieneuTts } from "./tts/vieneu";
import { createFasterWhisperAsr } from "./asr/fasterWhisper";
import { webSpeechAsr } from "./asr/webSpeech";
import { type ProviderEnv, loadProviderEnv, refTextOf } from "./config";
import { createVisionOcr } from "./ocr/vision";
import { registerDefaultParsers } from "./parse";
import { createLibreofficePreview } from "./parse/libreoffice";
import { ProviderRegistry } from "./registry";

export { ProviderRegistry } from "./registry";
export type * from "./types";

export function createProviders(opts: { ai?: Ai; env?: Partial<ProviderEnv> | Record<string, string | undefined> } = {}): ProviderRegistry {
  const env = loadProviderEnv((opts.env ?? process.env) as Record<string, string | undefined>);
  const heavy = (label: string) => (env.HEAVY_BIN ? [env.HEAVY_BIN, "run", label, "--"] : undefined);
  const r = new ProviderRegistry();
  if (env.TTS_PROVIDER === "vieneu") r.register(createVieneuTts({ cmd: env.VIENEU_CMD, ref: env.VIENEU_VOICE ? undefined : env.VIENEU_REF, voice: env.VIENEU_VOICE, wrap: heavy("eduvn-tts") }));
  if (env.OMNIVOICE === "on") r.register(createOmnivoiceTts({ python: env.PYTHON_BIN, wrap: heavy("eduvn-tts"), ref: env.OMNIVOICE_REF, refText: refTextOf(env.OMNIVOICE_REF), hfHome: env.HF_HOME }));
  r.register(browserTts);
  if (env.ASR_PROVIDER === "faster-whisper") r.register(createFasterWhisperAsr({ python: env.PYTHON_BIN, wrap: heavy("eduvn-asr"), model: env.WHISPER_MODEL, device: env.WHISPER_DEVICE, hfHome: env.HF_HOME }));
  r.register(webSpeechAsr);
  if (opts.ai) r.register(createVisionOcr(opts.ai));
  registerDefaultParsers(r, { ai: opts.ai, soffice: env.SOFFICE_BIN });
  r.register(createLibreofficePreview({ soffice: env.SOFFICE_BIN }));
  return r;
}
