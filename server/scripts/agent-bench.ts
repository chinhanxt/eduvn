// Đo độ ổn định giao thức nhãn THINK/TOOL/ANSWER qua cổng AI thật (gói G6).
// Chạy: GATEWAY_URL=http://127.0.0.1:4340 GATEWAY_TOKEN=… MODELS=claude-sonnet-5-5-low,gemini-3.8-flash-low OUT=/tmp/g6-bench.json \
//   pnpm --filter @eduvn/server exec tsx scripts/agent-bench.ts
// Mỗi model × mỗi câu hỏi = một lượt runAgentLoop với công cụ thật (tra kho tri thức BM25 trên PGlite + ask_user tự trả lời phương án đầu).
// Gọi thẳng id model (không qua task) để đo từng model của chuỗi; ghi chất lượng từng bước (ok / lenient / failed).
import { writeFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { DEFAULT_LIMITS, askUserTool, CHAT_CAPABILITY, kbSearchTool, runAgentLoop, type AgentEvent, type AskAnswer, type AgentLoopState } from "../src/agent";
import { type Db, MIGRATIONS_DIR } from "../src/db/client";
import { addMember, createOrg, ensureUser } from "../src/db/repo";
import * as schema from "../src/db/schema";
import { createAi } from "../src/services/ai";
import { createKbService } from "../src/tutor/kb";

const PAGES = [
  "Bài 3. Những hằng đẳng thức đáng nhớ\n\nBình phương của một tổng. Với hai số a và b bất kì, ta có (a+b)^2 = a^2 + 2ab + b^2. Bình phương của một tổng bằng bình phương số thứ nhất, cộng hai lần tích số thứ nhất với số thứ hai, cộng bình phương số thứ hai.\n\nVí dụ: (x+3)^2 = x^2 + 6x + 9.",
  "Hiệu hai bình phương. Với hai số a và b, ta có a^2 - b^2 = (a-b)(a+b). Hiệu hai bình phương bằng tích của tổng hai số với hiệu của chúng.\n\nVí dụ: x^2 - 9 = (x-3)(x+3). Học sinh hay nhầm giữa bình phương của một hiệu và hiệu hai bình phương.",
  "Lập phương của một tổng. Với hai số a và b, (a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3. Công thức này dùng để khai triển các biểu thức có dạng lập phương và rút gọn đa thức bậc ba.",
];
const PROMPTS = [
  { id: "tra-kho", text: "Theo tài liệu của lớp, hiệu hai bình phương được phát biểu thế nào? Cho em ví dụ trong sách." },
  { id: "tra-kho-2", text: "Trong tài liệu, công thức lập phương của một tổng là gì và dùng để làm gì?" },
  { id: "khong-cong-cu", text: "2 + 3 bằng mấy ạ?" },
  { id: "ask-user", text: "Giải giúp em bài này với." },
  { id: "nhieu-buoc", text: "So sánh bình phương của một tổng và hiệu hai bình phương theo tài liệu, rồi cho em một bài tập tự luyện." },
];

const url = process.env.GATEWAY_URL ?? "http://127.0.0.1:4340";
const token = process.env.GATEWAY_TOKEN;
if (!token) throw new Error("Thiếu GATEWAY_TOKEN");
const models = (process.env.MODELS ?? "claude-sonnet-5-5-low,gemini-3.8-flash-low").split(",");
const repeat = Number(process.env.REPEAT ?? 1);

async function main() {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: MIGRATIONS_DIR });
  const u = await ensureUser(db, { sub: "bench", name: "Bench" });
  const org = await createOrg(db, "Trường thử", u.id);
  await addMember(db, org.id, u.id, "owner").catch(() => {});
  const actor = { orgId: org.id, userId: u.id, role: "owner" as const };
  const kb = createKbService(db);
  const k = await kb.create(actor, { name: "Toán 8", subject: "Toán", grade: 8 });
  await kb.addDocument(actor, k.id, { name: "toan8-hang-dang-thuc.txt", text: PAGES.join("\n\f\n") });
  const tools = [kbSearchTool(kb), askUserTool];

  const rows: Record<string, unknown>[] = [];
  for (const model of models) {
    // Thay "task:…" bằng id model để đo đúng từng model của chuỗi.
    const ai = createAi({ url, token }, (input, init) => {
      const body = JSON.parse(String(init?.body));
      body.model = model;
      return fetch(input, { ...init, body: JSON.stringify(body) });
    });
    for (let r = 0; r < repeat; r++)
      for (const p of PROMPTS) {
        const events: AgentEvent[] = [];
        const t0 = Date.now();
        let firstToken = 0;
        const emit = (e: AgentEvent) => {
          if (!firstToken && (e.type === "content" || e.type === "thinking")) firstToken = Date.now() - t0;
          events.push(e);
        };
        const ctl = new AbortController();
        const deps = { ai, task: CHAT_CAPABILITY.task, tools, limits: DEFAULT_LIMITS, actor, turnId: "bench", params: {}, signal: ctl.signal, emit };
        const input = { system: CHAT_CAPABILITY.system, history: [], user: { role: "user" as const, content: p.text } };
        let o = await runAgentLoop(deps, input).catch((e: Error) => ({ status: "error", answer: "", error: e.message, state: null as unknown as AgentLoopState }));
        let asked = false;
        if (o.status === "waiting" && o.state?.pending) {
          asked = true;
          const answers: AskAnswer[] = o.state.pending.questions.map((q) => (q.options[0] ? { id: q.id, selected: [q.options[0].label] } : { id: q.id, selected: [], other: "Phân tích đa thức x^2 - 9 thành nhân tử" }));
          o = await runAgentLoop(deps, { ...input, resume: { state: o.state, answers } }).catch((e: Error) => ({ status: "error", answer: "", error: e.message, state: o.state }));
        }
        const usage = o.state?.usage;
        const used = events.filter((e) => e.type === "tool_call").map((e) => (e as { tool: string }).tool);
        const row = { model, prompt: p.id, run: r, status: o.status, error: (o as { error?: string }).error, ms: Date.now() - t0, firstTokenMs: firstToken, steps: usage?.steps, parse: usage?.parse, tools: used, asked, sources: o.state?.sources?.length ?? 0, answer: o.answer.slice(0, 240) };
        rows.push(row);
        console.log(JSON.stringify({ model, prompt: p.id, status: o.status, error: row.error, ms: row.ms, steps: usage?.steps, parse: usage?.parse, tools: used, asked, answer: o.answer.slice(0, 90).replace(/\n/g, " ") }));
      }
  }
  // Tổng hợp theo model.
  const summary = models.map((m) => {
    const rs = rows.filter((r) => r.model === m);
    const p = rs.reduce<{ ok: number; lenient: number; failed: number }>((a, r) => {
      const q = r.parse as { ok: number; lenient: number; failed: number } | undefined;
      return q ? { ok: a.ok + q.ok, lenient: a.lenient + q.lenient, failed: a.failed + q.failed } : a;
    }, { ok: 0, lenient: 0, failed: 0 });
    const total = p.ok + p.lenient + p.failed;
    return { model: m, turns: rs.length, done: rs.filter((r) => r.status === "done").length, steps: total, ...p, parsedRate: total ? (p.ok + p.lenient) / total : 0, strictRate: total ? p.ok / total : 0, medianMs: median(rs.map((r) => r.ms as number)), medianFirstTokenMs: median(rs.map((r) => r.firstTokenMs as number)) };
  });
  console.log("\nTỔNG HỢP");
  console.table(summary);
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ rows, summary }, null, 2));
}
const median = (xs: number[]) => {
  const s = xs.filter((x) => x > 0).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};
main().then(
  () => process.exit(0),
  (e) => (console.error(e), process.exit(1)),
);
