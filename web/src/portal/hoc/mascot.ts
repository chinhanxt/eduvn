// Linh vật "Mầm" của cổng Học: chọn tâm trạng + câu nói theo tình huống (thuần, có test).

export type Mood = "chao" | "khen" | "dong-vien" | "chuoi";

/** Tâm trạng theo điểm thang 10: ≥ 8 khen, < 5 động viên, còn lại chào (null = chưa có điểm). */
export function moodForScore(score10: number | null): Mood {
  if (score10 === null) return "chao";
  if (score10 >= 8) return "khen";
  if (score10 < 5) return "dong-vien";
  return "chao";
}

/** Câu nói ngắn của Mầm. `name` = tên gọi của em (xem `givenName`). */
export function mascotLine(mood: Mood, o: { name?: string; streak?: number; left?: number } = {}): string {
  const em = o.name ? `, ${o.name}` : "";
  if (mood === "khen") return `Giỏi quá${em}!`;
  if (mood === "dong-vien") return "Sai là để học — mình thử lại nhé!";
  if (mood === "chuoi") return `${o.streak ?? 0} ngày liên tiếp rồi${em}!`;
  if (o.left !== undefined) return o.left > 0 ? `Còn ${o.left} bài cần làm${em}.` : `Xong hết bài rồi${em}!`;
  return `Chào em${em}!`;
}

/** Tên đệm chỉ giới tính, không gọi kèm tên ("Nguyễn Thị Hồng" → "Hồng"). */
const PLAIN_MIDDLE = new Set(["thị", "văn"]);
/**
 * Gọi tên thân mật theo kiểu Việt: tên đệm + tên ("Nguyễn Minh Anh" → "Minh Anh", "Trần Khánh Duy" → "Khánh Duy"),
 * trừ tên đệm Thị/Văn chỉ gọi tên ("Trần Văn Tư" → "Tư"). Họ tên 1–2 chữ giữ nguyên.
 */
export const givenName = (fullName: string | null | undefined): string => {
  const w = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (w.length <= 2) return w.join(" ");
  const mid = w[w.length - 2]!;
  return PLAIN_MIDDLE.has(mid.toLocaleLowerCase("vi")) ? w[w.length - 1]! : w.slice(-2).join(" ");
};
