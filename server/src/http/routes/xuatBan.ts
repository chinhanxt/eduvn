// P14/GX "Xuất bản & Nhập": /api/xuat-ban/* — kho mẫu .pptx, việc xuất (PowerPoint gốc, HTML ngoại tuyến, gói .zip,
// gói tài nguyên, kịch bản, video có tuỳ chọn/tiến độ/huỷ), nhập .pptx/.eduvn.zip/.maic.zip. Tệp tải lên gửi thẳng nhị phân (application/octet-stream).
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../../db/client";
import { NotFoundError, ValidationError } from "../../errors";
import type { Ai } from "../../services/ai";
import type { AiLessonsCfg } from "../../services/aiLessons/service";
import { type XuatBanService, createXuatBanService } from "../../services/pptx/service";
import type { Actor } from "../../service";

type Ctx = { db: Db; ai?: Ai; cfg: AiLessonsCfg; webUrl?: string; authenticate: (req: FastifyRequest) => Promise<Actor> };
const P = "/api/xuat-ban";
const UPLOAD_LIMIT = 300 * 1024 * 1024;

const disposition = (name: string) => `attachment; filename="${name.replace(/[^\w.-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`;

export function registerXuatBanRoutes(app: FastifyInstance, ctx: Ctx): XuatBanService {
  const svc = createXuatBanService(ctx.db, ctx.ai, { dataDir: ctx.cfg.dataDir, tts: ctx.cfg.tts, chromePath: ctx.cfg.chromePath, taskOverrides: ctx.cfg.taskOverrides, webUrl: ctx.webUrl ?? process.env.WEB_URL });
  const id = (req: FastifyRequest) => (req.params as { id: string }).id;

  // ---- kho mẫu
  app.get(`${P}/mau`, async (req) => svc.listTemplates(await ctx.authenticate(req)));
  app.delete(`${P}/mau/:id`, async (req, reply) => {
    await svc.removeTemplate(await ctx.authenticate(req), id(req));
    return reply.code(204).send();
  });
  app.get(`${P}/mau/:id/tep`, async (req, reply) => {
    const t = await svc.templateFile(await ctx.authenticate(req), id(req));
    const st = await stat(t.file).catch(() => null);
    if (!st) throw new NotFoundError("Mất tệp mẫu");
    return reply.header("content-type", "application/vnd.openxmlformats-officedocument.presentationml.presentation").header("content-disposition", disposition(t.fileName)).header("content-length", st.size).send(createReadStream(t.file));
  });

  // ---- việc xuất
  app.post(`${P}/viec`, async (req, reply) => reply.code(202).send(await svc.startExport(await ctx.authenticate(req), req.body)));
  app.get(`${P}/viec/:id`, async (req) => svc.jobStatus(await ctx.authenticate(req), id(req)));
  app.delete(`${P}/viec/:id`, async (req) => svc.cancel(await ctx.authenticate(req), id(req)));
  app.get(`${P}/viec/:id/tep`, async (req, reply) => {
    const srt = (req.query as { "phu-de"?: string })["phu-de"] === "1";
    const f = await svc.jobFile(await ctx.authenticate(req), id(req), srt);
    const st = await stat(f.file).catch(() => null);
    if (!st) throw new NotFoundError("Tệp đã hết hạn — hãy xuất lại");
    return reply.header("content-type", f.mime).header("cache-control", "no-store").header("content-disposition", disposition(f.fileName)).header("content-length", st.size).send(createReadStream(f.file));
  });

  // ---- tải lên nhị phân (mẫu, nhập bài) trong phạm vi riêng để bộ đọc octet-stream không ảnh hưởng route khác
  app.register(async (sub) => {
    sub.addContentTypeParser(["application/octet-stream", "application/zip", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], { parseAs: "buffer", bodyLimit: UPLOAD_LIMIT }, (_req, body, done) => done(null, body));
    const buf = (req: FastifyRequest): Buffer => {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new ValidationError(["Chưa gửi tệp (gửi nhị phân, content-type application/octet-stream)"]);
      return req.body;
    };
    sub.post(`${P}/mau`, { bodyLimit: 30 * 1024 * 1024 }, async (req, reply) => {
      const actor = await ctx.authenticate(req);
      const q = z.object({ ten: z.string().trim().min(1).max(120), loai: z.enum(["mau", "phong_cach"]).default("mau"), tep: z.string().trim().min(1).max(200).default("mau.pptx") }).parse(req.query);
      return reply.code(201).send(await svc.addTemplate(actor, { name: q.ten, kind: q.loai, fileName: q.tep, data: buf(req) }));
    });
    sub.post(`${P}/nhap`, { bodyLimit: UPLOAD_LIMIT }, async (req, reply) => {
      const actor = await ctx.authenticate(req);
      const q = z.object({ tep: z.string().trim().min(1).max(200), loiGiang: z.enum(["ghi-chu", "ai", "khong"]).optional(), giongDoc: z.enum(["0", "1"]).optional(), tieuDe: z.string().max(200).optional(), mon: z.string().max(60).optional(), lop: z.coerce.number().int().min(1).max(16).optional() }).parse(req.query);
      return reply.code(201).send(await svc.importFile(actor, q.tep, buf(req), { loiGiang: q.loiGiang, giongDoc: q.giongDoc === "1", tieuDe: q.tieuDe || undefined, mon: q.mon || undefined, lop: q.lop }));
    });
  });

  return svc;
}
