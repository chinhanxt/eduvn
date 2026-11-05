export const SCALES = ["TT22", "TT27"] as const;
export type Scale = (typeof SCALES)[number];

export const LEVELS: Record<Scale, readonly string[]> = {
  TT22: ["Tốt", "Khá", "Đạt", "Chưa đạt"],
  TT27: ["Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"],
};

export const TERMS = ["HK1", "HK2"] as const;
export type Term = (typeof TERMS)[number];

export const COMMENT_MIN = 20;
export const COMMENT_MAX = 400;

/** Lỗi nhận xét (rỗng = hợp lệ). */
export function validateComment(scale: Scale, text: string, level: string): string[] {
  const errors: string[] = [];
  const t = text.trim();
  if (t === "") errors.push("nhận xét đang để trống");
  else if (t.length < COMMENT_MIN) errors.push(`nhận xét quá ngắn (${t.length} ký tự, cần ${COMMENT_MIN}–${COMMENT_MAX})`);
  else if (t.length > COMMENT_MAX) errors.push(`nhận xét quá dài (${t.length} ký tự, tối đa ${COMMENT_MAX})`);
  if (!LEVELS[scale].includes(level)) errors.push(`mức "${level}" không hợp lệ theo ${scale}, chọn một trong: ${LEVELS[scale].join(" / ")}`);
  return errors;
}
