import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fakeAsr, fakeParse, fakeRegistry, fakeTts } from "../../src/providers/fakes";
import { ProviderRegistry, extOf } from "../../src/providers/registry";
import { PROVIDER_KINDS, type TtsProvider } from "../../src/providers/types";

const browserTts: TtsProvider = {
  info: { id: "trinh-duyet", kind: "tts", label: "Trình duyệt", description: "", local: true, free: true, clientOnly: true },
  check: async () => ({ ok: true, detail: "" }),
  presets: async () => [],
  synthMany: async (items) => items.map(() => null),
};

describe("ProviderRegistry", () => {
  it("mặc định = adapter máy chủ đăng ký đầu tiên, bỏ qua adapter chỉ chạy trong trình duyệt", () => {
    const r = new ProviderRegistry().register(browserTts).register(fakeTts("a")).register(fakeTts("b"));
    expect(r.defaultOf("tts")).toBe("a");
    expect(r.get("tts").info.id).toBe("a");
    r.setDefault("tts", "b");
    expect(r.get("tts").info.id).toBe("b");
    expect(r.get("tts", "trinh-duyet").info.clientOnly).toBe(true);
  });
  it("chỉ có adapter trình duyệt → available nhưng không có server, không có mặc định", () => {
    const c = new ProviderRegistry().register(browserTts).capabilities();
    expect(c.kinds.tts).toMatchObject({ available: true, server: false, default: null, label: "Giọng đọc" });
    expect(c.kinds.asr).toMatchObject({ available: false, server: false, providers: [] });
  });
  it("lỗi rõ khi trùng mã, mã lạ, loại chưa có", () => {
    const r = new ProviderRegistry().register(fakeTts("a"));
    expect(() => r.register(fakeTts("a"))).toThrow(/đã đăng ký/);
    expect(() => r.setDefault("tts", "x")).toThrow(/Không có nhà cung cấp giọng đọc "x"/);
    expect(() => r.get("asr")).toThrow(/chưa có nhà cung cấp nhận dạng giọng nói/);
    expect(r.find("asr")).toBeUndefined();
  });
  it("parserFor chọn theo phần mở rộng; parseFormats gộp, sắp xếp", () => {
    const r = new ProviderRegistry().register(fakeParse(["pdf", "docx"], "p1")).register(fakeParse(["pptx", "pdf"], "p2"));
    expect(r.parserFor("Bai giang.PPTX")?.info.id).toBe("p2");
    expect(r.parserFor("de.pdf")?.info.id).toBe("p1");
    expect(r.parserFor("anh.heic")).toBeUndefined();
    expect(r.capabilities().parseFormats).toEqual(["docx", "pdf", "pptx"]);
    expect(extOf("a.tar.GZ")).toBe("gz");
    expect(extOf("khong-duoi")).toBe("");
  });
});

describe("bản giả", () => {
  it("fakeRegistry đủ 9 loại, ghi đè từng loại", async () => {
    const r = fakeRegistry({ asr: fakeAsr("") });
    for (const k of PROVIDER_KINDS) expect(r.capabilities().kinds[k].server).toBe(true);
    expect((await r.get("asr").transcribe(Buffer.from("x"))).segments).toEqual([]);
    expect((await r.get("search").search({ query: "định luật Ôm", limit: 2 })).results).toHaveLength(2);
    expect((await r.get("image").generate({ prompt: "tam giác", n: 2 }))[0]!.mime).toBe("image/png");
    const v = await r.get("video").submit({ prompt: "x" });
    expect((await r.get("video").status(v.id)).state).toBe("xong");
    expect((await r.get("parse").parse("a.txt", Buffer.from("Trang 1\n\nTrang 2"))).pages).toEqual(["Trang 1", "Trang 2"]);
  });
  it("fakeTts ghi file mp3 + ghi lại tham số giọng", async () => {
    const tts = fakeTts();
    const dir = await mkdtemp(path.join(tmpdir(), "fake-tts-"));
    try {
      const out = await tts.synthMany([{ text: "Xin chào các em", name: "c1" }, { text: " ", name: "c2" }], dir, { voice: { preset: "Giọng A" }, speed: 1.2 });
      expect(out[0]).toEqual({ file: "c1.mp3", durationMs: 1600 });
      expect(out[1]).toBeNull();
      expect((await readFile(path.join(dir, "c1.mp3"))).length).toBeGreaterThan(0);
      expect(tts.calls[0]!.opts).toEqual({ voice: { preset: "Giọng A" }, speed: 1.2 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
