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
  | { kind: "math"; tex: string; /** Trích dẫn [n] viết ngay sau công thức trên cùng dòng. */ after?: string }
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
    // $$ giữa dòng: phần chữ trước nó là một dòng riêng, công thức khối bắt đầu ở dòng sau
    const dd = line.indexOf("$$");
    if (dd > 0 && line.slice(0, dd).trim() && !/^\s*\|/.test(line)) {
      lines.splice(i, 1, line.slice(0, dd).trimEnd(), line.slice(dd));
      continue;
    }
    if (line.trim().startsWith("$$")) {
      flush();
      const first = line.trim().slice(2);
      const tex: string[] = [];
      let rest = "";
      let close = first.indexOf("$$");
      if (close >= 0) {
        tex.push(first.slice(0, close));
        rest = first.slice(close + 2);
        i++;
      } else {
        tex.push(first);
        i++;
        while (i < lines.length && !lines[i]!.includes("$$")) tex.push(lines[i++]!);
        if (i < lines.length) {
          close = lines[i]!.indexOf("$$");
          tex.push(lines[i]!.slice(0, close));
          rest = lines[i]!.slice(close + 2);
          i++;
        }
      }
      // chữ sau dấu đóng $$: chỉ là trích dẫn [n] thì đi kèm công thức, còn lại xử lý như một dòng mới (không bị nuốt vào công thức)
      const cite = /^\s*((?:\[\d{1,2}\]\s*)+)([.,;:]?)\s*$/.exec(rest);
      out.push({ kind: "math", tex: tex.join("\n").trim(), ...(cite && { after: cite[1]!.trim() }) });
      if (rest.trim() && !cite) lines.splice(i, 0, rest.trim());
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

/** Tách **đậm**, `mã` và trích dẫn [n] (chỉ những số có trong danh sách hợp lệ); công thức $…$ giữ nguyên cho MathText (dấu * trong công thức không thành chữ nghiêng). */
export function parseInline(src: string, validCites: readonly number[]): Inline[] {
  const out: Inline[] = [];
  const re = /(\$[^$\n]+\$)|\*\*([^*]+)\*\*|`([^`]+)`|\[(\d{1,2})\]|\*([^*\s][^*]*)\*/g;
  let last = 0;
  for (const m of src.matchAll(re)) {
    const at = m.index!;
    if (m[1] !== undefined) continue;
    if (m[4] !== undefined && !validCites.includes(Number(m[4]))) continue;
    if (at > last) out.push({ kind: "text", text: src.slice(last, at) });
    if (m[2] !== undefined) out.push({ kind: "bold", text: m[2] });
    else if (m[3] !== undefined) out.push({ kind: "code", text: m[3] });
    else if (m[5] !== undefined) out.push({ kind: "em", text: m[5] });
    else out.push({ kind: "cite", text: m[0], n: Number(m[4]) });
    last = at + m[0].length;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}

/** Nội dung hộp nhấn: bỏ nhãn AI tự thêm ở đầu ("**Lỗi thường gặp:**", "Lưu ý:") vì hộp đã có nhãn riêng. */
export function calloutBody(md: string): string {
  const src = md.trim();
  const out = src
    .replace(/^\*\*[^*\n]{1,40}?:\*\*\s*|^\*\*[^*\n]{1,40}?\*\*\s*:\s*/, "")
    .replace(/^(?:Lỗi (?:hay|thường) gặp|Lưu ý|Mẹo|Ý chính|Ghi nhớ|Liên hệ|Hiểu sâu hơn|Cảnh báo)\s*:\s*/iu, "")
    .trim();
  // bỏ nhãn thì câu còn lại viết hoa chữ đầu
  return out !== src ? out.replace(/^\p{Ll}/u, (c) => c.toUpperCase()) : out;
}
