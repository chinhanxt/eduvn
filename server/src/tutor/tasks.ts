import type { Ai } from "../services/ai";

/** Tên tác vụ cổng AI mà gia sư dùng. `gia_su_phu` và `gia_su_luyen` là tác vụ mới (gateway/tasks.json). */
export const TASK = {
  chat: "gia_su_chat",
  aux: "gia_su_phu",
  learn: "gia_su_luyen",
  question: "sinh_cau_hoi",
  grade: "cham_tu_luan",
  book: "giao_trinh_chuong",
} as const;

/** Ánh xạ tạm tên tác vụ (vd cổng đang chạy chưa biết tác vụ mới): AI_TASK_OVERRIDES='{"gia_su_phu":"loi_giang"}'. */
export function parseOverrides(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function withTaskOverrides(ai: Ai, map: Record<string, string>): Ai {
  if (!Object.keys(map).length) return ai;
  const m = (t: string) => map[t] ?? t;
  return { chat: (t, msgs, o) => ai.chat(m(t), msgs, o), stream: (t, msgs, o) => ai.stream(m(t), msgs, o) };
}

/** Điền {biến} vào mẫu prompt; không diễn giải ký tự `$` trong giá trị (công thức LaTeX). */
export function fill(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{([A-Za-z]\w*)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
