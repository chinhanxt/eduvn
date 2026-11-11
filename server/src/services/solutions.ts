// server/src/services/solutions.ts — P13 "Lời giải thông minh": đề → AI (giai_bai_tung_buoc, stream) → lời giải từng bước
// → tự kiểm đáp số (domain/verify) → lệch thì AI sửa đúng 1 lần với số đo thật → lưu bảng solutions; thư viện công khai.
import { and, desc, eq, ilike, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import type { StudentActor } from "../auth/student";
import { z } from "zod";
import type { Db } from "../db/client";
import { assignments, questions, solutions, submissions } from "../db/schema";
import { resultLevel, variantByCode } from "../domain/assignment";
import { type Role, assertCan, can } from "../domain/authz";
import { type Figure, type Solution, parseSolution, partialFigure, partialSteps } from "../domain/solution";
import { foldVi } from "../domain/tutorSearch";
import { mismatchNote, verifySolution } from "../domain/verify";
import { AiUnavailableError, NotFoundError, ValidationError } from "../errors";
import { type Ai, type AiMessage, parseAiJson } from "./ai";
import { GEOMETRY_SYSTEM } from "./geometry";

type Actor = { userId: string; orgId: string; role: Role };
export const SOLUTION_TASK = "giai_bai_tung_buoc";

export const SOLUTION_SYSTEM = `Bạn là giáo viên giỏi, giải bài cho học sinh Việt Nam theo đúng chương trình GDPT 2018 (cả đại học khi đề ở mức đại học). Trả về DUY NHẤT một đối tượng JSON (không markdown bao ngoài):

{"problem": "<chép lại đề>", "subject": "Toán", "topic": "<chủ đề ngắn, vd Hình học không gian / Hàm số / Xác suất / Phương trình mũ / Tích phân>",
 "answer": "<đáp số cuối gọn: 'a√6/3', '45°', 'x = 2', '3/8', 'V = a³√2/3'>",
 "figure": <hình hoặc null>,
 "steps": [{"title": "<tên bước ≤ 8 chữ>", "body": "<Markdown + công thức $LaTeX$>", "refs": ["<id phần tử hình liên quan>"], "check": <phép kiểm hoặc bỏ>}],
 "checks": [<phép kiểm đáp số cuối>]}

Yêu cầu lời giải:
- 3–7 bước NGẮN, mỗi bước MỘT ý (đặt ẩn / dựng hình phụ / tính đại lượng trung gian / kết luận). Bước cuối là kết luận nêu đáp số.
- Mỗi bước gắn "refs" tới đúng phần tử hình mà bước đó nói tới để phần mềm tô sáng.
- Công thức trong $...$, viết chuẩn LaTeX; câu chữ tiếng Việt có dấu, xưng "em"/"ta" thân thiện.

figure — chọn đúng một loại theo đề:
1. Hình không gian: {"kind": "solid3d", "spec": <JSON dựng hình theo HƯỚNG DẪN DỰNG HÌNH bên dưới>}. refs: điểm "S", đoạn "S-A", mặt "S-B-C" (tên điểm đúng như trong spec; được tham chiếu cả điểm do measures tự đặt như H).
2. Đồ thị hàm số: {"kind": "graph", "spec": {"expr": "x^3 - 3x + 1", "xRange": [-3, 3], "points": [{"id": "CD", "x": "-1", "y": "3", "label": "Cực đại"}]}}. expr dùng x, + - * / ^, sqrt, sin, cos, tan, ln, log, exp, abs, pi, e. refs: "f" (đường cong) hoặc id điểm.
3. Xác suất: cây {"kind": "tree", "spec": {"nodes": [{"id": "g", "label": "Bắt đầu"}, {"id": "A", "label": "Máy A", "parent": "g", "p": "0,6"}, …]}} — p là xác suất nhánh từ nút cha (các nhánh cùng cha cộng lại đúng 1). refs: id nút.
4. Sơ đồ (các bước lập luận, phân loại, văn/sử/địa…): {"kind": "diagram", "spec": {"nodes": [{"id": "1", "label": "…", "parent": null}], "links": [{"from": "1", "to": "2", "label": "…"}]}}. refs: id nút.
5. Hình phẳng có toạ độ: {"kind": "plane", "spec": {"points": [{"id": "A", "x": 0, "y": 0}], "segments": [["A","B"]], "circles": [{"center": "O", "r": 2}]}}. refs: "A", "A-B".
Đề không cần hình (phương trình, biến đổi đại số…) → "figure": null.

Phép kiểm (để phần mềm TỰ ĐO LẠI, không tin lời AI): điền "checks" cho đáp số cuối, có thể thêm "check" cho bước trung gian quan trọng.
- {"type": "measure3d", "measure": M, "expect": "a√2"} với M là {"type":"length","of":["A","C"]} | {"type":"distance","from":"A","plane":["S","B","C"]} | {"type":"distance","from":"S","line":["B","D"]} | {"type":"distance_lines","lines":[["A","B'"],["B","C'"]]} | {"type":"angle_line_plane","line":["S","C"],"plane":["A","B","C"]} | {"type":"angle_planes","planes":[["S","C","D"],["A","B","C"]]} | {"type":"angle_lines","lines":[["S","B"],["A","C"]]} | {"type":"volume","body":0} | {"type":"area","polygon":["A","B","C"]}. Góc ghi "60°" hoặc "tan φ = √6".
- {"type": "equation", "lhs": "2^(x+1)", "rhs": "8", "roots": ["2"]} — roots là TẤT CẢ nghiệm thực.
- {"type": "inequality", "lhs": "x^2-5x+6", "op": "<", "rhs": "0", "solution": [["2","3"]]} — các khoảng nghiệm, vô cực ghi "-inf"/"inf".
- {"type": "value", "expr": "sqrt(2)/2 + 1/3", "expect": "…"} hoặc {"type": "value", "expr": "x^3-3x+1", "at": "-1", "expect": "3"}.
- {"type": "derivative", "f": "x^3-3x", "at": "2", "expect": "9"}; {"type": "integral", "f": "3x^2+2x", "from": "0", "to": "1", "expect": "2"}.
- {"type": "probability", "leaves": ["AL","BL"], "expect": "0,032"}; có điều kiện P(X|Y): {"type": "probability", "leaves": [lá của X], "given": [lá của Y], "expect": "3/8"}.
Biểu thức trong phép kiểm: biến x (độ dài theo a thì a = 1), không dùng ký hiệu lạ. Bỏ "expect" ở "checks" thì phần mềm so với "answer". Bài không có đáp số định lượng (văn, chứng minh…) → "checks": [].

HƯỚNG DẪN DỰNG HÌNH (chỉ áp dụng cho figure.spec loại solid3d):
${GEOMETRY_SYSTEM.replace(/^Bạn là[^\n]*\n\n/, "").replace(/\n8\. Không giải bài[^\n]*$/, "")}`;

const SolveReq = z.object({
  problem: z.string().trim().min(5, "Đề bài quá ngắn").max(6000, "Đề bài tối đa 6000 ký tự").optional(),
  questionId: z.uuid().optional(),
  subject: z.string().trim().max(60).optional(),
  topic: z.string().trim().max(120).optional(),
  /** true = lưu vào DB (ngân hàng/thư viện); gia sư dùng nhanh có thể không lưu */
  save: z.boolean().default(true),
});

export type SolveEvent =
  | { type: "figure"; figure: Figure | null }
  | { type: "step"; index: number; step: unknown }
  | { type: "partial"; index: number; title: string; body: string }
  | { type: "status"; message: string }
  | { type: "verified"; verification: Solution["verification"]; corrected: boolean }
  | { type: "done"; id: string | null; solution: Solution };

export type SolutionRow = { id: string; questionId: string | null; slug: string | null; views: number; publishedAt: Date | null; solution: Solution };

/** Chủ đề → slug tiếng Việt không dấu ngắn + 6 ký tự ngẫu nhiên (đường /loi-giai/:slug). */
export function slugOf(problem: string, rand: string): string {
  const base = foldVi(problem)
    .replace(/\$[^$]*\$/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 10)
    .join("-")
    .slice(0, 70)
    .replace(/-+$/, "");
  return `${base || "loi-giai"}-${rand}`;
}

/** Đề trong ngân hàng → chữ (câu dẫn + phương án/mệnh đề) và đáp án đã lưu (để AI giải khớp đáp án GV). */
export function questionText(body: unknown): { text: string; key?: string } {
  const b = (body ?? {}) as { type?: string; stem?: string; options?: string[]; statements?: string[]; answer?: unknown };
  const L = (i: number) => String.fromCharCode(65 + i);
  const lines = [b.stem ?? ""];
  if (b.type === "mcq" && b.options) lines.push(...b.options.map((o, i) => `${L(i)}. ${o}`));
  if (b.type === "true_false" && b.statements) lines.push(...b.statements.map((o, i) => `${L(i).toLowerCase()}) ${o}`));
  let key: string | undefined;
  if (b.type === "mcq" && typeof b.answer === "number") key = `${L(b.answer)}. ${b.options?.[b.answer] ?? ""}`;
  else if (b.type === "true_false" && Array.isArray(b.answer)) key = b.answer.map((v, i) => `${L(i).toLowerCase()}) ${v ? "Đúng" : "Sai"}`).join("; ");
  else if (b.type === "short_answer" && typeof b.answer === "string") key = b.answer;
  return { text: lines.filter(Boolean).join("\n"), key };
}

export function createSolutionService(db: Db, ai: Ai, opts: { now?: () => Date; rand?: () => string } = {}) {
  const now = opts.now ?? (() => new Date());
  const rand = opts.rand ?? (() => Math.random().toString(36).slice(2, 8));

  async function loadQuestion(actor: Actor, id: string) {
    assertCan(actor.role, "question:read");
    const [q] = await db.select().from(questions).where(and(eq(questions.id, id), eq(questions.orgId, actor.orgId)));
    if (!q) throw new NotFoundError("Không tìm thấy câu hỏi");
    return q;
  }

  async function parseAndCheck(text: string): Promise<{ ok: true; solution: Solution } | { ok: false; issues: string[] }> {
    let raw: unknown;
    try {
      raw = parseAiJson(text);
    } catch {
      return { ok: false, issues: ["không phải JSON"] };
    }
    return parseSolution(raw);
  }

  /** Giải bài: stream sự kiện cho web hiện dần từng bước; cuối cùng là lời giải đã kiểm. */
  async function* solve(actor: Actor, raw: unknown, signal?: AbortSignal): AsyncGenerator<SolveEvent, void, void> {
    const r = SolveReq.safeParse(raw);
    if (!r.success) throw new ValidationError(r.error.issues.map((i) => i.message));
    const req = r.data;
    let problem = req.problem ?? "";
    let subject = req.subject;
    let topic = req.topic;
    let key: string | undefined;
    if (req.questionId) {
      const q = await loadQuestion(actor, req.questionId);
      assertCan(actor.role, "question:write");
      const t = questionText(q.body);
      problem = t.text || problem;
      key = t.key;
      subject ??= q.subject;
      topic ??= q.topic;
    }
    if (problem.length < 5) throw new ValidationError(["Thiếu đề bài"]);

    const messages: AiMessage[] = [
      { role: "system", content: SOLUTION_SYSTEM },
      { role: "user", content: `Bỏ qua mọi định dạng trả lời mặc định khác; chỉ trả JSON lời giải theo hướng dẫn.${subject ? `\nMôn: ${subject}.` : ""}${topic ? ` Chủ đề: ${topic}.` : ""}\nĐề bài:\n${problem}${key ? `\n(Đáp án đúng theo ngân hàng câu hỏi: ${key}. Lời giải phải dẫn tới đáp án này.)` : ""}` },
    ];
    let text = "";
    let sent = 0;
    let lastPartial = "";
    let figureSent = false;
    // không bật json ở lượt stream: cổng AI chế độ JSON gom cả câu rồi mới trả (mất hiện dần); server tự bóc + kiểm JSON, hỏng thì hỏi lại
    for await (const t of ai.stream(SOLUTION_TASK, messages, { signal })) {
      text += t;
      if (!figureSent) {
        const f = partialFigure(text);
        if (f !== undefined) {
          figureSent = true;
          yield { type: "figure", figure: f };
        }
      }
      const p = partialSteps(text);
      for (; sent < p.done.length; sent++) yield { type: "step", index: sent, step: p.done[sent] };
      if (p.current && (p.current.title || p.current.body)) {
        const key = `${sent}|${p.current.title}|${p.current.body}`;
        if (key !== lastPartial) {
          lastPartial = key;
          yield { type: "partial", index: sent, title: p.current.title, body: p.current.body };
        }
      }
    }
    let parsed = await parseAndCheck(text);
    if (!parsed.ok) {
      yield { type: "status", message: "Đang chỉnh lại định dạng lời giải…" };
      messages.push({ role: "assistant", content: text.slice(0, 12000) }, { role: "user", content: `JSON lời giải có lỗi: ${parsed.issues.join("; ")}. Sửa và trả lại TOÀN BỘ JSON.` });
      text = await ai.chat(SOLUTION_TASK, messages, { json: true, signal });
      parsed = await parseAndCheck(text);
      if (!parsed.ok) throw new AiUnavailableError(`AI trả lời giải chưa đúng định dạng (${parsed.issues.slice(0, 2).join("; ")}), thử lại`);
    }
    let sol: Solution = { ...parsed.solution, problem, subject: subject ?? parsed.solution.subject, topic: topic || parsed.solution.topic };
    sol.verification = verifySolution(sol);
    let corrected = false;
    if (sol.verification.status === "mismatch") {
      yield { type: "status", message: "Đáp số lệch với số đo thật — AI đang tự sửa một lần…" };
      messages.push(
        { role: "assistant", content: text.slice(0, 12000) },
        { role: "user", content: `Phần mềm đã đo/tính lại và thấy LỆCH:\n${mismatchNote(sol.verification)}\nKiểm tra lại lập luận và hình (các số đo trên là số đo thật trên hình bạn dựng / giá trị thật của biểu thức). Sửa lời giải, đáp số và phép kiểm cho đúng rồi trả lại TOÀN BỘ JSON.` },
      );
      try {
        const fixed = await parseAndCheck(await ai.chat(SOLUTION_TASK, messages, { json: true, signal }));
        if (fixed.ok) {
          const s2: Solution = { ...fixed.solution, problem, subject: sol.subject, topic: sol.topic };
          s2.verification = verifySolution(s2);
          sol = s2;
          corrected = true;
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") throw e;
        // giữ bản đầu, huy hiệu "Lệch" cho GV/HS biết
      }
    }
    yield { type: "verified", verification: sol.verification, corrected };
    let id: string | null = null;
    // HS dùng gia sư "Lời giải đầy đủ": chỉ xem, không ghi vào kho lời giải của tổ chức
    if (req.save && can(actor.role, "question:write")) id = await store(actor, sol, req.questionId);
    yield { type: "done", id, solution: sol };
  }

  async function store(actor: Actor, sol: Solution, questionId?: string): Promise<string> {
    const values = { orgId: actor.orgId, ownerId: actor.userId, questionId: questionId ?? null, subject: sol.subject, topic: sol.topic, status: sol.verification.status, body: sol, updatedAt: now() };
    if (questionId) {
      const [row] = await db
        .insert(solutions)
        .values(values)
        .onConflictDoUpdate({ target: solutions.questionId, set: { body: sol, status: sol.verification.status, subject: sol.subject, topic: sol.topic, updatedAt: now() } })
        .returning({ id: solutions.id });
      return row!.id;
    }
    const [row] = await db.insert(solutions).values(values).returning({ id: solutions.id });
    return row!.id;
  }

  const toRow = (r: typeof solutions.$inferSelect): SolutionRow => ({ id: r.id, questionId: r.questionId, slug: r.slug, views: r.views, publishedAt: r.publishedAt, solution: r.body });

  async function own(actor: Actor, id: string) {
    const [r] = await db.select().from(solutions).where(and(eq(solutions.id, id), eq(solutions.orgId, actor.orgId)));
    if (!r) throw new NotFoundError("Không tìm thấy lời giải");
    return r;
  }

  return {
    solve,
    async get(actor: Actor, id: string): Promise<SolutionRow> {
      return toRow(await own(actor, id));
    },
    async forQuestion(actor: Actor, questionId: string): Promise<SolutionRow | null> {
      await loadQuestion(actor, questionId);
      const [r] = await db.select().from(solutions).where(and(eq(solutions.questionId, questionId), eq(solutions.orgId, actor.orgId)));
      return r ? toRow(r) : null;
    },
    /** Câu nào trong danh sách đã có lời giải (để ngân hàng hiện dấu). */
    async statusFor(actor: Actor, ids: string[]): Promise<Record<string, Solution["verification"]["status"]>> {
      assertCan(actor.role, "question:read");
      if (!ids.length) return {};
      const rows = await db.select({ q: solutions.questionId, s: solutions.status }).from(solutions).where(and(eq(solutions.orgId, actor.orgId), isNotNull(solutions.questionId)));
      const want = new Set(ids);
      return Object.fromEntries(rows.filter((r) => r.q && want.has(r.q)).map((r) => [r.q!, r.s]));
    },
    /** GV bật/tắt chia sẻ công khai; bật lần đầu thì sinh slug (giữ nguyên slug khi bật lại để link cũ còn sống). */
    async publish(actor: Actor, id: string, on: boolean): Promise<SolutionRow> {
      assertCan(actor.role, "question:write");
      const r = await own(actor, id);
      const slug = r.slug ?? slugOf(r.body.problem, rand());
      const [u] = await db.update(solutions).set({ slug, publishedAt: on ? now() : null, updatedAt: now() }).where(eq(solutions.id, id)).returning();
      return toRow(u!);
    },
    async remove(actor: Actor, id: string): Promise<void> {
      assertCan(actor.role, "question:write");
      await own(actor, id);
      await db.delete(solutions).where(eq(solutions.id, id));
    },

    /** Kết quả bài làm của HS: lời giải từng bước theo số câu `no`, chỉ khi cài đặt "hiện lời giải" của bài cho phép (mức full). */
    async forSubmission(sa: StudentActor, submissionId: string): Promise<Record<string, Solution>> {
      const [s] = await db.select().from(submissions).where(and(eq(submissions.id, submissionId), eq(submissions.studentId, sa.studentId), ne(submissions.status, "in_progress")));
      if (!s) throw new NotFoundError("Không tìm thấy bài làm");
      const [a] = await db.select().from(assignments).where(eq(assignments.id, s.assignmentId));
      if (!a || resultLevel(a.showSolution, a.dueAt, now()) !== "full") return {};
      const items = variantByCode(a.variants, s.variantCode).items;
      const ids = [...new Set(items.map((i) => i.questionId))];
      if (!ids.length) return {};
      const rows = await db.select({ q: solutions.questionId, body: solutions.body }).from(solutions).where(and(eq(solutions.orgId, a.orgId), inArray(solutions.questionId, ids)));
      const byQ = new Map(rows.map((r) => [r.q!, r.body]));
      return Object.fromEntries(items.filter((i) => byQ.has(i.questionId)).map((i) => [String(i.no), byQ.get(i.questionId)!]));
    },

    // ——— thư viện công khai (không đăng nhập, không lộ tổ chức/người soạn) ———
    async publicList(q: { topic?: string; q?: string; page?: number }) {
      const page = Math.max(1, Math.min(200, Math.floor(q.page ?? 1)));
      const conds = [isNotNull(solutions.publishedAt)];
      if (q.topic) conds.push(eq(solutions.topic, q.topic));
      const term = q.q?.trim().slice(0, 100);
      if (term) conds.push(or(ilike(sql`${solutions.body}->>'problem'`, `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`), ilike(solutions.topic, `%${term}%`))!);
      const rows = await db
        .select({ slug: solutions.slug, subject: solutions.subject, topic: solutions.topic, status: solutions.status, views: solutions.views, problem: sql<string>`${solutions.body}->>'problem'`, answer: sql<string>`${solutions.body}->>'answer'`, publishedAt: solutions.publishedAt })
        .from(solutions)
        .where(and(...conds))
        .orderBy(desc(solutions.publishedAt))
        .limit(20)
        .offset((page - 1) * 20);
      const topics = await db
        .select({ topic: solutions.topic, n: sql<number>`count(*)::int` })
        .from(solutions)
        .where(isNotNull(solutions.publishedAt))
        .groupBy(solutions.topic)
        .orderBy(desc(sql`count(*)`));
      return { items: rows.map((r) => ({ ...r, problem: r.problem.slice(0, 300) })), topics: topics.filter((t) => t.topic), page };
    },
    async publicGet(slug: string, countView = true) {
      const [r] = await db.select().from(solutions).where(and(eq(solutions.slug, slug), isNotNull(solutions.publishedAt)));
      if (!r) throw new NotFoundError("Lời giải không tồn tại hoặc đã ngừng chia sẻ");
      if (countView) await db.update(solutions).set({ views: sql`${solutions.views} + 1` }).where(eq(solutions.id, r.id));
      return { slug, subject: r.subject, topic: r.topic, views: r.views + (countView ? 1 : 0), publishedAt: r.publishedAt, solution: r.body };
    },
  };
}
export type SolutionService = ReturnType<typeof createSolutionService>;
