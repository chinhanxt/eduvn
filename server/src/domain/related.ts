import { toPlainText } from "./mathText";
import type { StoredQuestion } from "./question";

const STOP = new Set(["của", "và", "là", "các", "cho", "có", "một", "những", "được", "với", "trong", "theo", "sau", "đây", "nào", "bằng", "thì", "này", "khi", "hãy", "tính", "tìm", "biết", "câu", "hỏi", "đúng", "sai", "gì", "bởi", "qua"]);

/** Tập từ (âm tiết) chữ thường ≥ 2 ký tự, bỏ từ dừng. */
export function words(s: string): Set<string> {
  return new Set(
    s
      .normalize("NFC")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 2 && !STOP.has(w)),
  );
}

function questionText(q: StoredQuestion): string {
  const parts = [q.topic, q.stem, ...q.tags];
  if (q.type === "mcq") parts.push(...q.options);
  if (q.type === "true_false") parts.push(...q.statements);
  return toPlainText(parts.join(" "));
}

/** Điểm = 3 nếu đúng chủ đề + số từ khoá trùng. Điểm 0 bị bỏ; hoà điểm thì câu mới hơn (đứng sau trong pool) trước. */
export function rankRelated(pool: StoredQuestion[], ctx: { topic?: string; text?: string; exclude?: string[] }, limit: number): StoredQuestion[] {
  const topic = ctx.topic?.normalize("NFC").trim().toLowerCase() ?? "";
  const kw = words(`${ctx.topic ?? ""} ${ctx.text ?? ""}`);
  const skip = new Set(ctx.exclude ?? []);
  return pool
    .map((q, idx) => {
      if (skip.has(q.id)) return { q, idx, score: 0 };
      const qw = words(questionText(q));
      let hit = 0;
      for (const w of kw) if (qw.has(w)) hit++;
      const score = (topic && q.topic.toLowerCase() === topic ? 3 : 0) + hit;
      return { q, idx, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.idx - a.idx)
    .slice(0, limit)
    .map((s) => s.q);
}
