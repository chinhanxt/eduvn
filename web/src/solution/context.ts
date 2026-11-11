// web/src/solution/context.ts — phần thuần (có test): ngữ cảnh gửi gia sư khi HS bấm "Chưa hiểu bước này".
import type { Solution } from "./types";

/** Lời nhắn gửi gia sư khi HS bấm "Chưa hiểu bước này": đề + các bước trước + bước đang vướng. */
export function stuckMessage(s: Pick<Solution, "problem" | "steps">, index: number): string {
  const prev = s.steps.slice(0, index).map((st, i) => `Bước ${i + 1} — ${st.title}: ${st.body}`).join("\n");
  const cur = s.steps[index]!;
  return `Em đang xem lời giải bài sau và chưa hiểu bước ${index + 1}.\n\nĐề bài:\n${s.problem}\n\n${prev ? `Các bước trước:\n${prev}\n\n` : ""}Bước em chưa hiểu — Bước ${index + 1}: ${cur.title}\n${cur.body}\n\nThầy/cô gợi ý từng chút để em tự hiểu bước này (vì sao làm vậy, dùng kiến thức gì), đừng giải lại cả bài nhé.`;
}

/** Lệnh LaTeX bắt đầu bằng "\n" — không được hiểu nhầm là xuống dòng. */
const N_CMDS = /^(?:ne|neq|nabla|natural|nu|ni|not|notin|neg|nexists|nleq|ngeq|nless|ngtr|nmid|nparallel|nsubseteq|nsupseteq|newline|nolimits|normalsize|nearrow|nwarrow|nleftarrow|nrightarrow|nLeftarrow|nRightarrow|nleftrightarrow|nLeftrightarrow|ncong|nsim|nprec|nsucc|ntriangleleft|ntriangleright)(?![A-Za-z])/;

/** Model hay escape thừa: chuỗi chứa "\n" hai ký tự (vd `$y'=0$:\n$$3x^2…$$`) thay vì xuống dòng thật → đổi thành xuống dòng,
 *  trừ khi đó là lệnh LaTeX (\neq, \nabla, \notin…). */
export function fixEscapes(s: string): string {
  return s.replace(/\\n/g, (m, at: number, all: string) => (all[at - 1] === "\\" || N_CMDS.test(all.slice(at + 1)) ? m : "\n"));
}

/** Công thức → chữ đọc được (thẻ meta/OG, mô tả, máy quét): $\frac{a}{b}$ → a/b, \sqrt{2} → √2, \int_1^e → ∫(1→e)… */
export function texToText(s: string): string {
  let t = fixEscapes(s).replace(/\$\$?([^$]*)\$\$?/g, (_, m: string) => {
    let x = m;
    for (let k = 0; k < 3; k++) x = x.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
    return x
      .replace(/\((\w+)\)\//g, "$1/")
      .replace(/\/\((\w+)\)/g, "/$1")
      .replace(/√\((\w+)\)/g, "√$1")
      .replace(/\\int_\{?([^}\s^]+)\}?\^\{?([^}\s]+)\}?/g, "∫[$1→$2]")
      .replace(/\\(displaystyle|left|right|limits|,|;|!|quad)/g, " ")
      .replace(/\\cdot|\\times/g, "·")
      .replace(/\\(le|leq)\b/g, "≤").replace(/\\(ge|geq)\b/g, "≥").replace(/\\(ne|neq)\b/g, "≠")
      .replace(/\\perp/g, "⊥").replace(/\\pi/g, "π").replace(/\\infty/g, "∞").replace(/\\in\b/g, "∈")
      .replace(/\\(ln|log|sin|cos|tan|int|lim)/g, "$1 ").replace(/\\circ/g, "°")
      .replace(/\^\{?2\}?/g, "²").replace(/\^\{?3\}?/g, "³")
      .replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "");
  });
  t = t.replace(/[*_#`>]/g, "").replace(/\s+/g, " ").trim();
  return t.replace(/\s+([.,;:)])/g, "$1");
}
