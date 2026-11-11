// Bản giả cho test (mọi gói dùng được): không gọi lệnh ngoài, không GPU, kết quả tất định. Mỗi bản giả ghi lại lệnh gọi trong `calls`.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProviderRegistry, extOf } from "./registry";
import type {
  AsrProvider,
  FetchProvider,
  ImageProvider,
  OcrProvider,
  ParseProvider,
  PreviewProvider,
  ProviderInfo,
  ProviderKind,
  SearchProvider,
  TtsOptions,
  TtsProvider,
  VideoJob,
  VideoProvider,
} from "./types";

const info = (kind: ProviderKind, id: string, extra: Partial<ProviderInfo> = {}): ProviderInfo => ({ id, kind, label: `Giả ${id}`, description: "Bản giả cho test", local: true, free: true, ...extra });
const ok = async () => ({ ok: true, detail: "giả: luôn sẵn sàng" });

/** MP3 câm tối thiểu (một khung MPEG-1 Layer III). */
export const FAKE_MP3 = Buffer.from("fffb9064000000000000000000000000000000000000000000000000000000000000", "hex");

export function fakeTts(id = "gia-tts"): TtsProvider & { calls: { texts: string[]; opts?: TtsOptions }[] } {
  const calls: { texts: string[]; opts?: TtsOptions }[] = [];
  return {
    info: info("tts", id, { clone: true }),
    calls,
    check: ok,
    presets: async () => [
      { id: "Giọng A", label: "Giọng A", gender: "nu" },
      { id: "Giọng B", label: "Giọng B", gender: "nam" },
    ],
    async synthMany(items, dir, opts) {
      calls.push({ texts: items.map((i) => i.text), opts });
      await mkdir(dir, { recursive: true });
      return Promise.all(
        items.map(async (it) => {
          if (!it.text.trim()) return null;
          await writeFile(path.join(dir, `${it.name}.mp3`), FAKE_MP3);
          return { file: `${it.name}.mp3`, durationMs: 400 * it.text.trim().split(/\s+/).length };
        }),
      );
    },
  };
}

export function fakeAsr(text = "xin chào cả lớp", id = "gia-asr"): AsrProvider & { calls: number[] } {
  const calls: number[] = [];
  return {
    info: info("asr", id),
    calls,
    check: ok,
    async transcribe(audio, opts) {
      calls.push(audio.length);
      return { text, language: opts?.language ?? "vi", durationMs: 1500, segments: text ? [{ start: 0, end: 1.5, text }] : [] };
    },
  };
}

export function fakeImage(id = "gia-anh"): ImageProvider & { prompts: string[] } {
  const prompts: string[] = [];
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082", "hex");
  return {
    info: info("image", id),
    prompts,
    check: ok,
    async generate(req) {
      prompts.push(req.prompt);
      return Array.from({ length: req.n ?? 1 }, () => ({ mime: "image/png", data: png, source: { url: "https://example.test/anh", license: "CC0" } }));
    },
  };
}

export function fakeVideo(id = "gia-video"): VideoProvider {
  const jobs = new Map<string, VideoJob>();
  return {
    info: info("video", id),
    check: ok,
    async submit() {
      const jid = `v${jobs.size + 1}`;
      jobs.set(jid, { id: jid, state: "xong", progress: 1, file: `${jid}.mp4` });
      return { id: jid };
    },
    async status(jid) {
      return jobs.get(jid) ?? { id: jid, state: "loi", progress: 0, error: "Không có việc này" };
    },
  };
}

export function fakeSearch(id = "gia-tim"): SearchProvider & { queries: string[] } {
  const queries: string[] = [];
  return {
    info: info("search", id),
    queries,
    check: ok,
    async search(req) {
      queries.push(req.query);
      return { results: Array.from({ length: Math.min(req.limit ?? 3, 3) }, (_, i) => ({ title: `${req.query} — kết quả ${i + 1}`, url: `https://example.test/${i + 1}`, snippet: `Đoạn trích ${i + 1} về ${req.query}` })) };
    },
  };
}

export function fakeFetch(id = "gia-doc-web"): FetchProvider {
  return {
    info: info("fetch", id),
    check: ok,
    async fetch(url, opts) {
      const markdown = `# Trang ${url}\n\nNội dung giả.`.slice(0, opts?.maxChars ?? 100_000);
      return { url, title: `Trang ${url}`, markdown, bytes: markdown.length };
    },
  };
}

export function fakeOcr(text = "Chữ đọc từ ảnh", id = "gia-ocr"): OcrProvider {
  return { info: info("ocr", id), check: ok, ocr: async () => ({ text }) };
}

/** Đọc mọi file như UTF-8, mỗi đoạn trống đôi là một trang. */
export function fakeParse(formats = ["txt", "md", "pdf", "docx", "pptx", "xlsx", "csv", "png"], id = "gia-parse"): ParseProvider {
  return {
    info: info("parse", id, { formats }),
    check: ok,
    async parse(name, buf) {
      const pages = buf
        .toString("utf8")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      return { pages, engine: id, format: extOf(name), warnings: [] };
    },
  };
}

export function fakePreview(id = "gia-xem-truoc"): PreviewProvider {
  return { info: info("preview", id, { formats: ["docx", "pptx", "xlsx"] }), check: ok, toPdf: async () => Buffer.from("%PDF-1.4\n%%EOF\n") };
}

/** Registry đủ 9 loại bằng bản giả. Ghi đè từng loại: `fakeRegistry({ asr: fakeAsr("") })`. */
export function fakeRegistry(over: Partial<{ tts: TtsProvider; asr: AsrProvider; image: ImageProvider; video: VideoProvider; search: SearchProvider; fetch: FetchProvider; ocr: OcrProvider; parse: ParseProvider; preview: PreviewProvider }> = {}): ProviderRegistry {
  const r = new ProviderRegistry();
  r.register(over.tts ?? fakeTts());
  r.register(over.asr ?? fakeAsr());
  r.register(over.image ?? fakeImage());
  r.register(over.video ?? fakeVideo());
  r.register(over.search ?? fakeSearch());
  r.register(over.fetch ?? fakeFetch());
  r.register(over.ocr ?? fakeOcr());
  r.register(over.parse ?? fakeParse());
  r.register(over.preview ?? fakePreview());
  return r;
}
