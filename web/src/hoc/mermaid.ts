// Đọc tập con Mermaid (flowchart/graph và mindmap) mà khối figure của giáo trình sinh ra → nút + nối cho bộ vẽ sơ đồ P10.
// Thuần (không DOM) để test được; không chạy mã nào của AI, chỉ đọc nhãn và quan hệ.
import type { Shape } from "../diagram/types";

export type MNode = { id: string; label: string; parent?: string | null; shape?: Shape };
export type MLink = { from: string; to: string; label?: string; dashed?: boolean };
export type MGraph = { kind: "flow" | "mind"; nodes: MNode[]; links: MLink[] };

/** [mở, đóng, hình] — thứ tự: dấu dài trước dấu ngắn. */
const BRACKETS: [string, string, Shape][] = [
  ["(((", ")))", "ellipse"],
  ["((", "))", "ellipse"],
  ["([", "])", "pill"],
  ["[[", "]]", "rect"],
  ["[(", ")]", "rect"],
  ["[/", "/]", "parallelogram"],
  ["[\\", "\\]", "parallelogram"],
  ["[/", "\\]", "parallelogram"],
  ["{{", "}}", "rect"],
  ["[", "]", "rect"],
  ["(", ")", "round"],
  ["{", "}", "diamond"],
  [">", "]", "rect"],
];

/** Nhãn Mermaid → chữ: bỏ nháy, <br> thành xuống dòng, thực thể #quot; &amp;… */
export function cleanLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/^`([\s\S]*)`$/, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/#quot;/g, '"')
    .replace(/#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

const ID = /^[\p{L}\p{N}_][\p{L}\p{N}_.-]*/u;

/** Đọc một nút tại `s` (đã bỏ khoảng trắng đầu): id + hình/nhãn tuỳ chọn. */
function readNode(s: string): { id: string; label?: string; shape?: Shape; rest: string } | null {
  const m = ID.exec(s);
  if (!m) return null;
  // id kết thúc bằng "-" có thể là đầu mũi tên ("A-->B"): trả lại dấu "-"
  let id = m[0];
  while (id.endsWith("-") || id.endsWith(".")) id = id.slice(0, -1);
  let rest = s.slice(id.length);
  for (const [open, close, shape] of BRACKETS) {
    if (!rest.startsWith(open)) continue;
    const body = rest.slice(open.length);
    let end: number;
    if (body.trimStart().startsWith('"')) {
      const q0 = body.indexOf('"');
      const q1 = body.indexOf('"', q0 + 1);
      end = q1 < 0 ? -1 : body.indexOf(close, q1 + 1);
    } else end = body.indexOf(close);
    if (end < 0) continue;
    return { id, label: cleanLabel(body.slice(0, end)), shape, rest: body.slice(end + close.length) };
  }
  rest = rest.replace(/^:::[\w-]+/, "");
  return { id, rest };
}

/** Đọc mũi tên tại `s`: trả nhãn (nếu có), nét đứt, phần còn lại; không phải mũi tên → null. */
function readEdge(s: string): { label?: string; dashed: boolean; rest: string } | null {
  const t = s.trimStart();
  // dạng có nhãn giữa: "-- chữ -->", "-. chữ .->", "== chữ ==>"
  const mid = /^(--|-\.|==)\s*([^-.=>|][^>]*?)\s*(-->|---|\.->|\.-|==>|===)/.exec(t);
  if (mid) return { label: cleanLabel(mid[2]!), dashed: mid[1] === "-.", rest: t.slice(mid[0].length) };
  const op = /^(<?-{2,}>|<?-{3,}|<?-\.+->|-\.+-|<?={2,}>|={3,}|--[ox]|<-->)/.exec(t);
  if (!op) return null;
  let rest = t.slice(op[0].length);
  let label: string | undefined;
  const pipe = /^\s*\|([^|]*)\|/.exec(rest);
  if (pipe) {
    label = cleanLabel(pipe[1]!);
    rest = rest.slice(pipe[0].length);
  }
  return { label: label || undefined, dashed: op[0].includes("."), rest };
}

function parseFlow(lines: string[]): MGraph | null {
  const nodes = new Map<string, MNode>();
  const links: MLink[] = [];
  let pending: { label?: string; dashed: boolean } = { dashed: false };
  const touch = (n: { id: string; label?: string; shape?: Shape }) => {
    const cur = nodes.get(n.id);
    if (!cur) nodes.set(n.id, { id: n.id, label: n.label || n.id, ...(n.shape && { shape: n.shape }) });
    else if (n.label) Object.assign(cur, { label: n.label, ...(n.shape && { shape: n.shape }) });
  };
  for (const raw of lines) {
    for (const stmt of raw.split(";")) {
      let s = stmt.trim();
      if (!s || /^(%%|classDef\b|class\b|style\b|linkStyle\b|click\b|subgraph\b|end\b|direction\b)/.test(s)) continue;
      // một câu: nhóm nút (A & B) (mũi tên nhóm nút)*
      let left: string[] = [];
      for (;;) {
        const group: string[] = [];
        for (;;) {
          const n = readNode(s.trimStart());
          if (!n) break;
          touch(n);
          group.push(n.id);
          s = n.rest.trimStart();
          if (s.startsWith("&")) {
            s = s.slice(1);
            continue;
          }
          break;
        }
        if (!group.length) break;
        for (const a of left) for (const b of group) links.push({ from: a, to: b, ...(pending.label && { label: pending.label }), ...(pending.dashed && { dashed: true }) });
        const e = readEdge(s);
        if (!e) break;
        pending = { label: e.label, dashed: e.dashed };
        left = group;
        s = e.rest;
      }
      pending = { dashed: false };
    }
  }
  if (nodes.size === 0) return null;
  return { kind: "flow", nodes: [...nodes.values()], links };
}
function parseMind(lines: string[]): MGraph | null {
  const nodes: MNode[] = [];
  const stack: { indent: number; id: string }[] = [];
  let k = 0;
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith("%%") || /^\s*::icon\(/.test(raw)) continue;
    const indent = raw.length - raw.trimStart().length;
    const text = raw.trim();
    const n = readNode(text);
    let label = text;
    let shape: Shape | undefined;
    // "id(nhãn)" chỉ khi cả dòng là một nút; "P(A|B)" là chữ thường
    if (n?.label !== undefined && !n.rest.trim() && !(/^\p{Lu}$/u.test(n.id) && text[1] === "(")) {
      label = n.label;
      shape = n.shape;
    } else {
      const bare = BRACKETS.find(([o, c]) => text.startsWith(o) && text.endsWith(c));
      if (bare) {
        label = cleanLabel(text.slice(bare[0].length, text.length - bare[1].length));
        shape = bare[2];
      } else label = cleanLabel(text);
    }
    while (stack.length && stack[stack.length - 1]!.indent >= indent) stack.pop();
    const id = `m${k++}`;
    const parent = stack.length ? stack[stack.length - 1]!.id : null;
    if (!parent && nodes.length) continue; // chỉ một gốc
    nodes.push({ id, label: label || "…", parent, ...(shape && { shape: shape === "rect" ? "round" : shape }) });
    stack.push({ indent, id });
  }
  return nodes.length ? { kind: "mind", nodes, links: [] } : null;
}

/** Mermaid → đồ thị; kiểu không hỗ trợ (sequenceDiagram, pie…) hoặc không đọc được → null. */
export function parseMermaid(code: string): MGraph | null {
  const lines = code.replace(/\r\n?/g, "\n").split("\n").filter((l) => !/^\s*%%/.test(l));
  const head = lines.findIndex((l) => l.trim());
  if (head < 0) return null;
  const first = lines[head]!.trim();
  try {
    if (/^(flowchart|graph)\b/i.test(first)) {
      const rest = first.replace(/^(flowchart|graph)\s*(TD|TB|BT|LR|RL)?\s*;?/i, "");
      return parseFlow([rest, ...lines.slice(head + 1)]);
    }
    if (/^mindmap\b/i.test(first)) return parseMind(lines.slice(head + 1));
  } catch {
    return null;
  }
  return null;
}
