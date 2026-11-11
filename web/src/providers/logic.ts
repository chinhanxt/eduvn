// Logic thuần của lớp nhà cung cấp phụ phía web (test bằng vitest node): chọn chế độ đọc/nhận dạng, nhóm giọng, định dạng số.

export type ProviderKind = "tts" | "asr" | "image" | "video" | "search" | "fetch" | "ocr" | "parse" | "preview";
export const KIND_ORDER: ProviderKind[] = ["tts", "asr", "parse", "ocr", "preview", "image", "search", "fetch", "video"];

export type ProviderInfo = { id: string; kind: ProviderKind; label: string; description: string; local: boolean; free: boolean; clientOnly?: boolean; gpu?: boolean; formats?: string[]; clone?: boolean };
export type KindCap = { kind: ProviderKind; label: string; available: boolean; server: boolean; default: string | null; providers: ProviderInfo[]; options: Record<string, unknown>; disabled: string[]; all: ProviderInfo[] };
export type Caps = { kinds: Record<ProviderKind, KindCap>; parseFormats: string[] };
export type Voice = { id: string; name: string; provider: string; source: "thu-vien" | "co-san" | "mac-dinh"; gender?: "nam" | "nu"; tags: string[]; speed: number; durationMs?: number; refText?: string; mine?: boolean; detail?: string; createdAt?: string };
export type Health = { kind: ProviderKind; id: string; ok: boolean; detail: string; ms: number };

export const BROWSER_TTS = "trinh-duyet";

/** Đọc bằng máy chủ hay trình duyệt: giọng trình duyệt được chọn, hoặc máy chủ không có giọng → trình duyệt (nếu có). */
export function ttsMode(caps: Caps | undefined, voiceId: string | undefined, browserOk: boolean): "server" | "browser" | "none" {
  if (voiceId === BROWSER_TTS) return browserOk ? "browser" : "none";
  if (caps?.kinds.tts.server) return "server";
  return browserOk && (!caps || caps.kinds.tts.providers.some((p) => p.id === BROWSER_TTS)) ? "browser" : "none";
}

/** Nhận dạng: ưu tiên ASR máy chủ (cần ghi âm được); không có thì Web Speech; không có gì thì khoá mic. */
export function asrMode(caps: Caps | undefined, env: { recorder: boolean; webSpeech: boolean }, prefer?: "server" | "browser"): "server" | "browser" | "none" {
  const server = !!caps?.kinds.asr.server && env.recorder;
  const browser = env.webSpeech && (!caps || caps.kinds.asr.providers.some((p) => p.id === "web-speech"));
  if (prefer === "browser" && browser) return "browser";
  if (server) return "server";
  return browser ? "browser" : "none";
}

export type VoiceGroup = { key: string; label: string; voices: Voice[] };
/** Nhóm cho ô chọn giọng: thư viện của trường → giọng mặc định engine → giọng có sẵn theo engine. */
export function groupVoices(voices: readonly Voice[], providerLabel: (id: string) => string = (x) => x): VoiceGroup[] {
  const lib = voices.filter((v) => v.source === "thu-vien");
  const def = voices.filter((v) => v.source === "mac-dinh");
  const groups: VoiceGroup[] = [];
  if (lib.length) groups.push({ key: "thu-vien", label: "Thư viện giọng của trường", voices: lib });
  if (def.length) groups.push({ key: "mac-dinh", label: "Giọng mặc định", voices: def });
  const byProvider = new Map<string, Voice[]>();
  for (const v of voices) if (v.source === "co-san") byProvider.set(v.provider, [...(byProvider.get(v.provider) ?? []), v]);
  for (const [p, vs] of byProvider) groups.push({ key: `co-san:${p}`, label: `Giọng có sẵn · ${providerLabel(p)}`, voices: vs });
  return groups;
}

export const genderVi = (g?: "nam" | "nu") => (g === "nam" ? "Nam" : g === "nu" ? "Nữ" : "");
/** 1,25× */
export const speedVi = (s: number) => `${s.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}×`;
/** 8,0 s · 1 phút 05 s */
export function secondsVi(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
  const m = Math.floor(s / 60);
  return `${m} phút ${String(Math.round(s - m * 60)).padStart(2, "0")} s`;
}

/** Định dạng đọc được → nhóm hiển thị (Văn bản · Văn phòng · Bảng tính · Ảnh). */
export function formatGroups(formats: readonly string[]): { label: string; items: string[] }[] {
  const g: [string, string[]][] = [
    ["Văn bản", ["pdf", "docx", "doc", "odt", "rtf", "txt", "md"]],
    ["Trình chiếu", ["pptx", "ppt", "odp"]],
    ["Bảng tính", ["xlsx", "xls", "ods", "csv", "tsv"]],
    ["Ảnh (đọc chữ)", ["png", "jpg", "webp", "gif", "bmp", "tif", "jp2"]],
  ];
  const have = new Set(formats);
  const out = g.map(([label, xs]) => ({ label, items: xs.filter((x) => have.has(x)).map((x) => x.toUpperCase()) })).filter((x) => x.items.length);
  const known = new Set(g.flatMap(([, xs]) => xs).concat(["markdown", "jpeg", "tiff"]));
  const rest = formats.filter((f) => !known.has(f)).map((f) => f.toUpperCase());
  if (rest.length) out.push({ label: "Khác", items: rest });
  return out;
}

/** Chuỗi accept cho <input type=file> từ danh sách phần mở rộng. */
export const acceptOf = (formats: readonly string[]) => formats.map((f) => `.${f}`).join(",");

/** MediaRecorder: kiểu ghi âm đầu tiên trình duyệt hỗ trợ. */
export function pickMime(isSupported: (m: string) => boolean): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find(isSupported);
}
