import { describe, expect, it } from "vitest";
import { type Caps, type KindCap, type ProviderKind, type Voice, acceptOf, asrMode, formatGroups, groupVoices, pickMime, secondsVi, speedVi, ttsMode } from "../src/providers/logic";

const kind = (k: ProviderKind, ids: { id: string; clientOnly?: boolean }[], def: string | null): KindCap => {
  const providers = ids.map((p) => ({ id: p.id, kind: k, label: p.id, description: "", local: true, free: true, clientOnly: p.clientOnly }));
  return { kind: k, label: k, available: ids.length > 0, server: ids.some((p) => !p.clientOnly), default: def, providers, all: providers, options: {}, disabled: [] };
};
const caps = (tts: KindCap, asr: KindCap): Caps => ({ kinds: { tts, asr } as Caps["kinds"], parseFormats: [] });
const full = caps(kind("tts", [{ id: "vieneu" }, { id: "trinh-duyet", clientOnly: true }], "vieneu"), kind("asr", [{ id: "faster-whisper" }, { id: "web-speech", clientOnly: true }], "faster-whisper"));
const browserOnly = caps(kind("tts", [{ id: "trinh-duyet", clientOnly: true }], null), kind("asr", [{ id: "web-speech", clientOnly: true }], null));

describe("chế độ đọc / nhận dạng", () => {
  it("ttsMode: chọn giọng trình duyệt → browser; máy chủ có giọng → server; không có → trình duyệt nếu được", () => {
    expect(ttsMode(full, undefined, true)).toBe("server");
    expect(ttsMode(full, "trinh-duyet", true)).toBe("browser");
    expect(ttsMode(full, "trinh-duyet", false)).toBe("none");
    expect(ttsMode(browserOnly, "vieneu:Adam", true)).toBe("browser");
    expect(ttsMode(browserOnly, undefined, false)).toBe("none");
  });
  it("asrMode: ưu tiên máy chủ khi ghi âm được; chọn trình duyệt khi muốn; khoá mic khi không có gì", () => {
    expect(asrMode(full, { recorder: true, webSpeech: true })).toBe("server");
    expect(asrMode(full, { recorder: true, webSpeech: true }, "browser")).toBe("browser");
    expect(asrMode(full, { recorder: false, webSpeech: true })).toBe("browser");
    expect(asrMode(browserOnly, { recorder: true, webSpeech: false })).toBe("none");
    expect(asrMode(undefined, { recorder: true, webSpeech: true })).toBe("browser");
  });
});

describe("giọng + định dạng", () => {
  const v = (id: string, source: Voice["source"], provider = "vieneu"): Voice => ({ id, name: id, provider, source, tags: [], speed: 1 });
  it("groupVoices: thư viện → mặc định → có sẵn theo engine", () => {
    const g = groupVoices([v("vieneu:Adam", "co-san"), v("u1", "thu-vien"), v("vieneu", "mac-dinh"), v("omnivoice:X", "co-san", "omnivoice")], (id) => id.toUpperCase());
    expect(g.map((x) => [x.label, x.voices.map((y) => y.id)])).toEqual([
      ["Thư viện giọng của trường", ["u1"]],
      ["Giọng mặc định", ["vieneu"]],
      ["Giọng có sẵn · VIENEU", ["vieneu:Adam"]],
      ["Giọng có sẵn · OMNIVOICE", ["omnivoice:X"]],
    ]);
    expect(groupVoices([])).toEqual([]);
  });
  it("định dạng số kiểu Việt", () => {
    expect(speedVi(1.25)).toBe("1,25×");
    expect(secondsVi(8000)).toBe("8,0 s");
    expect(secondsVi(65_000)).toBe("1 phút 05 s");
  });
  it("formatGroups + acceptOf", () => {
    expect(formatGroups(["pdf", "pptx", "csv", "png", "markdown", "epub"])).toEqual([
      { label: "Văn bản", items: ["PDF"] },
      { label: "Trình chiếu", items: ["PPTX"] },
      { label: "Bảng tính", items: ["CSV"] },
      { label: "Ảnh (đọc chữ)", items: ["PNG"] },
      { label: "Khác", items: ["EPUB"] },
    ]);
    expect(acceptOf(["pdf", "docx"])).toBe(".pdf,.docx");
  });
  it("pickMime chọn kiểu ghi âm đầu tiên được hỗ trợ", () => {
    expect(pickMime((m) => m === "audio/mp4")).toBe("audio/mp4");
    expect(pickMime(() => false)).toBeUndefined();
  });
});
