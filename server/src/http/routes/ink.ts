import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Actor } from "../../service";
import { type Ai, disabledAi } from "../../services/ai";
import { inkToLatex } from "../../services/ink";
import { parseOverrides, withTaskOverrides } from "../../tutor/tasks";

type Ctx = { ai?: Ai; authenticate: (req: FastifyRequest) => Promise<Actor> };

/** Viết tay → LaTeX cho bảng giảng và ô công thức (ảnh PNG base64 không tiền tố). */
export function registerInkRoutes(app: FastifyInstance, ctx: Ctx): void {
  const ai = withTaskOverrides(ctx.ai ?? disabledAi, parseOverrides(process.env.AI_TASK_OVERRIDES));
  app.post("/api/ink/latex", { bodyLimit: 10 * 1024 * 1024 }, async (req) => {
    await ctx.authenticate(req);
    const b = z.object({ imageBase64: z.string().min(20) }).parse(req.body);
    return { latex: await inkToLatex(ai, b.imageBase64) };
  });
}
