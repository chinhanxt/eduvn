#!/usr/bin/env node
// Chạy evals của skills/*/evals/evals.json qua cổng AI thật, chấm bằng LLM-judge (task giam_khao), in bảng điểm.
// Dùng: node scripts/eval-skills.mjs [--skill tên] [--limit n] [--out file.json] [--judge-task giam_khao]
// Env: GATEWAY_URL (mặc định http://127.0.0.1:4340), GATEWAY_TOKEN (hoặc --env-file chứa dòng GATEWAY_TOKEN=…),
//      AI_TASK_OVERRIDES='{"nhan_xet_hs":"giam_khao"}' khi cổng đang chạy chưa có task mới.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const only = opt("skill");
const limit = Number(opt("limit", "0")) || Infinity;
const judgeTask = opt("judge-task", "giam_khao");
const out = opt("out", `/tmp/p8-eval-${Date.now()}.json`);
const skillsDir = process.env.SKILLS_DIR ?? path.join(root, "skills");

function token() {
  if (process.env.GATEWAY_TOKEN) return process.env.GATEWAY_TOKEN;
  const f = opt("env-file");
  if (f && existsSync(f)) {
    const m = /^GATEWAY_TOKEN=(.+)$/m.exec(readFileSync(f, "utf8"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("Thiếu GATEWAY_TOKEN (đặt env hoặc --env-file)");
}
const url = (process.env.GATEWAY_URL ?? "http://127.0.0.1:4340").replace(/\/+$/, "");
const TOKEN = token();
const overrides = process.env.AI_TASK_OVERRIDES ? JSON.parse(process.env.AI_TASK_OVERRIDES) : {};

async function chat(task, messages, json = true) {
  const model = `task:${overrides[task] ?? task}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ model, messages, stream: false, ...(json && { response_format: { type: "json_object" } }) }),
    }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e) } }) }));
    if (res.ok) return (await res.json()).choices?.[0]?.message?.content ?? "";
    const body = await res.json().catch(() => null);
    if (attempt < 2 && (res.status === 429 || res.status >= 500 || res.status === 0)) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      continue;
    }
    throw new Error(`Cổng AI ${res.status}: ${body?.error?.message ?? "lỗi"}`);
  }
}

function skillPrompt(dir) {
  const raw = readFileSync(path.join(dir, "SKILL.md"), "utf8");
  const body = (/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/.exec(raw)?.[1] ?? raw).trim();
  const refDir = path.join(dir, "references");
  const refs = existsSync(refDir)
    ? readdirSync(refDir).filter((f) => f.endsWith(".md")).sort().map((f) => `## Tài liệu tham chiếu: references/${f}\n\n${readFileSync(path.join(refDir, f), "utf8").trim()}`)
    : [];
  return [body, ...refs].join("\n\n");
}

const extractJson = (s) => {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(s);
  const t = (fenced?.[1] ?? s).trim();
  try { return JSON.parse(t); } catch {
    const a = t.search(/[[{]/), b = t.lastIndexOf(t[a] === "[" ? "]" : "}");
    if (a < 0 || b <= a) return undefined;
    try { return JSON.parse(t.slice(a, b + 1)); } catch { return undefined; }
  }
};

const JUDGE_SYSTEM = `Bạn là giám khảo nghiêm khắc kiểm chất lượng sản phẩm AI cho giáo viên Việt Nam. Bạn nhận: yêu cầu đầu vào, đầu ra của AI và danh sách tiêu chí. Với MỖI tiêu chí, xét đầu ra thật kĩ (tự tính lại số liệu, tự kiểm kiến thức chuyên môn) rồi mới kết luận. Với mỗi tiêu chí viết "note" TRƯỚC (phân tích ngắn gọn, nêu bằng chứng cụ thể trong đầu ra) rồi "pass" SAU cùng, và "pass" phải khớp kết luận trong "note" (note nói đạt thì pass=true). Chỉ trả JSON: {"results":[{"criterion":"nguyên văn tiêu chí","note":"phân tích ngắn","pass":true}]} với đúng số tiêu chí và đúng thứ tự đã cho.`;

async function judge(input, output, criteria) {
  const user = `YÊU CẦU ĐẦU VÀO:\n${input}\n\nĐẦU RA CỦA AI:\n${output}\n\nTIÊU CHÍ (${criteria.length}):\n${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
  const raw = await chat(judgeTask, [{ role: "system", content: JUDGE_SYSTEM }, { role: "user", content: user }]);
  const j = extractJson(raw);
  const results = Array.isArray(j?.results) ? j.results : [];
  return criteria.map((c, i) => ({ criterion: c, pass: results[i]?.pass === true, note: String(results[i]?.note ?? (results[i] ? "" : "giám khảo không trả kết quả")) }));
}

const names = readdirSync(skillsDir).filter((n) => existsSync(path.join(skillsDir, n, "evals", "evals.json")) && (!only || n === only)).sort();
if (names.length === 0) throw new Error(`Không có skill khớp trong ${skillsDir}`);

const report = [];
for (const name of names) {
  const dir = path.join(skillsDir, name);
  const ev = JSON.parse(readFileSync(path.join(dir, "evals", "evals.json"), "utf8"));
  const system = skillPrompt(dir);
  for (const c of ev.cases.slice(0, limit)) {
    const t0 = Date.now();
    const row = { skill: name, id: c.id, jsonOk: false, pass: 0, total: 0, details: [], error: null, ms: 0, output: "" };
    try {
      const output = await chat(ev.task, [{ role: "system", content: system }, { role: "user", content: c.input }]);
      row.output = output;
      row.jsonOk = extractJson(output) !== undefined;
      const criteria = [...(ev.common ?? []), ...c.criteria];
      row.details = await judge(c.input, output, criteria);
      row.pass = row.details.filter((d) => d.pass).length + (row.jsonOk ? 1 : 0);
      row.total = criteria.length + 1;
    } catch (e) {
      row.error = String(e.message ?? e);
    }
    row.ms = Date.now() - t0;
    report.push(row);
    console.log(`${name.padEnd(22)} ${c.id.padEnd(24)} ${row.error ? `LỖI ${row.error}` : `${row.pass}/${row.total}`.padStart(6)}  ${(row.ms / 1000).toFixed(0)}s`);
  }
}

console.log("\n=== BẢNG ĐIỂM (điểm = tiêu chí đạt / tổng, gồm 1 tiêu chí cơ học 'JSON hợp lệ') ===");
console.log("skill".padEnd(24) + "ca".padStart(4) + "đạt/tổng".padStart(11) + "điểm/10".padStart(9));
for (const name of names) {
  const rows = report.filter((r) => r.skill === name && !r.error);
  const pass = rows.reduce((a, r) => a + r.pass, 0), total = rows.reduce((a, r) => a + r.total, 0);
  const errs = report.filter((r) => r.skill === name && r.error).length;
  console.log(name.padEnd(24) + String(rows.length + errs).padStart(4) + `${pass}/${total}`.padStart(11) + (total ? ((pass / total) * 10).toFixed(1) : "—").padStart(9) + (errs ? `  (${errs} ca lỗi)` : ""));
}
const fails = report.flatMap((r) => r.details.filter((d) => !d.pass).map((d) => `- ${r.skill}/${r.id}: ${d.criterion} → ${d.note}`));
if (fails.length) console.log(`\nTiêu chí chưa đạt (${fails.length}):\n${fails.join("\n")}`);
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\nChi tiết (kèm đầu ra AI): ${out}`);
