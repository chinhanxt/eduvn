import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { usageEvents } from "../../src/db/schema";
import { addMember, ensureUser } from "../../src/db/repo";
import { fakeAsr, fakeParse, fakeRegistry, fakeTts } from "../../src/providers/fakes";
import { ProviderRegistry } from "../../src/providers/registry";
import { browserTts } from "../../src/providers/tts/browser";
import { webSpeechAsr } from "../../src/providers/asr/webSpeech";
import { testApp } from "../helpers/app";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
let dataDir: string;
let tts: ReturnType<typeof fakeTts>;
let wav6: string;
let wav2: string;

beforeAll(() => {
  const d = mkdtempSync(path.join(tmpdir(), "eduvn-voice-src-"));
  const mk = (s: number) => {
    const f = path.join(d, `${s}.wav`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `sine=frequency=220:duration=${s}`, "-ar", "44100", f]);
    return readFileSync(f).toString("base64");
  };
  wav6 = mk(10);
  wav2 = mk(2);
  rmSync(d, { recursive: true, force: true });
});

async function setup(registry?: ProviderRegistry) {
  dataDir = mkdtempSync(path.join(tmpdir(), "eduvn-prov-"));
  tts = fakeTts("vieneu");
  const omni = fakeTts("omnivoice");
  t = await testApp({ providers: registry ?? fakeRegistry({ tts }).register(omni).register(browserTts).register(webSpeechAsr), aiLessons: { dataDir } });
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", email: "gv1@example.test", name: "Cô Lan" })}` };
}
beforeEach(async () => setup());
afterEach(async () => {
  await t.app.close();
  rmSync(dataDir, { recursive: true, force: true });
});
const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, headers = auth) => t.app.inject({ method, url, headers, payload: payload as object });

describe("năng lực + cấu hình", () => {
  it("kha-nang: đủ 9 loại, định dạng đọc được, mặc định", async () => {
    const r = await call("GET", "/api/nha-cung-cap/kha-nang");
    expect(r.statusCode).toBe(200);
    const c = r.json();
    expect(Object.keys(c.kinds)).toHaveLength(9);
    expect(c.kinds.tts).toMatchObject({ default: "vieneu", server: true, label: "Giọng đọc" });
    expect(c.kinds.tts.providers.map((p: { id: string }) => p.id)).toEqual(["vieneu", "omnivoice", "trinh-duyet"]);
    expect(c.parseFormats).toContain("pptx");
    expect((await call("GET", "/api/nha-cung-cap/kha-nang", undefined, {})).statusCode).toBe(401);
  });
  it("chủ không gian đổi mặc định, tắt nhà cung cấp, đặt giọng + tốc độ chung; kiểm dữ liệu", async () => {
    expect((await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "omnivoice", isDefault: true })).json().kinds.tts.default).toBe("omnivoice");
    const off = (await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "asr", providerId: "gia-asr", enabled: false })).json();
    expect(off.kinds.asr).toMatchObject({ default: null, server: false, disabled: ["gia-asr"] });
    await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "*", options: { voiceId: "vieneu:Giọng B", speed: 1.25 } });
    const cfg = (await call("GET", "/api/nha-cung-cap/cau-hinh")).json();
    expect(cfg.canManage).toBe(true);
    expect(cfg.rows).toHaveLength(3);
    expect((await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "khong-co", isDefault: true })).statusCode).toBe(400);
    expect((await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "trinh-duyet", isDefault: true })).json().error).toMatch(/trình duyệt/);
    expect((await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "*", options: { speed: 5 } })).statusCode).toBe(400);
    expect((await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "*", options: { la: 1 } })).statusCode).toBe(400);
  });
  it("giáo viên (không phải quản trị) xem được nhưng không đổi cấu hình được", async () => {
    const owner = (await call("GET", "/api/me")).json() as { orgs?: { id: string }[]; orgId?: string };
    const orgId = owner.orgs?.[0]?.id ?? owner.orgId!;
    const u = await ensureUser(t.db, { sub: "gv-2", email: "gv2@example.test", name: "Thầy Nam" });
    await addMember(t.db, orgId, u.id, "teacher");
    const h = { authorization: `Bearer ${await t.sign({ sub: "gv-2", email: "gv2@example.test", name: "Thầy Nam" })}`, "x-org-id": orgId };
    expect((await call("GET", "/api/nha-cung-cap/kha-nang", undefined, h)).statusCode).toBe(200);
    expect((await call("GET", "/api/nha-cung-cap/cau-hinh", undefined, h)).json().canManage).toBe(false);
    expect((await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "omnivoice", isDefault: true }, h)).statusCode).toBe(403);
  });
  it("kiem-tra: một hoặc mọi nhà cung cấp của loại", async () => {
    const all = (await call("POST", "/api/nha-cung-cap/kiem-tra", { kind: "tts" })).json();
    expect(all.map((x: { id: string }) => x.id)).toEqual(["vieneu", "omnivoice", "trinh-duyet"]);
    expect(all[0]).toMatchObject({ ok: true, kind: "tts" });
    expect((await call("POST", "/api/nha-cung-cap/kiem-tra", { kind: "asr", id: "khong-co" })).statusCode).toBe(404);
    expect((await call("POST", "/api/nha-cung-cap/kiem-tra", { kind: "la" })).statusCode).toBe(400);
  });
});

describe("thư viện giọng + đọc", () => {
  it("tải mẫu → chuẩn hoá wav 24 kHz (VieNeu cắt 8 s), nghe mẫu, đọc bằng giọng đó, xoá", async () => {
    const add = await call("POST", "/api/nha-cung-cap/giong", { name: "  Cô   Lan ", provider: "vieneu", audioBase64: wav6, gender: "nu", tags: ["ấm"], speed: 0.9 });
    expect(add.statusCode).toBe(201);
    const v = add.json();
    expect(v).toMatchObject({ name: "Cô Lan", provider: "vieneu", source: "thu-vien", mine: true, speed: 0.9 });
    expect(Math.abs(v.durationMs - 8000)).toBeLessThan(150);
    const list = (await call("GET", "/api/nha-cung-cap/giong")).json() as { id: string; source: string }[];
    expect(list[0]!.id).toBe(v.id);
    expect(list.filter((x) => x.source === "co-san").map((x) => x.id)).toEqual(["vieneu:Giọng A", "vieneu:Giọng B", "omnivoice:Giọng A", "omnivoice:Giọng B"]);
    expect(list.some((x) => x.id === "trinh-duyet")).toBe(true);
    const mau = await call("GET", `/api/nha-cung-cap/giong/${v.id}/mau`);
    expect(mau.headers["content-type"]).toBe("audio/wav");
    expect(mau.rawPayload.subarray(0, 4).toString()).toBe("RIFF");

    const s1 = await call("POST", "/api/tieng-noi/doc", { text: "Chào các em", voiceId: v.id });
    expect(s1.statusCode).toBe(200);
    expect(s1.headers["content-type"]).toBe("audio/mpeg");
    expect(s1.headers["x-tts-cache"]).toBe("miss");
    expect(tts.calls[0]!.opts).toEqual({ voice: { refFile: expect.stringMatching(new RegExp(`/voices/[^/]+/${v.id}\\.wav$`)), refText: undefined }, speed: 0.9 });
    expect((await call("POST", "/api/tieng-noi/doc", { text: "Chào các em", voiceId: v.id })).headers["x-tts-cache"]).toBe("hit");
    expect(tts.calls).toHaveLength(1);

    expect((await call("DELETE", `/api/nha-cung-cap/giong/${v.id}`)).statusCode).toBe(204);
    expect((await call("GET", `/api/nha-cung-cap/giong/${v.id}/mau`)).statusCode).toBe(404);
    expect((await call("DELETE", "/api/nha-cung-cap/giong/khong-phai-uuid")).statusCode).toBe(404);
  });
  it("mẫu quá ngắn, OmniVoice thiếu lời mẫu, file không phải âm thanh → 400 nói cách sửa", async () => {
    expect((await call("POST", "/api/nha-cung-cap/giong", { name: "Ngắn", audioBase64: wav2 })).json().error).toMatch(/quá ngắn/);
    expect((await call("POST", "/api/nha-cung-cap/giong", { name: "Omni", provider: "omnivoice", audioBase64: wav6 })).json().error).toMatch(/lời mẫu/);
    expect((await call("POST", "/api/nha-cung-cap/giong", { name: "Rác", audioBase64: Buffer.from("không phải âm thanh").toString("base64") })).json().error).toMatch(/Không đọc được file mẫu/);
  });
  it("đọc theo giọng có sẵn, giọng chung của trường, tốc độ; giọng trình duyệt/engine tắt bị từ chối", async () => {
    await call("POST", "/api/tieng-noi/doc", { text: "Một", voiceId: "omnivoice:Giọng B", speed: 1.5 });
    expect(tts.calls).toHaveLength(0); // omnivoice là bản giả khác
    await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "*", options: { voiceId: "vieneu:Giọng A", speed: 1.2 } });
    await call("POST", "/api/tieng-noi/doc", { text: "Hai" });
    expect(tts.calls.at(-1)!.opts).toEqual({ voice: { preset: "Giọng A" }, speed: 1.2 });
    expect((await call("POST", "/api/tieng-noi/doc", { text: "Ba", voiceId: "trinh-duyet" })).json().error).toMatch(/trình duyệt/);
    await call("PUT", "/api/nha-cung-cap/cau-hinh", { kind: "tts", providerId: "vieneu", enabled: false });
    expect((await call("POST", "/api/tieng-noi/doc", { text: "Bốn", voiceId: "vieneu:Giọng A" })).json().error).toMatch(/đã tắt/);
    expect((await call("POST", "/api/tieng-noi/doc", { text: "x".repeat(3001) })).statusCode).toBe(400);
    const usage = await t.db.select().from(usageEvents).where(eq(usageEvents.kind, "tts"));
    expect(usage.map((u) => [u.provider, u.unit, u.units])).toEqual([["omnivoice", "ky_tu", 3], ["vieneu", "ky_tu", 3]]);
  });
});

describe("nhận dạng giọng nói + thử", () => {
  it("nhận dạng bằng ASR máy chủ, ghi lượt dùng theo giây", async () => {
    const r = await call("POST", "/api/tieng-noi/nhan-dang", { audioBase64: wav2 });
    expect(r.json()).toMatchObject({ text: "xin chào cả lớp", language: "vi", provider: "gia-asr" });
    const [u] = await t.db.select().from(usageEvents).where(eq(usageEvents.kind, "asr"));
    expect(u).toMatchObject({ unit: "giay", units: 1.5, ok: true });
  });
  it("máy chủ chỉ có Web Speech → 400 gợi ý dùng trình duyệt", async () => {
    await t.app.close();
    rmSync(dataDir, { recursive: true, force: true });
    await setup(new ProviderRegistry().register(fakeTts()).register(webSpeechAsr).register(fakeParse()));
    const r = await call("POST", "/api/tieng-noi/nhan-dang", { audioBase64: wav2 });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toMatch(/trình duyệt/);
  });
  it("thu: tts trả mp3 base64, asr trả chữ, parse trả trang + đoạn xem trước, ocr trả chữ", async () => {
    const a = (await call("POST", "/api/nha-cung-cap/thu", { kind: "tts", voiceId: "vieneu:Giọng A" })).json();
    expect(a.audio).toMatch(/^data:audio\/mpeg;base64,/);
    expect((await call("POST", "/api/nha-cung-cap/thu", { kind: "asr", audioBase64: wav2 })).json().text).toBe("xin chào cả lớp");
    const p = (await call("POST", "/api/nha-cung-cap/thu", { kind: "parse", name: "bai.txt", contentBase64: Buffer.from("Trang một\n\nTrang hai").toString("base64") })).json();
    expect(p).toMatchObject({ pages: 2, format: "txt", preview: "Trang một\n\nTrang hai", provider: "gia-parse" });
    expect((await call("POST", "/api/nha-cung-cap/thu", { kind: "parse", name: "a.heic", contentBase64: "eA==" })).json().error).toMatch(/Chưa hỗ trợ định dạng \.heic/);
    expect((await call("POST", "/api/nha-cung-cap/thu", { kind: "ocr", mime: "image/png", imageBase64: "eA==" })).json().text).toBe("Chữ đọc từ ảnh");
    expect((await call("POST", "/api/nha-cung-cap/thu", { kind: "video" })).statusCode).toBe(400);
  });
});
