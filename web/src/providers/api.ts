// Gọi API nhà cung cấp phụ (/api/nha-cung-cap/*, /api/tieng-noi/*) qua lớp dữ liệu v2.
import { ApiError } from "../apiCore";
import { rawFetch, request } from "../ui/data/http";
import type { Fetcher } from "../ui/data/query";
import type { Caps, Health, ProviderKind, Voice } from "./logic";

export const CAPS_KEY = "nha-cung-cap/kha-nang";
export const VOICES_KEY = "nha-cung-cap/giong";
export const CONFIG_KEY = "nha-cung-cap/cau-hinh";

export type ConfigRow = { kind: ProviderKind; providerId: string; enabled: boolean; isDefault: boolean; options: Record<string, unknown>; updatedAt: string };
export type Config = { rows: ConfigRow[]; canManage: boolean };

export const fetchCaps: Fetcher<Caps> = (signal) => request<Caps>("/api/nha-cung-cap/kha-nang", { signal });
export const fetchVoices: Fetcher<Voice[]> = (signal) => request<Voice[]>("/api/nha-cung-cap/giong", { signal });
export const fetchConfig: Fetcher<Config> = (signal) => request<Config>("/api/nha-cung-cap/cau-hinh", { signal });

export const saveConfig = (body: { kind: ProviderKind; providerId: string; enabled?: boolean; isDefault?: boolean; options?: Record<string, unknown> }) => request<Caps>("/api/nha-cung-cap/cau-hinh", { method: "PUT", body });
export const checkProviders = (kind: ProviderKind, id?: string) => request<Health[]>("/api/nha-cung-cap/kiem-tra", { method: "POST", body: { kind, id } });
export const tryProvider = <T,>(body: Record<string, unknown>) => request<T>("/api/nha-cung-cap/thu", { method: "POST", body });
export const addVoice = (body: { name: string; provider: string; audioBase64: string; refText?: string; gender?: "nam" | "nu"; tags?: string[]; speed?: number }, idempotencyKey?: string) =>
  request<Voice>("/api/nha-cung-cap/giong", { method: "POST", body, idempotencyKey });
export const removeVoice = (id: string) => request<void>(`/api/nha-cung-cap/giong/${encodeURIComponent(id)}`, { method: "DELETE" });

async function blobOf(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<Blob> {
  const res = await rawFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new ApiError(res.status, body);
  }
  return res.blob();
}
/** mp3 của một đoạn (máy chủ cache theo giọng + tốc độ + chữ). */
export const speakBlob = (body: { text: string; voiceId?: string; speed?: number }, signal?: AbortSignal) => blobOf("/api/tieng-noi/doc", { method: "POST", body, signal });
export const voiceSampleBlob = (id: string, signal?: AbortSignal) => blobOf(`/api/nha-cung-cap/giong/${encodeURIComponent(id)}/mau`, { signal });
export type Transcript = { text: string; language: string; durationMs: number; segments: { start: number; end: number; text: string }[]; provider: string };
export const transcribe = (audioBase64: string, language = "vi", signal?: AbortSignal) => request<Transcript>("/api/tieng-noi/nhan-dang", { method: "POST", body: { audioBase64, language }, signal });

/** Blob/File → base64 (không có tiền tố data:). */
export function toBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => reject(r.error ?? new Error("Không đọc được file"));
    r.readAsDataURL(b);
  });
}
