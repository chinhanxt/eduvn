// Logic thuần của nhà cung cấp phụ (G1): gộp cấu hình trường vào năng lực máy chủ, mã giọng, khoá cache tiếng.
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Capabilities, ProviderKind } from "../providers/types";
import { PROVIDER_KINDS } from "../providers/types";

export type ProviderConfigRow = { kind: string; providerId: string; enabled: boolean; isDefault: boolean; options: Record<string, unknown> };

export type OrgKindCapability = Capabilities["kinds"][ProviderKind] & {
  /** Tuỳ chọn của nhà cung cấp mặc định (tts: voiceId, speed; asr: language). */
  options: Record<string, unknown>;
  /** Mã các nhà cung cấp trường đã tắt. */
  disabled: string[];
  /** Mọi nhà cung cấp máy chủ có (kể cả đã tắt) — để trang cài đặt bật lại. */
  all: Capabilities["kinds"][ProviderKind]["providers"];
};
export type OrgCapabilities = { kinds: Record<ProviderKind, OrgKindCapability>; parseFormats: string[] };

/**
 * Năng lực theo trường: bỏ nhà cung cấp trường đã tắt, mặc định = cái trường chọn (nếu còn bật), không thì mặc định máy chủ
 * (nếu còn bật), không thì cái máy chủ đầu tiên còn bật. Định dạng đọc được chỉ tính bộ parse còn bật.
 */
export function orgCapabilities(caps: Capabilities, rows: ProviderConfigRow[]): OrgCapabilities {
  const kinds = {} as OrgCapabilities["kinds"];
  for (const k of PROVIDER_KINDS) {
    const c = caps.kinds[k];
    const mine = rows.filter((r) => r.kind === k);
    const disabled = mine.filter((r) => !r.enabled).map((r) => r.providerId);
    const providers = c.providers.filter((p) => !disabled.includes(p.id));
    const serverIds = providers.filter((p) => !p.clientOnly).map((p) => p.id);
    const picked = mine.find((r) => r.isDefault && r.enabled && providers.some((p) => p.id === r.providerId));
    const def = picked?.providerId ?? (c.default && serverIds.includes(c.default) ? c.default : (serverIds[0] ?? null));
    const options = mine.find((r) => r.providerId === "*")?.options ?? {};
    kinds[k] = { ...c, providers, all: c.providers, available: providers.length > 0, server: serverIds.length > 0, default: def, options, disabled };
  }
  const parseFormats = [...new Set(kinds.parse.providers.flatMap((p) => p.formats ?? []))].sort();
  return { kinds, parseFormats };
}

/** Mã giọng: uuid = giọng trong thư viện của trường; "<engine>:<tên>" = giọng có sẵn của engine; "<engine>" = giọng mặc định của engine. */
export type VoiceId = { kind: "thu-vien"; id: string } | { kind: "co-san"; provider: string; preset?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseVoiceId(v: string): VoiceId {
  if (UUID.test(v)) return { kind: "thu-vien", id: v.toLowerCase() };
  const i = v.indexOf(":");
  return i < 0 ? { kind: "co-san", provider: v } : { kind: "co-san", provider: v.slice(0, i), preset: v.slice(i + 1) || undefined };
}

export const Speed = z.number().min(0.5).max(2);
export const MAX_SPEAK_CHARS = 3000;

/** Khoá cache tiếng: cùng engine + giọng + tốc độ + chữ → cùng file. */
export function speechCacheKey(provider: string, voice: string, speed: number, text: string): string {
  return createHash("sha256").update(JSON.stringify([provider, voice, Math.round(speed * 100) / 100, text.normalize("NFC").trim()])).digest("hex").slice(0, 40);
}

/** Tên giọng: gọn khoảng trắng, 1–60 ký tự, không ký tự điều khiển hay dấu đường dẫn. */
export const VoiceName = z
  .string()
  .transform((s) => s.normalize("NFC").replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Đặt tên giọng").max(60, "Tên giọng tối đa 60 ký tự").regex(/^[^/\\\p{Cc}]+$/u, "Tên giọng không được có / hoặc \\"));

/** Mẫu giọng hợp lệ để nhân bản: 3–30 giây. */
export function voiceSampleIssue(durationMs: number): string | null {
  if (!Number.isFinite(durationMs) || durationMs < 3000) return "Mẫu giọng quá ngắn — cần ít nhất 3 giây nói rõ";
  if (durationMs > 30_000) return "Mẫu giọng dài quá 30 giây — cắt còn 5–15 giây nói rõ";
  return null;
}
