// Phần thuần của khu /hoc (có test): đọc SSE, tách khối Markdown, tách trích dẫn [n].

/** Tách các sự kiện SSE hoàn chỉnh khỏi bộ đệm; trả phần dư chưa trọn. */
export function parseSse(buf: string): { events: Record<string, unknown>[]; rest: string } {
  const parts = buf.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: Record<string, unknown>[] = [];
  for (const p of parts) {
    const line = p.split("\n").find((l) => l.startsWith("data: "));
    if (!line) continue;
    try {
      events.push(JSON.parse(line.slice(6)) as Record<string, unknown>);
    } catch {
      // bỏ sự kiện hỏng
    }
  }
  return { events, rest };
}

export type Block =
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; lang: string; code: string }
  | { kind: "math"; tex: string }
  | { kind: "hr" }
  | { kind: "quote"; text: string }
  | { kind: "table"; head: string[]; rows: string[][] };

/** Markdown tối giản đủ cho câu trả lời gia sư và trang giáo trình. */
export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  const para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    para.length = 0;
  };
  while (i < lines.length) {
    const line = lines[i]!;
    const fence = /^```\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) code.push(lines[i++]!);
      i++;
      out.push({ kind: "code", lang: fence[1] ?? "", code: code.join("\n") });
      continue;
    }
    if (line.trim().startsWith("$$")) {
      flush();
      let body = line.trim().slice(2);
      if (body.endsWith("$$") && body.length >= 2) {
        out.push({ kind: "math", tex: body.slice(0, -2).trim() });
        i++;
        continue;
      }
      i++;
      const tex = [body];
      while (i < lines.length && !lines[i]!.includes("$$")) tex.push(lines[i++]!);
      if (i < lines.length) tex.push(lines[i]!.slice(0, lines[i]!.indexOf("$$")));
      i++;
      body = tex.join("\n").trim();
      out.push({ kind: "math", tex: body });
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush();
      out.push({ kind: "hr" });
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      flush();
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) q.push(lines[i++]!.replace(/^\s*>\s?/, ""));
      out.push({ kind: "quote", text: q.join(" ") });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1]!)) {
      flush();
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) rows.push(cells(lines[i++]!));
      out.push({ kind: "table", head, rows });
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      out.push({ kind: "h", level: h[1]!.length as 1 | 2 | 3, text: h[2]! });
      i++;
      continue;
    }
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flush();
      const items: string[] = [];
      const re = ul ? /^\s*[-*•]\s+(.*)$/ : /^\s*\d+[.)]\s+(.*)$/;
      while (i < lines.length && re.test(lines[i]!)) items.push(re.exec(lines[i++]!)![1]!);
      out.push({ kind: ul ? "ul" : "ol", items });
      continue;
    }
    if (!line.trim()) flush();
    else para.push(line.trim());
    i++;
  }
  flush();
  return out;
}

export type Inline = { kind: "text" | "bold" | "em" | "cite" | "code"; text: string; n?: number };

/** Tách **đậm**, `mã` và trích dẫn [n] (chỉ những số có trong danh sách hợp lệ); công thức $…$ để MathText xử lý. */
export function parseInline(src: string, validCites: readonly number[]): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[(\d{1,2})\]|\*([^*\s][^*]*)\*/g;
  let last = 0;
  for (const m of src.matchAll(re)) {
    const at = m.index!;
    if (m[3] !== undefined && !validCites.includes(Number(m[3]))) continue;
    if (at > last) out.push({ kind: "text", text: src.slice(last, at) });
    if (m[1] !== undefined) out.push({ kind: "bold", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "code", text: m[2] });
    else if (m[4] !== undefined) out.push({ kind: "em", text: m[4] });
    else out.push({ kind: "cite", text: m[0], n: Number(m[3]) });
    last = at + m[0].length;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}
