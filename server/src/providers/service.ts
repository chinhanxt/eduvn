// Dịch vụ nhà cung cấp phụ theo trường: năng lực, cấu hình, kiểm tra, thử, thư viện giọng, đọc/nhận dạng giọng nói, ghi lượt dùng.
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { providerConfigs, usageEvents, voices } from "../db/schema";
import { assertCan, ForbiddenError } from "../domain/authz";
import { MAX_SPEAK_CHARS, type OrgCapabilities, Speed, VoiceName, orgCapabilities, parseVoiceId, speechCacheKey, voiceSampleIssue } from "../domain/providers";
import { NotFoundError, ValidationError } from "../errors";
import type { Actor } from "../service";
import { parseDocument } from "./parse";
import { ProviderRegistry } from "./registry";
import { KIND_LABELS, PROVIDER_KINDS, type ProviderKind, type TtsOptions, type TtsPreset } from "./types";
import { probeMs, run } from "./util";

const Kind = z.enum(PROVIDER_KINDS);
const b64 = (max: number, label: string) =>
  z
    .string()
    .min(1)
    .transform((s) => Buffer.from(s.replace(/^data:[^,]*,/, ""), "base64"))
    .refine((b) => b.length <= max, `${label} quá lớn (tối đa ${Math.round(max / 1024 / 1024)} MB)`);
const MAX_AUDIO = 25 * 1024 * 1024;
const MAX_DOC = 20 * 1024 * 1024;

export const ConfigInput = z.object({
  kind: Kind,
  /** "*" = tuỳ chọn chung của loại (tts: voiceId, speed · asr: language). */
  providerId: z.string().min(1).max(60),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
const TtsKindOptions = z.object({ voiceId: z.string().min(1).max(120).optional(), speed: Speed.optional() }).strict();
const AsrKindOptions = z.object({ language: z.string().regex(/^[a-z]{2}$/).optional() }).strict();
export const SpeakInput = z.object({ text: z.string().trim().min(1, "Nhập câu cần đọc").max(MAX_SPEAK_CHARS, `Tối đa ${MAX_SPEAK_CHARS} ký tự mỗi lần đọc`), voiceId: z.string().min(1).max(120).optional(), speed: Speed.optional() });
export const TranscribeInput = z.object({ audioBase64: b64(MAX_AUDIO, "Bản ghi"), language: z.string().regex(/^[a-z]{2}$/).optional(), provider: z.string().optional() });
export const VoiceInput = z.object({
  name: VoiceName,
  provider: z.enum(["vieneu", "omnivoice"]).default("vieneu"),
  audioBase64: b64(MAX_AUDIO, "File mẫu"),
  refText: z.string().trim().max(1000).default(""),
  gender: z.enum(["nam", "nu"]).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  speed: Speed.default(1),
});
const TryInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("tts"), id: z.string().optional(), text: z.string().trim().min(1).max(500).default("Xin chào các em, hôm nay chúng ta học bài mới."), voiceId: z.string().optional(), speed: Speed.optional() }),
  z.object({ kind: z.literal("asr"), id: z.string().optional(), audioBase64: b64(MAX_AUDIO, "Bản ghi"), language: z.string().optional() }),
  z.object({ kind: z.literal("parse"), id: z.string().optional(), name: z.string().min(1).max(200), contentBase64: b64(MAX_DOC, "Tài liệu") }),
  z.object({ kind: z.literal("ocr"), id: z.string().optional(), mime: z.enum(["image/png", "image/jpeg", "image/webp"]), imageBase64: b64(MAX_DOC, "Ảnh") }),
]);

export type VoiceView = { id: string; name: string; provider: string; source: "thu-vien" | "co-san" | "mac-dinh"; gender?: "nam" | "nu"; tags: string[]; speed: number; durationMs?: number; refText?: string; ownerId?: string; mine?: boolean; detail?: string; createdAt?: string };

const assertStaff = (a: Actor) => {
  if (a.role === "student") throw new ForbiddenError("Học sinh không dùng được mục này");
};

export type ProviderService = ReturnType<typeof createProviderService>;

export function createProviderService(db: Db, registry: ProviderRegistry, cfg: { dataDir: string }) {
  const voicesDir = (orgId: string) => path.join(cfg.dataDir, "voices", orgId);
  const cacheDir = path.join(cfg.dataDir, "tts-cache");

  async function rows(orgId: string) {
    return db.select().from(providerConfigs).where(eq(providerConfigs.orgId, orgId));
  }

  async function caps(actor: Actor): Promise<OrgCapabilities> {
    return orgCapabilities(registry.capabilities(), await rows(actor.orgId));
  }

  async function usage(actor: Actor, e: { kind: ProviderKind; provider: string; units: number; unit: string; ok: boolean; ms: number; meta?: Record<string, unknown> }) {
    await db
      .insert(usageEvents)
      .values({ orgId: actor.orgId, userId: actor.userId, ...e, meta: e.meta ?? {} })
      .catch((err: unknown) => console.error("usage_events", err));
  }

  /** Mặc định của trường cho một loại; `id` truyền vào phải có và chưa bị tắt. */
  async function pick<K extends ProviderKind>(actor: Actor, kind: K, id?: string) {
    const c = (await caps(actor)).kinds[kind];
    if (id) {
      if (!c.providers.some((p) => p.id === id)) throw new NotFoundError(c.disabled.includes(id) ? `Trường đã tắt nhà cung cấp "${id}"` : `Không có nhà cung cấp ${KIND_LABELS[kind].toLowerCase()} "${id}"`);
      return { p: registry.get(kind, id), c };
    }
    if (!c.default) throw new ValidationError([`Máy chủ chưa có ${KIND_LABELS[kind].toLowerCase()} chạy được${c.available ? " — dùng bản chạy trên trình duyệt" : ""}`]);
    return { p: registry.get(kind, c.default), c };
  }

  async function voiceRow(actor: Actor, id: string) {
    if (!z.uuid().safeParse(id).success) throw new NotFoundError("Không có giọng này trong thư viện");
    const [v] = await db
      .select()
      .from(voices)
      .where(and(eq(voices.id, id), eq(voices.orgId, actor.orgId)));
    if (!v) throw new NotFoundError("Không có giọng này trong thư viện");
    return v;
  }

  /** Mã giọng → engine + tham số. Không có mã → giọng mặc định của trường, rồi engine mặc định. */
  async function resolveVoice(actor: Actor, voiceId: string | undefined, fallbackSpeed?: number): Promise<{ provider: string; opts: TtsOptions; key: string }> {
    const c = await caps(actor);
    const tts = c.kinds.tts;
    const vid = voiceId ?? (typeof tts.options.voiceId === "string" ? tts.options.voiceId : undefined);
    const kindSpeed = typeof tts.options.speed === "number" ? tts.options.speed : 1;
    const ensure = (p: string) => {
      const info = tts.providers.find((x) => x.id === p);
      if (!info) throw new NotFoundError(tts.disabled.includes(p) ? `Trường đã tắt giọng ${p}` : `Không có engine giọng "${p}"`);
      if (info.clientOnly) throw new ValidationError(["Giọng trình duyệt đọc ngay trên máy người dùng, máy chủ không đọc được"]);
      return p;
    };
    if (!vid) {
      if (!tts.default) throw new ValidationError(["Máy chủ chưa có giọng đọc chạy được — dùng giọng trình duyệt"]);
      return { provider: tts.default, opts: { speed: fallbackSpeed ?? kindSpeed }, key: tts.default };
    }
    const v = parseVoiceId(vid);
    if (v.kind === "thu-vien") {
      const row = await voiceRow(actor, v.id);
      return { provider: ensure(row.provider), opts: { voice: { refFile: path.join(cfg.dataDir, row.file), refText: row.refText || undefined }, speed: fallbackSpeed ?? row.speed }, key: row.id };
    }
    return { provider: ensure(v.provider), opts: { voice: v.preset ? { preset: v.preset } : undefined, speed: fallbackSpeed ?? kindSpeed }, key: vid };
  }

  /** Đọc một đoạn → mp3 (cache theo engine + giọng + tốc độ + chữ). */
  async function speak(actor: Actor, body: unknown): Promise<{ mp3: Buffer; provider: string; cached: boolean; durationMs: number }> {
    assertStaff(actor);
    const b = SpeakInput.parse(body);
    const r = await resolveVoice(actor, b.voiceId, b.speed);
    const speed = r.opts.speed ?? 1;
    const key = speechCacheKey(r.provider, r.key, speed, b.text);
    const file = path.join(cacheDir, `${key}.mp3`);
    const hit = await readFile(file).catch(() => null);
    if (hit) return { mp3: hit, provider: r.provider, cached: true, durationMs: 0 };
    const t0 = Date.now();
    const work = await mkdtemp(path.join(tmpdir(), "eduvn-speak-"));
    try {
      const [res] = await registry.get("tts", r.provider).synthMany([{ text: b.text, name: "c" }], work, r.opts);
      await usage(actor, { kind: "tts", provider: r.provider, units: b.text.length, unit: "ky_tu", ok: !!res, ms: Date.now() - t0 });
      if (!res) throw new ValidationError([`Engine ${r.provider} chưa đọc được câu này (máy chủ bận hoặc lỗi giọng) — thử lại sau`]);
      const mp3 = await readFile(path.join(work, res.file));
      await mkdir(cacheDir, { recursive: true });
      await writeFile(`${file}.tmp`, mp3);
      await rename(`${file}.tmp`, file);
      return { mp3, provider: r.provider, cached: false, durationMs: res.durationMs };
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }

  async function transcribe(actor: Actor, body: unknown) {
    assertStaff(actor);
    const b = TranscribeInput.parse(body);
    const { p, c } = await pick(actor, "asr", b.provider);
    const t0 = Date.now();
    const language = b.language ?? (typeof c.options.language === "string" ? c.options.language : "vi");
    try {
      const res = await p.transcribe(b.audioBase64, { language });
      await usage(actor, { kind: "asr", provider: p.info.id, units: res.durationMs / 1000, unit: "giay", ok: true, ms: Date.now() - t0 });
      return { ...res, provider: p.info.id };
    } catch (e) {
      await usage(actor, { kind: "asr", provider: p.info.id, units: 0, unit: "giay", ok: false, ms: Date.now() - t0 });
      throw e;
    }
  }

  async function listVoices(actor: Actor): Promise<VoiceView[]> {
    assertStaff(actor);
    const c = await caps(actor);
    const lib = await db.select().from(voices).where(eq(voices.orgId, actor.orgId)).orderBy(asc(voices.createdAt));
    const out: VoiceView[] = lib.map((v) => ({ id: v.id, name: v.name, provider: v.provider, source: "thu-vien", gender: v.gender ?? undefined, tags: v.tags, speed: v.speed, durationMs: v.durationMs, refText: v.refText, ownerId: v.ownerId, mine: v.ownerId === actor.userId, createdAt: v.createdAt.toISOString() }));
    for (const info of c.kinds.tts.providers) {
      if (info.clientOnly) {
        out.push({ id: info.id, name: info.label, provider: info.id, source: "mac-dinh", tags: [], speed: 1, detail: "Giọng tiếng Việt của thiết bị" });
        continue;
      }
      const health = await registry.get("tts", info.id).check();
      out.push({ id: info.id, name: `${info.label} — giọng mặc định`, provider: info.id, source: "mac-dinh", tags: [], speed: 1, detail: health.detail });
      const presets: TtsPreset[] = await registry
        .get("tts", info.id)
        .presets()
        .catch(() => []);
      for (const p of presets) out.push({ id: `${info.id}:${p.id}`, name: p.label, provider: info.id, source: "co-san", gender: p.gender, tags: [p.region, p.style].filter((x): x is string => !!x), speed: 1 });
    }
    return out;
  }

  async function addVoice(actor: Actor, body: unknown): Promise<VoiceView> {
    assertStaff(actor);
    const b = VoiceInput.parse(body);
    const c = await caps(actor);
    if (!c.kinds.tts.providers.some((p) => p.id === b.provider)) throw new ValidationError([`Máy chủ chưa bật engine ${b.provider} để nhân giọng`]);
    if (b.provider === "omnivoice" && !b.refText) throw new ValidationError(["OmniVoice cần lời mẫu: gõ đúng câu đã nói trong file mẫu"]);
    const id = randomUUID();
    const dir = voicesDir(actor.orgId);
    await mkdir(dir, { recursive: true });
    const rel = path.join("voices", actor.orgId, `${id}.wav`);
    const dst = path.join(cfg.dataDir, rel);
    const work = await mkdtemp(path.join(tmpdir(), "eduvn-voice-"));
    try {
      const src = path.join(work, "in.audio");
      await writeFile(src, b.audioBase64);
      let durationMs: number;
      try {
        durationMs = await probeMs(src);
      } catch {
        throw new ValidationError(["Không đọc được file mẫu — gửi file âm thanh (wav, mp3, m4a, webm…)"]);
      }
      const issue = voiceSampleIssue(durationMs);
      if (issue) throw new ValidationError([issue]);
      // VieNeu nhận mẫu 3–8 giây: cắt 8 giây đầu. OmniVoice cần đủ đoạn khớp lời mẫu: giữ nguyên.
      const cut = b.provider === "vieneu" ? ["-t", "8"] : [];
      await run("ffmpeg", ["-y", "-loglevel", "error", "-i", src, ...cut, "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", dst], { timeout: 60_000 });
      const [v] = await db
        .insert(voices)
        .values({ id, orgId: actor.orgId, ownerId: actor.userId, name: b.name, provider: b.provider, file: rel, refText: b.refText, gender: b.gender, tags: b.tags, speed: b.speed, durationMs: await probeMs(dst) })
        .returning();
      return { id: v!.id, name: v!.name, provider: v!.provider, source: "thu-vien", gender: v!.gender ?? undefined, tags: v!.tags, speed: v!.speed, durationMs: v!.durationMs, refText: v!.refText, ownerId: v!.ownerId, mine: true, createdAt: v!.createdAt.toISOString() };
    } catch (e) {
      await rm(dst, { force: true });
      throw e;
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }

  async function removeVoice(actor: Actor, id: string): Promise<void> {
    assertStaff(actor);
    const v = await voiceRow(actor, id);
    if (v.ownerId !== actor.userId) assertCan(actor.role, "provider:manage");
    await db.delete(voices).where(eq(voices.id, v.id));
    await rm(path.join(cfg.dataDir, v.file), { force: true });
  }

  async function voiceSample(actor: Actor, id: string): Promise<Buffer> {
    assertStaff(actor);
    const v = await voiceRow(actor, id);
    return readFile(path.join(cfg.dataDir, v.file)).catch(() => {
      throw new NotFoundError("File mẫu của giọng này đã mất");
    });
  }

  async function saveConfig(actor: Actor, body: unknown) {
    assertCan(actor.role, "provider:manage");
    const b = ConfigInput.parse(body);
    if (b.providerId === "*") {
      if (b.kind === "tts") TtsKindOptions.parse(b.options ?? {});
      if (b.kind === "asr") AsrKindOptions.parse(b.options ?? {});
    } else if (!registry.has(b.kind, b.providerId)) throw new ValidationError([`Không có nhà cung cấp ${KIND_LABELS[b.kind].toLowerCase()} "${b.providerId}"`]);
    if (b.isDefault && registry.get(b.kind, b.providerId === "*" ? undefined : b.providerId).info.clientOnly) throw new ValidationError(["Bản chạy trên trình duyệt không đặt làm mặc định của máy chủ được"]);
    if (b.isDefault && b.enabled === false) throw new ValidationError(["Không đặt mặc định cho nhà cung cấp đang tắt"]);
    await db.transaction(async (tx) => {
      if (b.isDefault) await tx.update(providerConfigs).set({ isDefault: false }).where(and(eq(providerConfigs.orgId, actor.orgId), eq(providerConfigs.kind, b.kind)));
      const set = { ...(b.enabled !== undefined && { enabled: b.enabled }), ...(b.isDefault !== undefined && { isDefault: b.isDefault }), ...(b.options !== undefined && { options: b.options }), updatedBy: actor.userId, updatedAt: new Date() };
      await tx
        .insert(providerConfigs)
        .values({ orgId: actor.orgId, kind: b.kind, providerId: b.providerId, enabled: b.enabled ?? true, isDefault: b.isDefault ?? false, options: b.options ?? {}, updatedBy: actor.userId })
        .onConflictDoUpdate({ target: [providerConfigs.orgId, providerConfigs.kind, providerConfigs.providerId], set });
    });
    return caps(actor);
  }

  async function check(actor: Actor, body: unknown) {
    assertStaff(actor);
    const b = z.object({ kind: Kind, id: z.string().min(1).optional() }).parse(body);
    const ids = b.id ? [b.id] : registry.list(b.kind).map((p) => p.id);
    if (b.id && !registry.has(b.kind, b.id)) throw new NotFoundError(`Không có nhà cung cấp ${KIND_LABELS[b.kind].toLowerCase()} "${b.id}"`);
    return Promise.all(
      ids.map(async (id) => {
        const t0 = Date.now();
        const h = await registry
          .get(b.kind, id)
          .check()
          .catch((e: unknown) => ({ ok: false, detail: (e as Error).message }));
        return { kind: b.kind, id, ...h, ms: Date.now() - t0 };
      }),
    );
  }

  /** Thử thật một nhà cung cấp (nút "Thử" ở trang cài đặt). tts trả mp3 base64; asr/ocr/parse trả chữ. */
  async function tryProvider(actor: Actor, body: unknown) {
    assertStaff(actor);
    const b = TryInput.parse(body);
    const t0 = Date.now();
    if (b.kind === "tts") {
      const voiceId = b.voiceId ?? (b.id ? b.id : undefined);
      const r = await speak(actor, { text: b.text, voiceId, speed: b.speed });
      return { kind: b.kind, provider: r.provider, ms: Date.now() - t0, audio: `data:audio/mpeg;base64,${r.mp3.toString("base64")}`, cached: r.cached };
    }
    if (b.kind === "asr") {
      const r = await transcribe(actor, { audioBase64: b.audioBase64.toString("base64"), language: b.language, provider: b.id });
      return { kind: b.kind, provider: r.provider, ms: Date.now() - t0, text: r.text, durationMs: r.durationMs, segments: r.segments };
    }
    if (b.kind === "ocr") {
      const { p } = await pick(actor, "ocr", b.id);
      const r = await p.ocr({ image: b.imageBase64, mime: b.mime });
      await usage(actor, { kind: "ocr", provider: p.info.id, units: 1, unit: "anh", ok: true, ms: Date.now() - t0 });
      return { kind: b.kind, provider: p.info.id, ms: Date.now() - t0, text: r.text };
    }
    const c = await caps(actor);
    const parsers = b.id ? c.kinds.parse.providers.filter((p) => p.id === b.id) : c.kinds.parse.providers;
    if (b.id && !parsers.length) throw new NotFoundError(`Không có bộ đọc tài liệu "${b.id}"`);
    const scoped = new ProviderRegistry();
    for (const info of parsers) scoped.register(registry.get("parse", info.id));
    const r = await parseDocument(scoped, b.name, b.contentBase64);
    await usage(actor, { kind: "parse", provider: r.engine, units: r.pages.length, unit: "trang", ok: true, ms: Date.now() - t0, meta: { format: r.format } });
    const text = r.pages.join("\n\n");
    return { kind: b.kind, provider: r.engine, ms: Date.now() - t0, format: r.format, pages: r.pages.length, chars: text.length, preview: text.slice(0, 4000), warnings: r.warnings };
  }

  async function config(actor: Actor) {
    assertStaff(actor);
    const list = await rows(actor.orgId);
    return { rows: list.map((r) => ({ kind: r.kind, providerId: r.providerId, enabled: r.enabled, isDefault: r.isDefault, options: r.options, updatedAt: r.updatedAt.toISOString() })), canManage: actor.role === "owner" || actor.role === "admin" };
  }

  return { capabilities: async (actor: Actor) => caps(actor), config, saveConfig, check, tryProvider, speak, transcribe, listVoices, addVoice, removeVoice, voiceSample, registry };
}
