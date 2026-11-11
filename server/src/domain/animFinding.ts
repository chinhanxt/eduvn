/** Lỗi lint/QA của Studio hoạt hình (hợp đồng docs/anim-studio/finding.md). Thuần, không I/O. */

export type Severity = "error" | "warning" | "info";
export type FindingSource = "lint" | "preprocess" | "check" | "eduvn" | "video";

export type Finding = {
  code: string;
  severity: Severity;
  source: FindingSource;
  message: string;
  fix: string;
  selector?: string;
  line?: number;
  col?: number;
  t?: number;
  bbox?: { x: number; y: number; w: number; h: number };
  measured?: string | number;
  expected?: string | number;
  suggested?: string;
};

export type QaReport = {
  ok: boolean;
  findings: Finding[];
  ms: { lint?: number; preprocess?: number; check?: number; eduvn?: number; render?: number; video?: number };
  peakMemBytes?: number;
  frames?: string[];
};

export const hasErrors = (fs: Finding[]) => fs.some((f) => f.severity === "error");

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** Rút gọn cho lượt sửa: bỏ trùng (code, selector|line), error trước, tối đa `max`, cắt message. */
export function compactForRepair(fs: Finding[], max = 12): Omit<Finding, "bbox">[] {
  const seen = new Set<string>();
  const out: Omit<Finding, "bbox">[] = [];
  for (const f of [...fs].filter((x) => x.severity !== "info").sort((a, b) => RANK[a.severity] - RANK[b.severity])) {
    const key = `${f.code}|${f.selector ?? f.line ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { bbox: _b, ...rest } = f;
    out.push({ ...rest, message: f.message.slice(0, 160) });
    if (out.length >= max) break;
  }
  return out;
}

/** Danh sách lỗi dạng chữ cho prompt sửa (một dòng mỗi lỗi). */
export function findingsText(fs: Finding[], max = 12): string {
  return compactForRepair(fs, max)
    .map((f, i) => {
      const where = f.selector ? ` [${f.selector}]` : f.line ? ` [dòng ${f.line}]` : "";
      const at = f.t !== undefined ? ` @${f.t}s` : "";
      const m = f.measured !== undefined ? ` đo=${f.measured}` : "";
      const e = f.expected !== undefined ? ` cần=${f.expected}` : "";
      const s = f.suggested ? ` gợi ý=${f.suggested}` : "";
      return `${i + 1}. ${f.code}${where}${at}: ${f.message}${m}${e}${s}. ${f.fix}`;
    })
    .join("\n");
}
