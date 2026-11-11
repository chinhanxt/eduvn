import { describe, expect, it } from "vitest";
import { orgCapabilities, parseVoiceId, speechCacheKey, voiceSampleIssue, VoiceName } from "../../src/domain/providers";
import { fakeAsr, fakeTts } from "../../src/providers/fakes";
import { ProviderRegistry } from "../../src/providers/registry";
import { browserTts } from "../../src/providers/tts/browser";

const reg = () => new ProviderRegistry().register(fakeTts("vieneu")).register(fakeTts("omnivoice")).register(browserTts).register(fakeAsr());
const row = (kind: string, providerId: string, x: { enabled?: boolean; isDefault?: boolean; options?: Record<string, unknown> } = {}) => ({ kind, providerId, enabled: x.enabled ?? true, isDefault: x.isDefault ?? false, options: x.options ?? {} });

describe("orgCapabilities", () => {
  it("không có cấu hình → giống máy chủ", () => {
    const c = orgCapabilities(reg().capabilities(), []);
    expect(c.kinds.tts).toMatchObject({ default: "vieneu", server: true, disabled: [], options: {} });
    expect(c.kinds.tts.providers.map((p) => p.id)).toEqual(["vieneu", "omnivoice", "trinh-duyet"]);
  });
  it("trường chọn mặc định + tuỳ chọn chung của loại", () => {
    const c = orgCapabilities(reg().capabilities(), [row("tts", "omnivoice", { isDefault: true }), row("tts", "*", { options: { voiceId: "vieneu:Ngọc Linh", speed: 1.1 } })]);
    expect(c.kinds.tts.default).toBe("omnivoice");
    expect(c.kinds.tts.options).toEqual({ voiceId: "vieneu:Ngọc Linh", speed: 1.1 });
  });
  it("tắt mặc định của máy chủ → lấy cái máy chủ còn bật; tắt hết máy chủ → chỉ còn trình duyệt", () => {
    let c = orgCapabilities(reg().capabilities(), [row("tts", "vieneu", { enabled: false })]);
    expect(c.kinds.tts).toMatchObject({ default: "omnivoice", disabled: ["vieneu"] });
    c = orgCapabilities(reg().capabilities(), [row("tts", "vieneu", { enabled: false }), row("tts", "omnivoice", { enabled: false, isDefault: true })]);
    expect(c.kinds.tts).toMatchObject({ default: null, server: false, available: true });
    c = orgCapabilities(reg().capabilities(), [row("asr", "gia-asr", { enabled: false })]);
    expect(c.kinds.asr).toMatchObject({ available: false, default: null });
  });
});

describe("mã giọng, cache, mẫu", () => {
  it("parseVoiceId", () => {
    expect(parseVoiceId("6F1D2C3B-1111-4222-8333-444455556666")).toEqual({ kind: "thu-vien", id: "6f1d2c3b-1111-4222-8333-444455556666" });
    expect(parseVoiceId("vieneu:Ngọc Linh")).toEqual({ kind: "co-san", provider: "vieneu", preset: "Ngọc Linh" });
    expect(parseVoiceId("omnivoice")).toEqual({ kind: "co-san", provider: "omnivoice" });
  });
  it("khoá cache ổn định theo engine/giọng/tốc độ/chữ", () => {
    const k = speechCacheKey("vieneu", "a", 1, "Xin chào");
    expect(speechCacheKey("vieneu", "a", 1.0001, " Xin chào ")).toBe(k);
    expect(speechCacheKey("vieneu", "a", 1.2, "Xin chào")).not.toBe(k);
    expect(speechCacheKey("omnivoice", "a", 1, "Xin chào")).not.toBe(k);
  });
  it("mẫu 3–30 giây; tên giọng gọn, không có dấu đường dẫn", () => {
    expect(voiceSampleIssue(2500)).toMatch(/quá ngắn/);
    expect(voiceSampleIssue(31_000)).toMatch(/30 giây/);
    expect(voiceSampleIssue(6000)).toBeNull();
    expect(VoiceName.parse("  Cô   Lan  ")).toBe("Cô Lan");
    expect(VoiceName.safeParse("a/b").success).toBe(false);
    expect(VoiceName.safeParse("   ").success).toBe(false);
  });
});
