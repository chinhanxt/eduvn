// Giao diện chung cho mọi nhà cung cấp phụ (G1 sở hữu). Gói khác chỉ import file này + registry.ts + fakes.ts.
// Mỗi loại có một adapter; mặc định là phương án tự chạy / miễn phí (docs/research/2026-11-11-p14-parity.md mục 1).

export const PROVIDER_KINDS = ["tts", "asr", "image", "video", "search", "fetch", "ocr", "parse", "preview"] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

/** Nhãn tiếng Việt của từng loại (dùng cho trang cài đặt, thông báo lỗi). */
export const KIND_LABELS: Record<ProviderKind, string> = {
  tts: "Giọng đọc",
  asr: "Nhận dạng giọng nói",
  image: "Sinh ảnh",
  video: "Sinh video",
  search: "Tìm web",
  fetch: "Đọc trang web",
  ocr: "Đọc chữ trong ảnh",
  parse: "Đọc tài liệu",
  preview: "Xem trước tài liệu",
};

export type ProviderInfo = {
  /** Mã ổn định, snake/kebab không dấu: "vieneu", "faster-whisper", "libreoffice"… */
  id: string;
  kind: ProviderKind;
  label: string;
  description: string;
  /** Chạy trên máy chủ của trường (không gửi dữ liệu ra ngoài). */
  local: boolean;
  /** Không mất phí theo lượt. */
  free: boolean;
  /** Chạy trong trình duyệt người dùng (máy chủ không gọi được, vd speechSynthesis / Web Speech). */
  clientOnly?: boolean;
  /** Cần GPU (chạy qua khoá việc nặng, một việc một lúc). */
  gpu?: boolean;
  /** parse/preview: phần mở rộng đọc được (không dấu chấm, chữ thường). */
  formats?: string[];
  /** tts: nhận file mẫu để nhân bản giọng. */
  clone?: boolean;
};

export type ProviderHealth = { ok: boolean; detail: string; ms?: number };

export interface BaseProvider {
  readonly info: ProviderInfo;
  /** Kiểm nhanh, không nạp model nặng: lệnh/model có trên máy, dịch vụ trả lời. */
  check(): Promise<ProviderHealth>;
}

// ── TTS ────────────────────────────────────────────────────────────────────

export type TtsItem = { text: string; name: string };
export type TtsResult = { file: string; durationMs: number };
/** Giọng dùng cho một lần đọc: giọng có sẵn của engine (`preset`) hoặc file mẫu để nhân giọng (`refFile` + lời mẫu). */
export type TtsVoiceRef = { preset?: string; refFile?: string; refText?: string };
export type TtsOptions = { voice?: TtsVoiceRef; /** 0.5–2, 1 = bình thường. */ speed?: number };
/** Giọng có sẵn của một engine (không tính giọng GV tải lên — bảng `voices`). */
export type TtsPreset = { id: string; label: string; gender?: "nam" | "nu"; region?: string; style?: string };

export interface TtsProvider extends BaseProvider {
  /** Đọc nhiều câu; trả mảng cùng thứ tự: tên file .mp3 (trong `dir`) + thời lượng ms, null nếu câu rỗng/lỗi. */
  synthMany(items: TtsItem[], dir: string, opts?: TtsOptions): Promise<(TtsResult | null)[]>;
  presets(): Promise<TtsPreset[]>;
}

// ── ASR ────────────────────────────────────────────────────────────────────

export type AsrSegment = { start: number; end: number; text: string };
export type AsrResult = { text: string; language: string; durationMs: number; segments: AsrSegment[] };
export type AsrOptions = { language?: string; /** gợi ý từ vựng (tên riêng, thuật ngữ môn). */ prompt?: string; signal?: AbortSignal };
export interface AsrProvider extends BaseProvider {
  /** Âm thanh bất kỳ định dạng ffmpeg đọc được (webm/ogg/mp3/wav/m4a/mp4…). */
  transcribe(audio: Buffer, opts?: AsrOptions): Promise<AsrResult>;
}

// ── Ảnh ────────────────────────────────────────────────────────────────────

export type ImageRequest = { prompt: string; size?: "256x256" | "512x512" | "1024x1024" | "1024x768" | "768x1024" | "1280x720"; style?: string; n?: number; signal?: AbortSignal };
export type ImageAsset = {
  mime: string;
  data: Buffer;
  /** Kho ảnh mở: trang gốc, tác giả, giấy phép (bắt buộc ghi khi dùng). */
  source?: { url: string; author?: string; license?: string; title?: string };
};
export interface ImageProvider extends BaseProvider {
  generate(req: ImageRequest): Promise<ImageAsset[]>;
}

// ── Video (bất đồng bộ: gửi → hỏi trạng thái) ───────────────────────────────

export type VideoRequest = { prompt: string; aspect?: "16:9" | "9:16" | "1:1"; durationS?: number; resolution?: "480p" | "720p" | "1080p" };
export type VideoJob = { id: string; state: "cho" | "dang-chay" | "xong" | "loi"; progress: number; file?: string; error?: string };
export interface VideoProvider extends BaseProvider {
  submit(req: VideoRequest): Promise<{ id: string }>;
  status(id: string): Promise<VideoJob>;
}

// ── Tìm web / đọc trang ────────────────────────────────────────────────────

export type SearchResult = { title: string; url: string; snippet: string; source?: string; publishedAt?: string };
export type SearchRequest = { query: string; limit?: number; language?: string; signal?: AbortSignal };
export interface SearchProvider extends BaseProvider {
  search(req: SearchRequest): Promise<{ results: SearchResult[]; answer?: string }>;
}

export type FetchedPage = { url: string; title: string; markdown: string; bytes: number };
export interface FetchProvider extends BaseProvider {
  fetch(url: string, opts?: { maxChars?: number; signal?: AbortSignal }): Promise<FetchedPage>;
}

// ── OCR / đọc tài liệu / xem trước ─────────────────────────────────────────

export type OcrRequest = { image: Buffer; mime: string; /** "Trang 3", "Ảnh bài làm câu 2"… */ hint?: string; signal?: AbortSignal };
export interface OcrProvider extends BaseProvider {
  ocr(req: OcrRequest): Promise<{ text: string }>;
}

export type ParseProgress = { total: number; done: number };
export type ParseOptions = { onProgress?: (p: ParseProgress) => void; signal?: AbortSignal };
export type ParseResult = { pages: string[]; engine: string; format: string; warnings: string[] };
export interface ParseProvider extends BaseProvider {
  parse(name: string, buf: Buffer, opts?: ParseOptions): Promise<ParseResult>;
}

export interface PreviewProvider extends BaseProvider {
  /** Tài liệu văn phòng → PDF để xem trước. */
  toPdf(name: string, buf: Buffer): Promise<Buffer>;
}

export type ProviderOf = {
  tts: TtsProvider;
  asr: AsrProvider;
  image: ImageProvider;
  video: VideoProvider;
  search: SearchProvider;
  fetch: FetchProvider;
  ocr: OcrProvider;
  parse: ParseProvider;
  preview: PreviewProvider;
};
export type AnyProvider = ProviderOf[ProviderKind];

// ── Năng lực (GET /api/nha-cung-cap/kha-nang) ──────────────────────────────

export type KindCapability = {
  kind: ProviderKind;
  label: string;
  /** Có ít nhất một nhà cung cấp chạy được (kể cả chỉ trong trình duyệt). */
  available: boolean;
  /** Có nhà cung cấp chạy phía máy chủ. */
  server: boolean;
  default: string | null;
  providers: ProviderInfo[];
};
export type Capabilities = {
  kinds: Record<ProviderKind, KindCapability>;
  /** Phần mở rộng tài liệu máy chủ đọc được (gộp mọi bộ parse). */
  parseFormats: string[];
};
