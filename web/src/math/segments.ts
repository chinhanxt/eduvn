/** Cùng quy ước với server/src/domain/mathText.ts: chữ + LaTeX trong $…$, \$ = dấu đô la thường. */
export type Segment = { kind: "text" | "math"; value: string };

export function splitMath(s: string): Segment[] {
  const out: Segment[] = [];
  let buf = "";
  let inMath = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "\\") {
      let n = 1;
      while (s[i + n] === "\\") n++;
      if (s[i + n] !== "$") {
        buf += "\\".repeat(n);
        i += n - 1;
      } else if (n % 2 === 1) {
        // số lẻ dấu \ trước $: $ là dấu đô la thường; trong chữ mỗi cặp \\ là một dấu \ thường
        buf += inMath ? "\\".repeat(n - 1) + "\\$" : "\\".repeat((n - 1) / 2) + "$";
        i += n;
      } else {
        // số chẵn: $ là dấu mở/đóng công thức; trong chữ mỗi cặp \\ là một dấu \ thường
        buf += "\\".repeat(inMath ? n : n / 2);
        i += n - 1;
      }
      continue;
    }
    if (ch === "$") {
      if (inMath) {
        const v = buf.trim();
        if (v) out.push({ kind: "math", value: v });
      } else if (buf) out.push({ kind: "text", value: buf });
      buf = "";
      inMath = !inMath;
      continue;
    }
    buf += ch;
  }
  if (inMath) out.push({ kind: "text", value: `$${buf}` });
  else if (buf) out.push({ kind: "text", value: buf });
  return out;
}

/** Mã hoá chữ thường: dãy \ đứng ngay trước $ được nhân đôi, $ thành \$; beforeMath: chữ đứng ngay trước công thức. */
export const escapeText = (t: string, beforeMath = false): string => {
  const e = t.replace(/(\\*)\$/g, (_m, bs: string) => bs + bs + "\\$");
  return beforeMath ? e.replace(/(\\+)$/, (_m, bs: string) => bs + bs) : e;
};

export const joinSegments = (segs: Segment[]): string =>
  segs.map((s, i) => (s.kind === "text" ? escapeText(s.value, segs[i + 1]?.kind === "math") : `$${s.value}$`)).join("");

const UNSAFE = /\\(href|url|html\w*|class|cssId|style|data|includegraphics)(?![A-Za-z])/;
export const isSafeLatex = (l: string): boolean => !UNSAFE.test(l);
