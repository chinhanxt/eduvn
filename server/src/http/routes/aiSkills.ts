import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { assertCan } from "../../domain/authz";
import { QuestionType } from "../../domain/question";
import { renderSyllabusDocx } from "../../export/syllabus";
import type { Actor } from "../../service";
import { type Ai, disabledAi } from "../../services/ai";
import { Syllabus, draftComments, draftLessonPlan, draftMatrix, draftQuestions, draftSyllabus, rubricFor } from "../../services/aiSkills";
import type { ClassService } from "../../services/classes";
import type { LessonService } from "../../services/lessons";
import { listSkills } from "../../services/skills";
import { parseOverrides, withTaskOverrides } from "../../tutor/tasks";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
type Ctx = { ai?: Ai; lessons: LessonService; classes: ClassService; authenticate: (req: FastifyRequest) => Promise<Actor> };

const Grade = z.number().int().min(1).max(16);
const Lesson = z.object({ subject: z.string().trim().min(1), grade: Grade, title: z.string().trim().min(1), periods: z.number().int().min(1).max(20).default(1), note: z.string().max(1000).optional() });
const Matrix = z.object({ description: z.string().trim().min(5).max(3000), subject: z.string().trim().optional(), grade: Grade.optional() });
const Questions = z.object({
  subject: z.string().trim().min(1), grade: Grade, topic: z.string().trim().min(1), yccd: z.string().trim().max(1000).optional(),
  level: z.enum(["NB", "TH", "VD"]), type: z.union([QuestionType, z.literal("mix")]).default("mcq"), count: z.number().int().min(1).max(10).default(3),
});
const Comments = z.object({ classId: z.string().min(1), term: z.enum(["HK1", "HK2"]), students: z.array(z.string()).optional() });
const SyllabusReq = z.object({ name: z.string().trim().min(1), credits: z.number().int().min(1).max(15), major: z.string().optional(), level: z.string().optional(), weeks: z.number().int().min(4).max(30).optional(), plos: z.string().max(3000).optional(), note: z.string().max(1000).optional() });
const RubricReq = z.object({ stem: z.string().trim().min(1), points: z.number().positive().max(100), rubric: z.string().optional(), subject: z.string().optional(), grade: Grade.optional() });

/** Các nút AI dùng skill sư phạm (P8). Mọi kết quả là bản nháp: giáo viên duyệt/sửa rồi mới lưu (trừ giáo án, lưu thành bản nháp trong Giáo án). */
export function registerAiSkillRoutes(app: FastifyInstance, ctx: Ctx): void {
  const ai = withTaskOverrides(ctx.ai ?? disabledAi, parseOverrides(process.env.AI_TASK_OVERRIDES));
  const P = "/api/ai-skills";

  app.get(P, async (req) => {
    await ctx.authenticate(req);
    return listSkills();
  });

  app.post(`${P}/giao-an`, async (req, reply) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "lesson:manage");
    const plan = await draftLessonPlan(ai, Lesson.parse(req.body));
    return reply.code(201).send(await ctx.lessons.save(actor, { plan }));
  });

  app.post(`${P}/ma-tran`, async (req) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "exam:create");
    return draftMatrix(ai, Matrix.parse(req.body));
  });

  app.post(`${P}/cau-hoi`, async (req) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "question:write");
    return draftQuestions(ai, Questions.parse(req.body));
  });

  app.post(`${P}/nhan-xet`, async (req) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "class:manage");
    return draftComments(ai, ctx.classes, actor, Comments.parse(req.body));
  });

  app.post(`${P}/de-cuong`, async (req) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "lesson:manage");
    return draftSyllabus(ai, SyllabusReq.parse(req.body));
  });

  app.post(`${P}/de-cuong/docx`, { bodyLimit: 2 * 1024 * 1024 }, async (req, reply) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "lesson:read");
    const s = Syllabus.parse(req.body);
    return reply.header("content-type", DOCX).header("cache-control", "no-store").header("content-disposition", 'attachment; filename="de-cuong-hoc-phan.docx"').send(await renderSyllabusDocx(s));
  });

  app.post(`${P}/rubric`, async (req) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "question:read");
    return rubricFor(ai, RubricReq.parse(req.body));
  });
}
