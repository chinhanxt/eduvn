// Gói "Xuất bản & Nhập" (P14/GX): kho mẫu .pptx của tổ chức, việc xuất (PowerPoint gốc, HTML ngoại tuyến, gói .zip,
// gói tài nguyên, kịch bản, video MP4 có tuỳ chọn) chạy nền có tiến độ/huỷ, và nhập .pptx / .eduvn.zip / .maic.zip thành bài giảng AI.
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateSceneActions } from "@openmaic/generation";
import { and, desc, eq } from "drizzle-orm";
import JSZip from "jszip";
import { z } from "zod";
import type { Db } from "../../db/client";
import { aiLessons, decks, lessonPlans, pptxTemplates } from "../../db/schema";
import { type Role, assertCan } from "../../domain/authz";
import { latexToPlain } from "../../domain/mathText";
import { type SlideDeck, slidesFromLessonPlan } from "../../domain/slides";
import { NotFoundError, ValidationError } from "../../errors";
import { renderLessonVideo } from "../../export/aiLessonVideo";
import { readLessonBundle, renderLessonBundle } from "../../export/lessonBundle";
import { renderScriptDocx, renderScriptMd } from "../../export/lessonScript";
import { inlineInteractive, renderOfflineHtml } from "../../export/offlineHtml";
import type { Ai } from "../ai";
import { VI_DIRECTIVE, audioDirOf, fillMissingAudio } from "../aiLessons/generate";
import type { Tts } from "../aiLessons/tts";
import type { StoredScene } from "../aiLessons/types";
import { buildPptx, canvasFor, styleFromTheme } from "./build";
import { type Box, type BuildCtx, aiLessonPages, deckPages } from "./pages";
import { type TemplateInfo, analyzeTemplate, importPptxFile } from "./sidecar";
import { PAPER_STYLE } from "./svg";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();
const EMU = 9525;

export type XuatBanCfg = { dataDir: string; tts?: Tts; chromePath?: string; webUrl?: string; taskOverrides?: Record<string, string>; ffmpeg?: string };

export const Source = z.object({ loai: z.enum(["bai-giang-ai", "bo-slide", "giao-an"]), id: z.uuid() });
export const ExportInput = z.object({
  nguon: Source,
  dinhDang: z.enum(["pptx", "html", "zip", "goi-tai-nguyen", "kich-ban-md", "kich-ban-docx", "video"]),
  tuyChon: z
    .object({
      mauId: z.uuid().optional(),
      giongDoc: z.boolean().optional(),
      hieuUng: z.boolean().optional(),
      chuyenTrang: z.enum(["fade", "push", "wipe", "morph", "none"]).optional(),
      maQr: z.boolean().optional(),
      /** OM-801: true = "Chỉ slide" (bỏ cảnh câu hỏi/tương tác); false = kèm slide giữ chỗ có QR. */
      chiSlide: z.boolean().optional(),
      /** OM-808: HTML kèm lời giảng + clip hay chỉ phụ đề. */
      loiGiang: z.enum(["kem", "khong"]).optional(),
      /** OM-810 */
      doPhanGiai: z.enum(["720p", "1080p", "4k"]).optional(),
      fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).optional(),
      chatLuong: z.enum(["nhap", "chuan", "cao"]).optional(),
      phuDeCung: z.boolean().optional(),
    })
    .default({}),
});
export type ExportInput = z.infer<typeof ExportInput>;

export type Job = {
  id: string;
  orgId: string;
  userId: string;
  kind: ExportInput["dinhDang"];
  status: "cho" | "dang-chay" | "xong" | "loi" | "da-huy";
  stage: string;
  done: number;
  total: number;
  startedAt: number;
  etaSec?: number;
  error?: string;
  warnings: string[];
  file?: string;
  fileName?: string;
  mime?: string;
  size?: number;
  abort: AbortController;
};

const MIME: Record<string, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  html: "text/html; charset=utf-8",
  zip: "application/zip",
  md: "text/markdown; charset=utf-8",
  mp4: "video/mp4",
};
export const slugify = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || "bai-giang";

/** Vùng tiêu đề + nội dung của layout "Title and Content" (hoặc gần nhất) của mẫu, đổi sang px. */
export function areaFromTemplate(info: TemplateInfo): { title: Box; body: Box } | undefined {
  const toBox = (b: [number, number, number, number]): Box => ({ x: b[0] / EMU, y: b[1] / EMU, w: b[2] / EMU, h: b[3] / EMU });
  const lay = info.layouts.find((l) => l.type === "obj") ?? info.layouts.find((l) => l.placeholders.some((p) => p.type === "title") && l.placeholders.some((p) => p.type === "body"));
  const t = lay?.placeholders.find((p) => p.type === "title" && p.box)?.box;
  const b = lay?.placeholders.find((p) => (p.type === "body" || p.type === "obj") && p.idx !== "0" && p.box)?.box;
  if (!t || !b) return undefined;
  return { title: toBox(t), body: toBox(b) };
}

export function createXuatBanService(db: Db, ai: Ai | undefined, cfg: XuatBanCfg) {
  const jobs = new Map<string, Job>();
  const outDir = path.join(cfg.dataDir, "xuat-ban");
  const tplDir = path.join(cfg.dataDir, "pptx-templates");
  const animDir = path.join(cfg.dataDir, "anim");
  const lessonUrl = (id: string) => `${(cfg.webUrl ?? "").replace(/\/$/, "") || "https://eduvn.vn"}/bai-giang-ai/${id}`;
  const queue: (() => Promise<void>)[] = [];
  let running = 0;

  // ---------------------------------------------------------------- kho mẫu

  async function listTemplates(actor: Actor) {
    assertCan(actor.role, "slide:read");
    const rows = await db.select().from(pptxTemplates).where(eq(pptxTemplates.orgId, actor.orgId)).orderBy(desc(pptxTemplates.createdAt));
    return rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, fileName: r.fileName, size: r.size, createdAt: r.createdAt.toISOString(), mine: r.ownerId === actor.userId, info: summarizeInfo(r.info as unknown as TemplateInfo) }));
  }

  const summarizeInfo = (i: TemplateInfo) => ({ width: i.width, height: i.height, colors: i.theme?.colors ?? {}, fonts: i.theme?.fonts ?? {}, layouts: (i.layouts ?? []).map((l) => l.name || l.type), background: i.background, hasPicture: i.hasPicture });

  async function addTemplate(actor: Actor, b: { name: string; kind: "mau" | "phong_cach"; fileName: string; data: Buffer }) {
    assertCan(actor.role, "slide:manage");
    if (b.data.length > 25 * 1024 * 1024) throw new ValidationError(["Tệp mẫu quá lớn (tối đa 25 MB)"]);
    if (b.data.subarray(0, 2).toString("latin1") !== "PK") throw new ValidationError(["Tệp mẫu phải là .pptx (hoặc .potx)"]);
    await mkdir(tplDir, { recursive: true });
    const id = randomUUID();
    const file = path.join(tplDir, `${id}.pptx`);
    await writeFile(file, b.data);
    let info: TemplateInfo;
    try {
      info = await analyzeTemplate(file);
    } catch (e) {
      await rm(file, { force: true });
      throw new ValidationError([`Không đọc được tệp mẫu: ${(e as Error).message}`]);
    }
    const sha256 = createHash("sha256").update(b.data).digest("hex");
    await db.insert(pptxTemplates).values({ id, orgId: actor.orgId, ownerId: actor.userId, name: b.name.slice(0, 120), kind: b.kind, fileName: b.fileName.slice(0, 200), size: b.data.length, sha256, info: info as unknown as Record<string, unknown> });
    return { id, name: b.name, kind: b.kind, info: summarizeInfo(info) };
  }

  async function loadTemplate(actor: Actor, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy mẫu");
    const [r] = await db.select().from(pptxTemplates).where(and(eq(pptxTemplates.id, id), eq(pptxTemplates.orgId, actor.orgId)));
    if (!r) throw new NotFoundError("Không tìm thấy mẫu");
    return { row: r, file: path.join(tplDir, `${r.id}.pptx`), info: r.info as unknown as TemplateInfo };
  }

  async function removeTemplate(actor: Actor, id: string) {
    const t = await loadTemplate(actor, id);
    if (t.row.ownerId !== actor.userId && actor.role !== "owner" && actor.role !== "admin") throw new ValidationError(["Chỉ người tải lên hoặc quản trị mới xoá được mẫu"]);
    await db.delete(pptxTemplates).where(eq(pptxTemplates.id, id));
    await rm(t.file, { force: true });
  }

  async function templateFile(actor: Actor, id: string) {
    assertCan(actor.role, "slide:read");
    const t = await loadTemplate(actor, id);
    return { file: t.file, fileName: t.row.fileName };
  }

  // ---------------------------------------------------------------- nguồn

  async function loadLesson(actor: Actor, id: string) {
    assertCan(actor.role, "ailesson:read");
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài giảng");
    const [r] = await db.select().from(aiLessons).where(and(eq(aiLessons.id, id), eq(aiLessons.orgId, actor.orgId)));
    if (!r) throw new NotFoundError("Không tìm thấy bài giảng");
    return r;
  }

  async function loadDeck(actor: Actor, src: z.infer<typeof Source>): Promise<SlideDeck> {
    if (src.loai === "bo-slide") {
      assertCan(actor.role, "slide:read");
      const [r] = await db.select().from(decks).where(and(eq(decks.id, src.id), eq(decks.orgId, actor.orgId)));
      if (!r) throw new NotFoundError("Không tìm thấy bộ slide");
      return r.body;
    }
    assertCan(actor.role, "lesson:read");
    const [lp] = await db.select().from(lessonPlans).where(and(eq(lessonPlans.id, src.id), eq(lessonPlans.orgId, actor.orgId)));
    if (!lp) throw new NotFoundError("Không tìm thấy giáo án");
    return slidesFromLessonPlan(lp.body);
  }

  // ---------------------------------------------------------------- việc xuất

  function pump(): void {
    while (running < 1 && queue.length > 0) {
      const fn = queue.shift() as () => Promise<void>;
      running++;
      void fn().finally(() => {
        running--;
        pump();
      });
    }
  }

  async function sweep(): Promise<void> {
    const now = Date.now();
    for (const [id, j] of jobs) {
      if (j.status !== "dang-chay" && j.status !== "cho" && now - j.startedAt > 2 * 3600_000) {
        jobs.delete(id);
        if (j.file) await rm(j.file, { force: true });
      }
    }
  }

  async function startExport(actor: Actor, input: unknown): Promise<PublicJob> {
    const b = ExportInput.parse(input);
    const o = b.tuyChon;
    const lessonFormats = ["html", "zip", "goi-tai-nguyen", "kich-ban-md", "kich-ban-docx", "video"];
    if (lessonFormats.includes(b.dinhDang) && b.nguon.loai !== "bai-giang-ai") throw new ValidationError(["Định dạng này chỉ dành cho bài giảng AI"]);
    // kiểm quyền + tồn tại ngay (lỗi trả về liền, không đợi việc nền)
    let title = "";
    let lessonRow: Awaited<ReturnType<typeof loadLesson>> | null = null;
    let deck: SlideDeck | null = null;
    if (b.nguon.loai === "bai-giang-ai") {
      lessonRow = await loadLesson(actor, b.nguon.id);
      if (lessonRow.status === "running" || lessonRow.status === "queued") throw new ValidationError(["Bài giảng đang được soạn — đợi xong rồi hãy xuất"]);
      if ((lessonRow.scenes as unknown[]).length === 0) throw new ValidationError(["Bài giảng chưa có cảnh nào"]);
      title = lessonRow.title;
    } else {
      deck = await loadDeck(actor, b.nguon);
      title = deck.title;
    }
    const tpl = o.mauId ? await loadTemplate(actor, o.mauId) : null;
    if (b.dinhDang === "video" && [...jobs.values()].some((j) => j.kind === "video" && (j.status === "dang-chay" || j.status === "cho"))) throw new ValidationError(["Máy đang dựng một video khác — thử lại sau ít phút (bấm “Kiểm lại”)"]);
    await sweep();
    const job: Job = { id: randomUUID(), orgId: actor.orgId, userId: actor.userId, kind: b.dinhDang, status: "cho", stage: "Đang chờ", done: 0, total: 1, startedAt: Date.now(), warnings: [], abort: new AbortController() };
    jobs.set(job.id, job);
    const slug = slugify(title);
    queue.push(async () => {
      if (job.status === "da-huy") return;
      job.status = "dang-chay";
      job.startedAt = Date.now();
      try {
        await mkdir(outDir, { recursive: true });
        const set = async (buf: Buffer, ext: string, name: string) => {
          const file = path.join(outDir, `${job.id}.${ext}`);
          await writeFile(file, buf);
          Object.assign(job, { file, fileName: name, mime: MIME[ext] ?? "application/octet-stream", size: buf.length });
        };
        const scenes = (lessonRow?.scenes ?? []) as StoredScene[];
        const meta = { title, subject: lessonRow?.subject || deck?.subject, grade: lessonRow?.grade ?? deck?.grade ?? null };
        const audioDir = lessonRow ? audioDirOf(cfg.dataDir, lessonRow.id) : undefined;
        if (b.dinhDang === "pptx" || b.dinhDang === "goi-tai-nguyen") {
          job.stage = "Đang dựng PowerPoint gốc";
          const pptx = await makePptx({ lesson: lessonRow, deck, scenes, meta, tpl, o, audioDir });
          if (b.dinhDang === "pptx") await set(pptx, "pptx", `${slug}.pptx`);
          else {
            job.stage = "Đang gói tài nguyên";
            const zip = new JSZip();
            zip.file(`${slug}.pptx`, pptx);
            let k = 0;
            for (const sc of scenes) {
              if (sc.type !== "interactive") continue;
              k++;
              const html = await inlineInteractive(String((sc.content as { html?: string }).html ?? ""));
              zip.file(`tuong-tac/${String(k).padStart(2, "0")}-${slugify(sc.title)}.html`, html);
            }
            zip.file("DOC-TRUOC.txt", `Gói tài nguyên "${title}": ${slug}.pptx + ${k} cảnh tương tác (thư mục tuong-tac/, mở bằng trình duyệt, chạy không cần mạng).\nBản trực tuyến: ${lessonRow ? lessonUrl(lessonRow.id) : ""}\n`);
            await set(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), "zip", `${slug}-goi-tai-nguyen.zip`);
          }
        } else if (b.dinhDang === "html") {
          job.stage = "Đang dựng HTML ngoại tuyến";
          const html = await renderOfflineHtml(meta, scenes, { mode: o.loiGiang === "khong" ? "khong-loi-giang" : "kem-loi-giang", audioDir, animDir, onlineUrl: lessonRow ? lessonUrl(lessonRow.id) : undefined, maxBytes: 400 * 1024 * 1024 });
          const buf = Buffer.from(html, "utf8");
          if (buf.length > 100 * 1024 * 1024) job.warnings.push(`Tệp HTML khá nặng (${Math.round(buf.length / 1e6)} MB) — máy yếu có thể mở chậm; cân nhắc "Gói bài giảng .zip"`);
          await set(buf, "html", `${slug}.html`);
        } else if (b.dinhDang === "zip") {
          job.stage = "Đang đóng gói bài giảng";
          const buf = await renderLessonBundle(meta, scenes, { audioDir: audioDir as string, animDir, outline: (lessonRow?.outline as unknown[] | null) ?? null, onlineUrl: lessonRow ? lessonUrl(lessonRow.id) : undefined });
          await set(buf, "zip", `${slug}.eduvn.zip`);
        } else if (b.dinhDang === "kich-ban-md") {
          await set(Buffer.from(renderScriptMd(meta, scenes), "utf8"), "md", `${slug}-kich-ban.md`);
        } else if (b.dinhDang === "kich-ban-docx") {
          await set(await renderScriptDocx(meta, scenes), "docx", `${slug}-kich-ban.docx`);
        } else if (b.dinhDang === "video") {
          job.stage = "Đang dựng video";
          const vdir = path.join(outDir, `${job.id}-video`);
          const r = await renderLessonVideo(title, scenes, audioDir as string, {
            chromePath: cfg.chromePath ?? "/usr/bin/google-chrome",
            outDir: vdir,
            animDir,
            height: o.doPhanGiai === "4k" ? 2160 : o.doPhanGiai === "1080p" ? 1080 : 720,
            fps: o.fps ?? 30,
            quality: o.chatLuong ?? "chuan",
            burnSubtitles: o.phuDeCung !== false,
            qrUrl: o.maQr === false || !lessonRow ? undefined : lessonUrl(lessonRow.id),
            signal: job.abort.signal,
            onProgress: (d, t) => {
              job.done = d;
              job.total = t;
              const el = (Date.now() - job.startedAt) / 1000;
              job.etaSec = d > 0 ? Math.round((el / d) * Math.max(0, t - d)) : undefined;
            },
          });
          const st = await stat(r.video);
          Object.assign(job, { file: r.video, fileName: `${slug}.mp4`, mime: MIME.mp4, size: st.size });
          job.warnings.push(...r.diagnostics.slice(0, 5));
          // phụ đề .srt tải riêng: GET …/tep?phu-de=1
          (job as Job & { srt?: string }).srt = r.srt;
        }
        job.done = job.total;
        job.status = "xong";
        job.stage = "Xong";
        job.etaSec = 0;
      } catch (e) {
        if (job.abort.signal.aborted) {
          job.status = "da-huy";
          job.stage = "Đã huỷ";
        } else {
          job.status = "loi";
          job.stage = "Lỗi";
          job.error = (e as Error).message.slice(0, 800);
        }
      }
    });
    pump();
    return pub(job);
  }

  async function makePptx(a: { lesson: Awaited<ReturnType<typeof loadLesson>> | null; deck: SlideDeck | null; scenes: StoredScene[]; meta: { title: string; subject?: string; grade?: number | null }; tpl: Awaited<ReturnType<typeof loadTemplate>> | null; o: ExportInput["tuyChon"]; audioDir?: string }): Promise<Buffer> {
    const { o, tpl } = a;
    const isMau = tpl?.row.kind === "mau";
    const style = tpl ? styleFromTheme(tpl.info, isMau) : PAPER_STYLE;
    const canvas = isMau ? canvasFor(tpl?.info) : { W: 1280, H: 720 };
    const images = new Map<string, string>();
    const ctx: BuildCtx = { canvas, style, images, template: isMau, area: isMau && tpl ? areaFromTemplate(tpl.info) : undefined, qrUrl: o.maQr === false || !a.lesson ? undefined : lessonUrl(a.lesson.id) };
    let pages;
    if (a.lesson) {
      const scenes = o.chiSlide ? a.scenes.filter((s) => s.type === "slide") : a.scenes;
      pages = aiLessonPages(a.meta, scenes, ctx);
    } else pages = deckPages(a.deck as SlideDeck, { ...ctx, eyebrow: [a.deck?.subject, a.deck?.grade ? `Lớp ${a.deck.grade}` : ""].filter(Boolean).join(" · ") || "Bài giảng" });
    const hasAudio = !!a.lesson && a.scenes.some((s) => (s.actions ?? []).some((x) => x.type === "speech" && x.audioFile));
    const r = await buildPptx(pages, {
      audioDir: a.audioDir,
      narration: o.giongDoc ?? hasAudio,
      animations: o.hieuUng ?? true,
      transition: o.chuyenTrang ?? "fade",
      template: isMau && tpl ? { file: tpl.file, info: tpl.info } : null,
      images,
      ffmpeg: cfg.ffmpeg,
    });
    return r.buffer;
  }

  type PublicJob = Omit<Job, "abort" | "file" | "orgId" | "userId">;
  const pub = (j: Job): PublicJob => {
    const { abort: _a, file: _f, orgId: _o, userId: _u, ...rest } = j;
    return { ...rest, ...((j as { srt?: string }).srt ? { coPhuDe: true } : {}) } as PublicJob;
  };

  function own(actor: Actor, id: string): Job {
    const j = jobs.get(id);
    if (!j || j.orgId !== actor.orgId || j.userId !== actor.userId) throw new NotFoundError("Không tìm thấy việc xuất");
    return j;
  }

  const jobStatus = (actor: Actor, id: string) => pub(own(actor, id));

  function cancel(actor: Actor, id: string) {
    const j = own(actor, id);
    if (j.status === "cho" || j.status === "dang-chay") {
      j.abort.abort();
      if (j.status === "cho") {
        j.status = "da-huy";
        j.stage = "Đã huỷ";
      }
    }
    return pub(j);
  }

  async function jobFile(actor: Actor, id: string, srt = false) {
    const j = own(actor, id);
    if (j.status !== "xong" || !j.file) throw new ValidationError(["Tệp chưa sẵn sàng"]);
    if (srt) {
      const f = (j as Job & { srt?: string }).srt;
      if (!f) throw new NotFoundError("Không có phụ đề");
      return { file: f, fileName: (j.fileName ?? "bai-giang.mp4").replace(/\.mp4$/, ".srt"), mime: "application/x-subrip; charset=utf-8" };
    }
    return { file: j.file, fileName: j.fileName as string, mime: j.mime as string };
  }

  // ---------------------------------------------------------------- nhập

  const ImportOpts = z.object({ loiGiang: z.enum(["ghi-chu", "ai", "khong"]).default("ghi-chu"), giongDoc: z.boolean().default(false), tieuDe: z.string().trim().max(200).optional(), mon: z.string().trim().max(60).optional(), lop: z.number().int().min(1).max(16).optional() });

  /** Nhập .pptx (giữ bố cục) hoặc gói .eduvn.zip/.maic.zip → bài giảng AI mới. */
  async function importFile(actor: Actor, fileName: string, data: Buffer, opts: unknown): Promise<{ id: string; title: string; scenes: number; warnings: string[]; status: string }> {
    assertCan(actor.role, "ailesson:manage");
    const o = ImportOpts.parse(opts ?? {});
    if (data.subarray(0, 2).toString("latin1") !== "PK") throw new ValidationError(["Tệp phải là .pptx hoặc .zip"]);
    const lower = fileName.toLowerCase();
    const isPptx = lower.endsWith(".pptx") || lower.endsWith(".ppsx") || lower.endsWith(".potx") || (await JSZip.loadAsync(data).then((z) => !!z.file("ppt/presentation.xml"), () => false));
    if (isPptx) return importPptx(actor, fileName, data, o);
    let b;
    try {
      b = await readLessonBundle(data, { ffmpeg: cfg.ffmpeg });
    } catch (e) {
      throw new ValidationError([(e as Error).message]);
    }
    const id = randomUUID();
    const adir = audioDirOf(cfg.dataDir, id);
    await mkdir(adir, { recursive: true });
    for (const [n, buf] of b.audio) await writeFile(path.join(adir, n), buf);
    if (b.anim.size) {
      await mkdir(animDir, { recursive: true });
      for (const [h, buf] of b.anim) {
        const f = path.join(animDir, `${h}.mp4`);
        if (!(await stat(f).catch(() => null))) await writeFile(f, buf);
      }
    }
    const title = (o.tieuDe || b.meta.title).slice(0, 200);
    await db.insert(aiLessons).values({ id, orgId: actor.orgId, ownerId: actor.userId, title, subject: o.mon ?? b.meta.subject ?? "", grade: o.lop ?? b.meta.grade ?? null, status: "done", progress: { done: b.scenes.length, total: b.scenes.length, stage: b.source === "maic" ? "Đã nhập từ OpenMAIC" : "Đã nhập gói", failed: [] }, request: { requirement: `Nhập từ ${fileName}`.slice(0, 2000) }, outline: b.outline, scenes: b.scenes });
    return { id, title, scenes: b.scenes.length, warnings: b.warnings, status: "done" };
  }

  async function importPptx(actor: Actor, fileName: string, data: Buffer, o: z.infer<typeof ImportOpts>) {
    const tmp = path.join(cfg.dataDir, "xuat-ban", `nhap-${randomUUID()}.pptx`);
    await mkdir(path.dirname(tmp), { recursive: true });
    await writeFile(tmp, data);
    let deck;
    try {
      deck = await importPptxFile(tmp);
    } catch (e) {
      throw new ValidationError([`Không đọc được tệp .pptx: ${(e as Error).message}`]);
    } finally {
      await rm(tmp, { force: true });
    }
    const slides = deck.slides.filter((s) => !s.hidden).slice(0, 60);
    if (slides.length === 0) throw new ValidationError(["Tệp .pptx không có trang nào"]);
    const warnings: string[] = [];
    if (deck.slides.length > 60) warnings.push(`Chỉ nhập 60/${deck.slides.length} trang đầu`);
    const hidden = deck.slides.filter((s) => s.hidden).length;
    if (hidden) warnings.push(`Bỏ ${hidden} trang ẩn`);
    const stageId = randomUUID();
    const outline = slides.map((s, i) => ({ id: `nhap_${i + 1}`, type: "slide" as const, title: s.title, description: s.text.split("\n").slice(0, 3).join(" ").slice(0, 300), keyPoints: s.text.split("\n").map((x) => x.trim()).filter(Boolean).slice(1, 6), order: i + 1 }));
    const scenes: StoredScene[] = slides.map((s, i) => {
      const speech = o.loiGiang === "ghi-chu" && s.notes ? s.notes.split(/\n\s*\n|\n/).map((t) => t.trim()).filter(Boolean).map((t, k) => ({ id: `speech_${i + 1}_${k + 1}`, type: "speech" as const, text: t })) : [];
      return {
        id: randomUUID(),
        outlineId: outline[i]!.id,
        stageId,
        type: "slide",
        title: s.title,
        order: i + 1,
        content: { type: "slide", canvas: { id: randomUUID(), viewportSize: 1000, viewportRatio: 0.5625, ...(s.turningMode ? { turningMode: s.turningMode } : {}), theme: { backgroundColor: "#ffffff", themeColors: PAPER_STYLE.palette, fontColor: "#1f2428", fontName: "" }, elements: textMath(s.elements), background: s.background } },
        actions: speech,
      } as unknown as StoredScene;
    });
    const id = randomUUID();
    const title = (o.tieuDe || deck.title || fileName.replace(/\.\w+$/, "")).slice(0, 200);
    const needsWork = o.loiGiang === "ai" || (o.giongDoc && scenes.some((s) => (s.actions ?? []).length > 0));
    await db.insert(aiLessons).values({ id, orgId: actor.orgId, ownerId: actor.userId, title, subject: o.mon ?? "", grade: o.lop ?? null, status: needsWork ? "running" : "done", progress: { done: needsWork ? 0 : scenes.length, total: scenes.length, stage: needsWork ? "Đang soạn lời giảng" : "Đã nhập .pptx", failed: [] }, request: { requirement: `Nhập từ ${fileName}`.slice(0, 2000) }, outline, scenes });
    if (needsWork) void narrate(id, outline, scenes, o).catch(() => undefined);
    return { id, title, scenes: scenes.length, warnings, status: needsWork ? "running" : "done" };
  }

  /** Lời giảng AI cho slide nhập (task loi_giang qua cổng EDUVN) rồi đọc giọng nếu cần. */
  async function narrate(id: string, outline: { id: string; type: "slide"; title: string; description: string; keyPoints: string[]; order: number }[], scenes: StoredScene[], o: z.infer<typeof ImportOpts>): Promise<void> {
    const patch = (v: Partial<typeof aiLessons.$inferInsert>) => db.update(aiLessons).set({ ...v, updatedAt: new Date() }).where(eq(aiLessons.id, id));
    const failed: string[] = [];
    try {
      if (o.loiGiang === "ai") {
        if (!ai) throw new Error("Chưa bật cổng AI");
        const task = cfg.taskOverrides?.loi_giang ?? "loi_giang";
        const call = (system: string, user: string) => ai.chat(task, [{ role: "system", content: system }, { role: "user", content: user }], {});
        let done = 0;
        let next = 0;
        await Promise.all(
          Array.from({ length: Math.min(2, scenes.length) }, async () => {
            while (next < scenes.length) {
              const i = next++;
              const sc = scenes[i] as StoredScene;
              const ol = outline[i]!;
              try {
                const notes = (sc.actions ?? []).map((a) => (a.type === "speech" ? a.text : "")).join(" ");
                const acts = await generateSceneActions({ ...ol, ...(notes ? { description: `${ol.description}\nGhi chú của giáo viên: ${notes}`.slice(0, 1500) } : {}) }, { elements: (sc.content as unknown as { canvas: { elements: unknown[] } }).canvas.elements as never }, call as never, { languageDirective: VI_DIRECTIVE, ctx: { pageIndex: i + 1, totalPages: scenes.length, allTitles: outline.map((x) => x.title), previousSpeeches: [] } } as never);
                if (acts.length) sc.actions = acts as unknown as StoredScene["actions"];
              } catch (e) {
                failed.push(`${i + 1}. ${sc.title}: ${(e as Error).message.slice(0, 120)}`);
              }
              done++;
              await patch({ progress: { done, total: scenes.length, stage: "Đang soạn lời giảng", failed }, scenes });
            }
          }),
        );
      }
      if (o.giongDoc && cfg.tts) {
        await patch({ progress: { done: scenes.length, total: scenes.length, stage: "Đang đọc lời giảng", failed } });
        const adir = audioDirOf(cfg.dataDir, id);
        await mkdir(adir, { recursive: true });
        await fillMissingAudio({ ai: ai as Ai, tts: cfg.tts, audioDir: adir }, { outline: null, scenes }, { onScene: async () => void (await patch({ scenes })) });
      }
      await patch({ status: "done", progress: { done: scenes.length, total: scenes.length, stage: "Hoàn tất", failed }, scenes });
    } catch (e) {
      await patch({ status: "error", progress: { done: 0, total: scenes.length, stage: "Lỗi", error: (e as Error).message, failed } });
    }
  }

  /** Chờ hết việc nền (test). */
  async function idle(): Promise<void> {
    while (running > 0 || queue.length > 0) await new Promise((r) => setTimeout(r, 20));
  }

  return { listTemplates, addTemplate, removeTemplate, templateFile, startExport, jobStatus, cancel, jobFile, importFile, idle, makePptx, cfg };
}

const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Công thức OMML nằm giữa câu (nhập thành `$…$`) → chữ Unicode đọc được (trình phát dựng chữ HTML, không dựng $). Công thức đứng riêng đã là phần tử latex. */
export function textMath(els: Record<string, unknown>[]): Record<string, unknown>[] {
  const fix = (html: string) => html.replace(/\$([^$]+)\$/g, (_m, t: string) => escHtml(latexToPlain(unesc(t))));
  return els.map((e) => {
    if (e.type === "text" && typeof e.content === "string") return { ...e, content: fix(e.content) };
    const t = e.text as { content?: string } | undefined;
    if (e.type === "shape" && t?.content) return { ...e, text: { ...t, content: fix(t.content) } };
    return e;
  });
}

export type XuatBanService = ReturnType<typeof createXuatBanService>;

export const readTemplateBuffer = (file: string) => readFile(file);
