// Gói bài giảng .eduvn.zip (OM-804/805): manifest.json (cảnh + lời giảng) + audio/ + anim/ + bai-giang.html (trình phát
// ngoại tuyến đọc tệp bên cạnh — mở thẳng hoặc đặt trên máy chủ mạng nội bộ trường). Nhập lại được; nhập cả .maic.zip của OpenMAIC.
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import JSZip from "jszip";
import { z } from "zod";
import type { StoredScene } from "../services/aiLessons/types";
import { renderOfflineHtml } from "./offlineHtml";

const exec = promisify(execFile);
export const BUNDLE_FORMAT = "eduvn-lesson";
export const BUNDLE_VERSION = 1;
const MAX_UNZIPPED = 600 * 1024 * 1024;
const MAX_ENTRIES = 4000;
const MAX_SCENES = 60;

export type LessonMeta = { title: string; subject?: string; grade?: number | null };

/** Xuất gói .eduvn.zip. */
export async function renderLessonBundle(meta: LessonMeta, scenes: StoredScene[], o: { audioDir: string; animDir?: string; outline?: unknown[] | null; onlineUrl?: string; pptx?: Buffer }): Promise<Buffer> {
  const zip = new JSZip();
  const audio = new Set<string>();
  const anim = new Set<string>();
  for (const sc of scenes) {
    for (const a of sc.actions ?? []) if (a.type === "speech" && a.audioFile && /^[\w-]+\.mp3$/.test(path.basename(a.audioFile))) audio.add(path.basename(a.audioFile));
    if (sc.animation?.status === "xong" && sc.animation.hash && /^[a-f0-9]{8,64}$/.test(sc.animation.hash)) anim.add(sc.animation.hash);
  }
  for (const f of audio) {
    const b = await readFile(path.join(o.audioDir, f)).catch(() => null);
    if (b) zip.file(`audio/${f}`, b);
  }
  if (o.animDir)
    for (const h of anim) {
      const b = await readFile(path.join(o.animDir, `${h}.mp4`)).catch(() => null);
      if (b) zip.file(`anim/${h}.mp4`, b);
    }
  zip.file(
    "manifest.json",
    JSON.stringify({ format: BUNDLE_FORMAT, formatVersion: BUNDLE_VERSION, app: "EDUVN", exportedAt: new Date().toISOString(), lesson: { title: meta.title, subject: meta.subject ?? "", grade: meta.grade ?? null }, outline: o.outline ?? null, scenes }, null, 1),
  );
  zip.file("bai-giang.html", await renderOfflineHtml(meta, scenes, { mode: "kem-loi-giang", audioDir: o.audioDir, animDir: o.animDir, onlineUrl: o.onlineUrl, media: "files" }));
  if (o.pptx) zip.file("bai-giang.pptx", o.pptx);
  zip.file("DOC-TRUOC.txt", `Gói bài giảng EDUVN — "${meta.title}"\n\n- Mở bai-giang.html bằng trình duyệt để trình chiếu không cần mạng (giữ nguyên thư mục audio/ và anim/ bên cạnh).\n- Có thể chép cả thư mục lên máy chủ mạng nội bộ của trường.\n- Nhập lại vào EDUVN: Bài giảng AI → Nhập → chọn tệp .zip này.\n`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 }, streamFiles: true });
}

const SceneLike = z.looseObject({ id: z.string().optional(), type: z.enum(["slide", "quiz", "interactive", "pbl"]), title: z.string().max(300), order: z.number().optional(), content: z.looseObject({}), actions: z.array(z.looseObject({ type: z.string() })).optional() });

export type ImportedBundle = { meta: LessonMeta; scenes: StoredScene[]; outline: unknown[] | null; audio: Map<string, Buffer>; anim: Map<string, Buffer>; source: "eduvn" | "maic"; warnings: string[] };

function checkZip(zip: JSZip): void {
  const files = Object.values(zip.files);
  if (files.length > MAX_ENTRIES) throw new Error("Gói có quá nhiều tệp");
  let total = 0;
  for (const f of files) {
    total += (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    if (f.name.includes("..") || f.name.startsWith("/")) throw new Error("Gói chứa đường dẫn không hợp lệ");
  }
  if (total > MAX_UNZIPPED) throw new Error("Gói giải nén quá lớn (tối đa 600 MB)");
}

const rid = () => Math.random().toString(36).slice(2, 10);

async function toMp3(buf: Buffer, ext: string, ffmpeg: string): Promise<Buffer | null> {
  if (ext === "mp3") return buf;
  const dir = await mkdtemp(path.join(tmpdir(), "eduvn-maic-"));
  try {
    const src = path.join(dir, `in.${ext.replace(/[^a-z0-9]/g, "") || "bin"}`);
    await writeFile(src, buf);
    await exec(ffmpeg, ["-loglevel", "error", "-y", "-i", src, "-c:a", "libmp3lame", "-q:a", "4", path.join(dir, "out.mp3")], { timeout: 60_000 });
    return await readFile(path.join(dir, "out.mp3"));
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Đọc gói .eduvn.zip hoặc .maic.zip (OpenMAIC). Tên tệp âm thanh được đặt lại an toàn. */
export async function readLessonBundle(buf: Buffer, o: { ffmpeg?: string } = {}): Promise<ImportedBundle> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new Error("Tệp không phải gói .zip hợp lệ");
  }
  checkZip(zip);
  const mf = zip.file("manifest.json");
  if (!mf) throw new Error("Gói thiếu manifest.json");
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(await mf.async("string")) as Record<string, unknown>;
  } catch {
    throw new Error("manifest.json hỏng");
  }
  const warnings: string[] = [];
  const audio = new Map<string, Buffer>();
  const anim = new Map<string, Buffer>();
  if (manifest.format === BUNDLE_FORMAT) {
    const lesson = z.object({ title: z.string().min(1).max(300), subject: z.string().max(60).optional(), grade: z.number().int().min(1).max(16).nullable().optional() }).parse(manifest.lesson);
    const scenes = z.array(SceneLike).max(MAX_SCENES).parse(manifest.scenes) as unknown as StoredScene[];
    const names = new Map<string, string>();
    for (const sc of scenes) {
      sc.id ||= `sc_${rid()}`;
      for (const a of sc.actions ?? []) {
        if (a.type !== "speech" || !a.audioFile) continue;
        const base = path.basename(a.audioFile);
        const f = zip.file(`audio/${base}`);
        if (!f || !/^[\w-]+\.mp3$/.test(base)) {
          delete a.audioFile;
          continue;
        }
        const safe = names.get(base) ?? `nhap_${rid()}.mp3`;
        names.set(base, safe);
        audio.set(safe, await f.async("nodebuffer"));
        a.audioFile = safe;
      }
      if (sc.animation?.hash) {
        const f = /^[a-f0-9]{8,64}$/.test(sc.animation.hash) ? zip.file(`anim/${sc.animation.hash}.mp4`) : null;
        if (f) anim.set(sc.animation.hash, await f.async("nodebuffer"));
        else delete sc.animation;
      }
    }
    return { meta: { title: lesson.title, subject: lesson.subject, grade: lesson.grade ?? null }, scenes: scenes.map((s, i) => ({ ...s, order: i + 1 })), outline: Array.isArray(manifest.outline) ? (manifest.outline as unknown[]) : null, audio, anim, source: "eduvn", warnings };
  }
  // OpenMAIC .maic.zip (formatVersion 1): stage + scenes + mediaIndex; âm thanh qua audioRef (đường dẫn trong zip)
  if (typeof manifest.formatVersion === "number" && Array.isArray(manifest.scenes) && manifest.stage) {
    const stage = manifest.stage as { name?: string };
    const raw = z.array(SceneLike).max(MAX_SCENES).parse(manifest.scenes);
    const scenes: StoredScene[] = [];
    for (const [i, s] of raw.entries()) {
      if (s.type === "pbl") {
        warnings.push(`Bỏ cảnh dự án (PBL) "${s.title}" — EDUVN chưa phát loại cảnh này`);
        continue;
      }
      const actions = [] as NonNullable<StoredScene["actions"]>;
      for (const a of (s.actions ?? []) as Record<string, unknown>[]) {
        if (a.type === "discussion") continue;
        const { audioRef, agentIndex: _ag, audioId: _id, audioUrl: _u, ...rest } = a;
        const act = { id: typeof rest.id === "string" ? rest.id : `act_${rid()}`, ...rest } as Record<string, unknown>;
        if (a.type === "speech" && typeof audioRef === "string") {
          const f = zip.file(audioRef);
          const ext = path.extname(audioRef).slice(1).toLowerCase();
          const b = f ? await toMp3(await f.async("nodebuffer"), ext, o.ffmpeg ?? "ffmpeg") : null;
          if (b) {
            const safe = `maic_${rid()}.mp3`;
            audio.set(safe, b);
            act.audioFile = safe;
            const dur = (manifest.mediaIndex as Record<string, { duration?: number }> | undefined)?.[audioRef]?.duration;
            if (typeof dur === "number") act.durationMs = Math.round(dur > 1000 ? dur : dur * 1000);
          }
        }
        actions.push(act as never);
      }
      const content = s.content as Record<string, unknown>;
      // ảnh trong slide trỏ tới tệp trong zip → data: URL
      if (s.type === "slide") {
        const canvas = (content.canvas ?? {}) as { elements?: Record<string, unknown>[] };
        for (const e of canvas.elements ?? []) {
          const src = typeof e.src === "string" ? e.src : "";
          if (src && !/^(data:|https?:)/.test(src)) {
            const f = zip.file(src.replace(/^\.?\//, ""));
            if (f) {
              const ext = path.extname(src).slice(1).toLowerCase();
              const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
              e.src = `data:${mime};base64,${(await f.async("nodebuffer")).toString("base64")}`;
            }
          }
        }
      }
      scenes.push({ id: `sc_${rid()}`, type: s.type, title: s.title, order: i + 1, content, actions } as unknown as StoredScene);
    }
    return { meta: { title: (stage.name ?? "Bài giảng nhập từ OpenMAIC").slice(0, 200) }, scenes, outline: null, audio, anim, source: "maic", warnings };
  }
  throw new Error("Không nhận ra định dạng gói (cần .eduvn.zip hoặc .maic.zip)");
}

export const exists = (p: string) => stat(p).then(() => true, () => false);
