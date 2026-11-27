// Kiểm nhanh một file dữ liệu demo: pnpm --filter @eduvn/server exec tsx scripts/demo-data/check.ts scripts/demo-data/<file>.ts
// In số lượng và mọi lỗi (câu hỏi sai schema, giáo án thiếu mục, slide quá dài, văn bản sai thể thức, lời giải sai…).
import path from "node:path";
import { validateLessonPlan } from "../../src/domain/lesson";
import { QuestionInput } from "../../src/domain/question";
import { validateDeck } from "../../src/domain/slides";
import { parseSolution } from "../../src/domain/solution";
import { validateVanBan } from "../../src/domain/vanban";
import { verifySolution } from "../../src/domain/verify";
import type { DQ, DTopic } from "./types";

export function toQuestion(t: Pick<DTopic, "subject" | "grade" | "topic">, q: DQ) {
  const base = { subject: t.subject, grade: t.grade, topic: t.topic, level: q.lv, stem: q.stem, tags: [], ...(q.explanation ? { explanation: q.explanation } : {}) };
  switch (q.t) {
    case "mcq":
      return { ...base, type: "mcq" as const, options: q.options, answer: q.answer };
    case "tf":
      return { ...base, type: "true_false" as const, statements: q.statements, answer: q.answer };
    case "short":
      return { ...base, type: "short_answer" as const, answer: q.answer };
    case "essay":
      return { ...base, type: "essay" as const, rubric: q.rubric, points: q.points };
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const file = path.resolve(process.argv[2] ?? "");
  const mod = (await import(file)) as Record<string, unknown>;
  const issues: string[] = [];
  const counts: Record<string, number> = {};
  const add = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
  for (const [name, val] of Object.entries(mod)) {
    if (!Array.isArray(val)) continue;
    for (const [i, x] of val.entries()) {
      const at = `${name}[${i}]`;
      const o = x as Record<string, unknown>;
      if (Array.isArray(o.qs)) {
        const t = o as unknown as DTopic;
        add("chủ đề");
        for (const [j, q] of t.qs.entries()) {
          const r = QuestionInput.safeParse(toQuestion(t, q));
          add(`câu ${q.t}`);
          if (!r.success) issues.push(`${at} ${t.topic} câu ${j + 1}: ${r.error.issues.map((e) => e.message).join("; ")}`);
          if (q.t === "mcq" && new Set(q.options).size !== 4) issues.push(`${at} ${t.topic} câu ${j + 1}: phương án trùng`);
        }
      } else if (o.plan) {
        add("giáo án");
        const r = validateLessonPlan(o.plan);
        if (!r.ok) issues.push(`${at}: ${r.issues.join("; ")}`);
      } else if (o.deck) {
        add("slide");
        const r = validateDeck(o.deck);
        if (!r.ok) issues.push(`${at}: ${r.issues.join("; ")}`);
      } else if (o.input && o.daysAgo !== undefined) {
        add("văn bản");
        const r = validateVanBan(o.input);
        if (!r.ok) issues.push(`${at}: ${r.issues.join("; ")}`);
      } else if (o.solution) {
        add("lời giải");
        const r = parseSolution(o.solution);
        if (!r.ok) issues.push(`${at}: ${r.issues.join("; ")}`);
        else {
          const v = verifySolution(r.solution);
          add(`lời giải ${v.status}`);
          if (v.status === "mismatch") issues.push(`${at}: phép kiểm lệch ${JSON.stringify(v.details.filter((d) => d.ok === false))}`);
        }
      } else if (Array.isArray(o.scenes)) add("bài giảng AI");
      else if (o.root || (o.nodes && o.edges)) add("sơ đồ");
      else if (Array.isArray(o.pages) && o.subject && !o.docs) add(o.blocks === undefined && (o.pages as { lines?: unknown }[])[0]?.lines ? "bảng giảng" : "giáo trình");
      else if (Array.isArray(o.docs)) add("kho tri thức");
      else if (Array.isArray(o.messages)) add("phiên gia sư");
      else if (Array.isArray(o.modules)) add("lộ trình");
      else add(`khác (${name})`);
    }
  }
  console.log(JSON.stringify(counts));
  if (issues.length) {
    console.log(`${issues.length} lỗi:\n${issues.join("\n")}`);
    process.exit(1);
  }
  console.log("OK");
}
