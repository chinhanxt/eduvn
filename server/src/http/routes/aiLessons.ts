import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { renderAiLessonPptx } from "../../export/aiLessonPptx";
import { renderLessonVideo } from "../../export/aiLessonVideo";
import type { Actor, Service } from "../../service";
import type { Db } from "../../db/client";
import { NotFoundError, ValidationError } from "../../errors";
import type { Ai } from "../../services/ai";
import { audioDirOf } from "../../services/aiLessons/generate";
import { CATALOG } from "../../services/anim/catalog";
import { extractMaterialText } from "../../services/aiLessons/material";
import { type AiLessonService, type AiLessonsCfg, createAiLessonService } from "../../services/aiLessons/service";
import { readVendor } from "../../services/aiLessons/vendor";

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const BIG = { bodyLimit: 4 * 1024 * 1024 };
const UPLOAD = { bodyLimit: 16 * 1024 * 1024 };
const slug = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || "bai-giang";

type Ctx = { db: Db; ai?: Ai; cfg: AiLessonsCfg; service: Service; authenticate: (req: FastifyRequest) => Promise<Actor> };
type VideoState = { status: "running" | "done" | "error"; done: number; total: number; error?: string; durationMs?: number };

export function registerAiLessonRoutes(app: FastifyInstance, ctx: Ctx): AiLessonService {
  const svc = createAiLessonService(ctx.db, ctx.ai, ctx.cfg);
  const videos = new Map<string, VideoState>();
  const id = (req: FastifyRequest) => (req.params as { id: string }).id;
  const P = "/api/ai-lessons";
  if (ctx.cfg.markStaleOnStart) app.addHook("onReady", async () => void (await svc.markStale()));

  // Thư viện cho cảnh interactive (iframe sandbox không có origin → cần CORS *)
  app.get("/vendor/interactive/*", async (req, reply) => {
    const v = await readVendor(req.url.split("?")[0] ?? "");
    if (!v) throw new NotFoundError("Không có tệp");
    return reply.header("content-type", v.mime).header("access-control-allow-origin", "*").header("cache-control", "public, max-age=31536000, immutable").send(v.body);
  });

  app.get(P, async (req) => svc.list(await ctx.authenticate(req)));
  app.post(P, async (req, reply) => reply.code(202).send(await svc.create(await ctx.authenticate(req), req.body)));

  app.post(`${P}/tai-lieu`, UPLOAD, async (req) => {
    await ctx.authenticate(req);
    const b = z.object({ name: z.string().min(1).max(200), contentBase64: z.string().min(1) }).parse(req.body);
    if (b.contentBase64.length > 14 * 1024 * 1024) throw new ValidationError(["Tài liệu quá lớn (tối đa 10 MB)"]);
    const text = await extractMaterialText(b.name, Buffer.from(b.contentBase64, "base64"), ctx.ai);
    return { name: b.name, chars: text.length, text };
  });

  app.get(`${P}/:id`, async (req) => svc.get(await ctx.authenticate(req), id(req)));
  app.get(`${P}/:id/trang-thai`, async (req) => svc.status(await ctx.authenticate(req), id(req)));
  app.post(`${P}/:id/sinh-tiep`, async (req, reply) => reply.code(202).send(await svc.resume(await ctx.authenticate(req), id(req))));
  app.put(`${P}/:id`, BIG, async (req) => svc.save(await ctx.authenticate(req), id(req), req.body));
  app.delete(`${P}/:id`, async (req, reply) => {
    await svc.remove(await ctx.authenticate(req), id(req));
    return reply.code(204).send();
  });

  app.post(`${P}/:id/canh/:sceneId/sinh-lai`, async (req) => {
    const b = z.object({ directive: z.string().max(500).optional() }).parse(req.body ?? {});
    return svc.regenerate(await ctx.authenticate(req), id(req), (req.params as { sceneId: string }).sceneId, b.directive);
  });

  app.post(`${P}/:id/canh/:sceneId/luu-ngan-hang`, async (req) => {
    const actor = await ctx.authenticate(req);
    return svc.saveQuiz(actor, id(req), (req.params as { sceneId: string }).sceneId, req.body, (a, q) => ctx.service.addQuestion(a, q));
  });

  app.get(`${P}/:id/audio/:file`, async (req, reply) => {
    const p = await svc.mediaPath(await ctx.authenticate(req), id(req), "audio", (req.params as { file: string }).file);
    const st = await stat(p).catch(() => null);
    if (!st) throw new NotFoundError("Chưa có âm thanh");
    return reply.header("content-type", "audio/mpeg").header("cache-control", "private, max-age=3600").header("content-length", st.size).send(createReadStream(p));
  });

  // Danh mục mẫu hoạt hình cho thư viện "Chọn hoạt hình" (bỏ từ khoá nội bộ)
  app.get(`${P}/mau-hoat-hinh`, async (req) => {
    await ctx.authenticate(req);
    return CATALOG.map(({ tuKhoa: _k, ...rest }) => rest);
  });
  // Hoạt hình toán gắn vào cảnh: tạo (AI chọn mẫu hoặc gửi spec) / bỏ / tải clip
  app.post(`${P}/:id/canh/:sceneId/hoat-hinh`, async (req, reply) => reply.code(202).send(await svc.animate(await ctx.authenticate(req), id(req), (req.params as { sceneId: string }).sceneId, req.body)));
  app.delete(`${P}/:id/canh/:sceneId/hoat-hinh`, async (req) => svc.removeAnimation(await ctx.authenticate(req), id(req), (req.params as { sceneId: string }).sceneId));
  app.get(`${P}/:id/hoat-hinh/:hash`, async (req, reply) => {
    const p = await svc.animPath(await ctx.authenticate(req), id(req), (req.params as { hash: string }).hash.replace(/\.mp4$/, ""));
    const st = await stat(p).catch(() => null);
    if (!st) throw new NotFoundError("Chưa có clip");
    return reply.header("content-type", "video/mp4").header("cache-control", "private, max-age=3600").header("content-length", st.size).send(createReadStream(p));
  });

  app.get(`${P}/:id/pptx`, async (req, reply) => {
    const l = await svc.loadForExport(await ctx.authenticate(req), id(req));
    return reply.header("content-type", PPTX).header("cache-control", "no-store").header("content-disposition", `attachment; filename="bai-giang-${slug(l.title)}.pptx"`).send(await renderAiLessonPptx(l.title, l.scenes));
  });

  // Xuất MP4: bấm dựng (nền) → hỏi trạng thái → tải tệp
  app.post(`${P}/:id/video`, async (req, reply) => {
    const l = await svc.loadForExport(await ctx.authenticate(req), id(req));
    const key = id(req);
    if (videos.get(key)?.status === "running") return reply.code(202).send(videos.get(key));
    if (l.scenes.length === 0) throw new ValidationError(["Bài giảng chưa có cảnh nào"]);
    const st: VideoState = { status: "running", done: 0, total: 1 };
    videos.set(key, st);
    const actor = await ctx.authenticate(req);
    // cảnh quiz: sinh + đọc lời câu hỏi/đáp án nếu thiếu để thời lượng theo nội dung (không câm), rồi dựng
    void svc
      .prepareVideo(actor, key)
      .catch(() => l.scenes)
      .then((scenes) =>
        renderLessonVideo(l.title, scenes, audioDirOf(ctx.cfg.dataDir, key), {
          chromePath: ctx.cfg.chromePath ?? "/usr/bin/google-chrome",
          outDir: path.join(l.dir, "video"),
          animDir: ctx.cfg.anim?.dir,
          onProgress: (d, t) => Object.assign(st, { done: d, total: t }),
        }),
      )
      .then((r) => Object.assign(st, { status: "done", durationMs: r.totalMs }))
      .catch((e: unknown) => Object.assign(st, { status: "error", error: (e as Error).message }));
    return reply.code(202).send(st);
  });
  app.get(`${P}/:id/video`, async (req) => {
    const l = await svc.loadForExport(await ctx.authenticate(req), id(req));
    const st = videos.get(id(req));
    if (st) return st;
    const exists = await stat(path.join(l.dir, "video", "bai-giang.mp4")).then(() => true, () => false);
    return exists ? { status: "done", done: 1, total: 1 } : { status: "none", done: 0, total: 0 };
  });
  app.get(`${P}/:id/video/:file`, async (req, reply) => {
    const file = (req.params as { file: string }).file;
    const p = await svc.mediaPath(await ctx.authenticate(req), id(req), "video", file);
    const st = await stat(p).catch(() => null);
    if (!st) throw new NotFoundError("Chưa dựng video");
    const mp4 = file.endsWith(".mp4");
    return reply.header("content-type", mp4 ? "video/mp4" : "application/x-subrip; charset=utf-8").header("content-disposition", `attachment; filename="${file}"`).header("content-length", st.size).send(createReadStream(p));
  });

  return svc;
}
