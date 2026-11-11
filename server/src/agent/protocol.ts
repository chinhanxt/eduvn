// Giao thức nhãn văn bản cho vòng tác tử: model chỉ viết chữ, mỗi lần trả lời là một bước gồm các khối
//   THINK: …            suy nghĩ ngắn (hiện ở khối "đang suy nghĩ")
//   TOOL: {"name": …, "args": {…}}   yêu cầu EDUVN chạy công cụ (có thể nhiều khối liên tiếp → chạy song song)
//   ANSWER: …           câu trả lời cuối (Markdown + LaTeX)
// Cổng AI không cần tool-calling gốc. Ý tưởng nhãn lấy từ DeepTutor deeptutor/agents/research (THINK/TOOL/APPEND/FINISH,
// Apache-2.0) và đường lùi `supports_tools=false`; bộ tách viết mới, chịu được các lệch thường gặp (in đậm, rào ```, thiếu nhãn).
import { z } from "zod";
import type { AgentTool } from "./types";

export type Label = "THINK" | "TOOL" | "ANSWER";
type SegLabel = Label | "PRE";
type Segment = { label: SegLabel; text: string };

export type ToolCallDraft = { name: string; args: unknown; raw: string; repaired: boolean } | { name?: string; args?: undefined; raw: string; error: string };
export type StepQuality = "ok" | "lenient" | "failed";
export type ParsedStep = {
  thinking: string;
  calls: ToolCallDraft[];
  /** null = bước này không trả lời (gọi công cụ hoặc hỏng). */
  answer: string | null;
  quality: StepQuality;
  issues: string[];
  /** Bản chuẩn hoá của bước để đưa lại vào hội thoại (giữ model trong giao thức). */
  normalized: string;
};

const DECOR_OPEN = "[*_#>`\\[<(]*";
const DECOR_CLOSE = "[*_`\\]>)]*";
const NAMES = "THINK|TOOL|ANSWER|FINISH";
const LABEL_COLON = new RegExp(`^\\s{0,4}${DECOR_OPEN}\\s*(${NAMES})\\s*${DECOR_CLOSE}\\s*[:：]\\s*(?:\\*\\*|__)?\\s*`);
const LABEL_COLON_ANYCASE = new RegExp(LABEL_COLON.source, "i");
const LABEL_ALONE = new RegExp(`^\\s{0,4}${DECOR_OPEN}\\s*(${NAMES})\\s*${DECOR_CLOSE}\\s*$`);
const PARTIAL_WORD = new RegExp(`^\\s{0,4}${DECOR_OPEN}\\s*([A-Za-z]{0,8})$`);
const PARTIAL_FULL = new RegExp(`^\\s{0,4}${DECOR_OPEN}\\s*(${NAMES})\\s*${DECOR_CLOSE}\\s*$`, "i");
const OBSERVATION = /^\s*[*_#>`[]*\s*OBSERVATION\b/i;
const LABELS = ["THINK", "TOOL", "ANSWER", "FINISH"];

const toLabel = (s: string): Label => {
  const u = s.toUpperCase();
  return u === "FINISH" ? "ANSWER" : (u as Label);
};

/** Dòng dở dang còn có thể thành nhãn → giữ lại chờ thêm chữ (vài ký tự, không làm chậm stream). */
function couldBeLabel(partial: string): boolean {
  if (partial.length > 40) return false;
  if (PARTIAL_FULL.test(partial)) return true;
  const m = PARTIAL_WORD.exec(partial);
  if (!m) return false;
  const w = m[1]!.toUpperCase();
  return LABELS.some((l) => l.startsWith(w));
}

export type StepStreamEvent = { kind: "thinking" | "content"; text: string };

/**
 * Tách một bước khi model đang stream: phát dần chữ THINK (thinking) và ANSWER (content) ra ngoài,
 * giữ lại khối TOOL. `onStop` được gọi khi model viết tiếp sau khối TOOL (bịa kết quả) → nơi gọi nên ngắt stream.
 */
export class StepParser {
  private segs: Segment[] = [{ label: "PRE", text: "" }];
  private line = "";
  private lineState: "undecided" | "text" | "labeled" = "undecided";
  private contentStart = 0;
  private emitted = 0;
  private segBegun = false;
  private sawTool = false;
  private afterTool = false;
  stopped = false;

  constructor(
    private readonly onEvent: (e: StepStreamEvent) => void = () => {},
    private readonly onStop: () => void = () => {},
  ) {}

  private get cur(): Segment {
    return this.segs[this.segs.length - 1]!;
  }

  private emitKind(): StepStreamEvent["kind"] | null {
    const l = this.cur.label;
    if (l === "THINK") return "thinking";
    if (l === "ANSWER" && !this.afterTool) return "content";
    return null;
  }

  private emit(text: string): void {
    const kind = this.emitKind();
    if (!kind || !text) return;
    let t = text;
    if (!this.segBegun) {
      t = t.replace(/^\s+/, "");
      if (!t) return;
      this.segBegun = true;
    }
    this.onEvent({ kind, text: t });
  }

  private stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.onStop();
  }

  private open(label: Label): void {
    const pre = this.segs[0]!;
    if (this.segs.length === 1 && pre.text.trim()) {
      // Chữ trước nhãn đầu tiên = suy nghĩ.
      this.onEvent({ kind: "thinking", text: pre.text.trim() + "\n" });
    }
    if (label !== "TOOL" && this.sawTool) {
      this.afterTool = true;
      this.stop();
    }
    if (label === "TOOL") this.sawTool = true;
    this.segs.push({ label, text: "" });
    this.segBegun = false;
  }

  private matchLabel(s: string, complete: boolean): RegExpExecArray | null {
    const re = this.segs.length === 1 ? LABEL_COLON_ANYCASE : LABEL_COLON;
    return re.exec(s) ?? (complete ? LABEL_ALONE.exec(s) : null);
  }

  private decide(complete: boolean): void {
    if (this.lineState !== "undecided") return;
    if (this.sawTool && OBSERVATION.test(this.line)) {
      this.afterTool = true;
      this.stop();
    }
    const m = this.matchLabel(this.line, complete);
    if (m) {
      this.open(toLabel(m[1]!));
      this.lineState = "labeled";
      this.contentStart = m[0].length;
      return;
    }
    if (!complete && couldBeLabel(this.line)) return;
    this.lineState = "text";
    this.contentStart = 0;
  }

  feed(chunk: string): void {
    if (this.stopped) return;
    let rest = chunk;
    while (rest) {
      const nl = rest.indexOf("\n");
      if (nl < 0) {
        this.line += rest;
        rest = "";
        this.decide(false);
        if (this.lineState !== "undecided") {
          const content = this.line.slice(this.contentStart);
          if (this.cur.label !== "PRE") this.emit(content.slice(this.emitted));
          this.emitted = content.length;
        }
      } else {
        this.line += rest.slice(0, nl);
        rest = rest.slice(nl + 1);
        this.finishLine(true);
        if (this.stopped) return;
      }
    }
  }

  private finishLine(withNewline: boolean): void {
    this.decide(true);
    const content = this.line.slice(this.contentStart);
    const nl = withNewline ? "\n" : "";
    if (this.cur.label !== "PRE") this.emit(content.slice(this.emitted) + nl);
    this.cur.text += content + nl;
    this.line = "";
    this.lineState = "undecided";
    this.contentStart = 0;
    this.emitted = 0;
  }

  /** Kết thúc stream → phân tích cả bước. */
  end(): ParsedStep {
    if (this.line) this.finishLine(false);
    return analyze(this.segs, this.afterTool);
  }
}

const stripFences = (s: string) =>
  s
    .replace(/^\s*```[\w-]*\s*$/gm, "")
    .replace(/\s+$/, "")
    .replace(/^\s+/, "");

/** Bóc JSON công cụ: chịu rào ```json, chữ thừa, tên khoá khác (tool/arguments/input), tên viết trước dấu {. */
export function parseToolJson(text: string): ToolCallDraft {
  const raw = text.trim();
  let repaired = false;
  const body = stripFences(raw);
  if (body !== raw) repaired = true;
  const a = body.indexOf("{");
  if (a < 0) {
    const bare = /^([a-z][a-z0-9_]*)\s*$/.exec(body);
    if (bare) return { name: bare[1]!, args: {}, raw, repaired: true };
    return { raw, error: "Khối TOOL không có JSON" };
  }
  let depth = 0;
  let inStr = false;
  let esc = false;
  let b = -1;
  for (let i = a; i < body.length; i++) {
    const c = body[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      b = i;
      break;
    }
  }
  if (b < 0) return { raw, error: "JSON của TOOL chưa đóng ngoặc" };
  if (body.slice(b + 1).trim()) repaired = true;
  const prefix = body.slice(0, a).trim();
  let obj: unknown;
  const src = body.slice(a, b + 1);
  try {
    obj = JSON.parse(src);
  } catch {
    try {
      obj = JSON.parse(src.replace(/,\s*([}\]])/g, "$1"));
      repaired = true;
    } catch {
      return { raw, error: "JSON của TOOL không hợp lệ" };
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { raw, error: "JSON của TOOL phải là một đối tượng" };
  const o = obj as Record<string, unknown>;
  const nameKey = ["name", "tool", "tool_name"].find((k) => typeof o[k] === "string");
  const argKey = ["args", "arguments", "input", "parameters", "params"].find((k) => o[k] !== undefined);
  let name = nameKey ? (o[nameKey] as string) : undefined;
  let args: unknown = argKey ? o[argKey] : undefined;
  if (nameKey && nameKey !== "name") repaired = true;
  if (argKey && argKey !== "args") repaired = true;
  if (!name && /^[a-z][a-z0-9_]*$/.test(prefix)) {
    // `tra_kho {"q": …}` → tên trước dấu {, cả đối tượng là tham số.
    name = prefix;
    args = o;
    repaired = true;
  } else if (prefix) repaired = true;
  if (!name) return { raw, error: 'JSON của TOOL thiếu "name"' };
  if (args === undefined) {
    const { [nameKey!]: _n, ...restArgs } = o;
    args = restArgs;
    if (Object.keys(restArgs).length) repaired = true;
  }
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
      repaired = true;
    } catch {
      return { name, raw, error: "args phải là đối tượng JSON" };
    }
  }
  return { name, args: args ?? {}, raw, repaired };
}

function analyze(segs: Segment[], afterTool: boolean): ParsedStep {
  const issues: string[] = [];
  const labeled = segs.slice(1);
  const pre = segs[0]!.text.trim();
  const think = [pre, ...labeled.filter((s) => s.label === "THINK").map((s) => s.text.trim())].filter(Boolean).join("\n");
  if (!labeled.length) {
    const text = stripFences(pre);
    if (!text) return { thinking: "", calls: [], answer: null, quality: "failed", issues: ["Trả lời rỗng"], normalized: "" };
    return { thinking: "", calls: [], answer: text, quality: "lenient", issues: ["Thiếu nhãn — coi cả bài là ANSWER"], normalized: `ANSWER: ${text}` };
  }
  const toolSegs = labeled.filter((s) => s.label === "TOOL");
  const answerSegs = labeled.filter((s) => s.label === "ANSWER");
  const thinkLine = think ? `THINK: ${think}\n` : "";
  if (toolSegs.length) {
    const calls = toolSegs.map((s) => parseToolJson(s.text));
    if (afterTool) issues.push("Viết tiếp sau khối TOOL — đã bỏ phần sau");
    else if (answerSegs.length) issues.push("Có cả ANSWER và TOOL — chạy công cụ trước");
    const good = calls.filter((c): c is Extract<ToolCallDraft, { repaired: boolean }> => !("error" in c));
    for (const c of calls) if ("error" in c) issues.push(c.error);
    if (good.some((c) => c.repaired)) issues.push("JSON của TOOL phải sửa nhẹ");
    const quality: StepQuality = !good.length ? "failed" : issues.length || pre ? "lenient" : "ok";
    const normalized = thinkLine + good.map((c) => `TOOL: ${JSON.stringify({ name: c.name, args: c.args })}`).join("\n");
    return { thinking: think, calls, answer: null, quality, issues, normalized: normalized || thinkLine.trim() };
  }
  const answer = stripFences(answerSegs.map((s) => s.text).join("\n"));
  if (!answer) {
    issues.push(answerSegs.length ? "ANSWER rỗng" : "Chỉ có THINK, thiếu TOOL hoặc ANSWER");
    return { thinking: think, calls: [], answer: null, quality: "failed", issues, normalized: thinkLine.trim() };
  }
  if (pre) issues.push("Có chữ trước nhãn đầu");
  return { thinking: think, calls: [], answer, quality: issues.length ? "lenient" : "ok", issues, normalized: `${thinkLine}ANSWER: ${answer}` };
}

/** Phân tích nguyên một câu trả lời (không stream). */
export function parseStep(text: string): ParsedStep {
  const p = new StepParser();
  p.feed(text);
  return p.end();
}

// ---------------- prompt ----------------

/** Tham số công cụ dạng JSON Schema rút gọn (bỏ $schema, additionalProperties) cho prompt. */
export function argsSchema(t: AgentTool): string {
  let s: Record<string, unknown>;
  try {
    s = z.toJSONSchema(t.input, { unrepresentable: "any" }) as Record<string, unknown>;
  } catch {
    return "{}";
  }
  const clean = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(clean);
    if (!v || typeof v !== "object") return v;
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (k !== "$schema" && k !== "additionalProperties") out[k] = clean(x);
    return out;
  };
  return JSON.stringify(clean(s));
}

export function protocolPrompt(tools: AgentTool[], opts: { maxParallel: number }): string {
  const list = tools.map((t) => `- ${t.name}: ${t.description}\n  args: ${argsSchema(t)}`).join("\n");
  const example = tools.find((t) => t.name !== "ask_user");
  return [
    "## Cách làm việc (giao thức bước của EDUVN)",
    "Bạn làm việc theo từng bước. Mỗi lần trả lời là MỘT bước gồm các khối; mỗi khối mở đầu bằng một nhãn viết HOA ở đầu dòng:",
    "THINK: suy nghĩ ngắn, 1–3 câu (người học thấy ở mục \"đang suy nghĩ\"). Không bắt buộc.",
    `TOOL: {"name": "<tên công cụ>", "args": {…}} — một dòng JSON hợp lệ, nhờ hệ thống EDUVN chạy công cụ. Tối đa ${opts.maxParallel} khối TOOL liên tiếp trong một bước (chạy song song).`,
    "ANSWER: câu trả lời cuối cho người học (Markdown, công thức LaTeX trong $…$).",
    "",
    "Quy tắc:",
    "- Mỗi bước kết thúc bằng TOOL hoặc ANSWER. Viết xong khối TOOL thì DỪNG NGAY; kết quả sẽ đến ở tin sau, mở đầu bằng OBSERVATION.",
    "- Không tự viết OBSERVATION, không đoán kết quả công cụ.",
    "- Bạn chỉ viết văn bản; chính hệ thống EDUVN đọc khối TOOL và chạy công cụ, bạn không tự chạy gì.",
    "- Câu hỏi đơn giản, đã đủ dữ kiện: viết ANSWER ngay, không cần công cụ.",
    "",
    tools.length ? "Công cụ có sẵn:" : "Lượt này không có công cụ: chỉ dùng THINK và ANSWER.",
    list,
    "",
    "Ví dụ một bước gọi công cụ:",
    "THINK: Cần xem tài liệu của lớp trước khi giải thích.",
    example ? `TOOL: {"name": "${example.name}", "args": {…}}` : 'TOOL: {"name": "ask_user", "args": {"questions": [{"prompt": "Em đang học lớp mấy?", "options": [{"label": "Lớp 8"}, {"label": "Lớp 9"}]}]}}',
    "",
    "Ví dụ bước cuối:",
    "ANSWER: Bình phương của một tổng: $(a+b)^2 = a^2 + 2ab + b^2$ …",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export const REPAIR_TEXT = (issues: string[]) =>
  `Bước vừa rồi chưa đúng giao thức (${issues.join("; ")}). Viết lại bước này: dòng đầu là "THINK:", "TOOL:" hoặc "ANSWER:"; khối TOOL là JSON {"name": …, "args": {…}} đúng tên công cụ trong danh sách.`;

export const FORCE_FINISH_TEXT = "Đã khám phá đủ (hết ngân sách bước/thời gian/token). Không gọi công cụ nữa: viết ngay ANSWER bằng những gì đã có; chỗ nào chưa chắc thì nói rõ.";
