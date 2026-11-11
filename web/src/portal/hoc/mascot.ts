// Linh vật "Mầm" của cổng Học: chọn tâm trạng + câu nói theo tình huống (thuần, có test).

export type Mood = "chao" | "khen" | "dong-vien" | "chuoi";

/** Tâm trạng theo điểm thang 10: ≥ 8 khen, < 5 động viên, còn lại chào (null = chưa có điểm). */
export function moodForScore(score10: number | null): Mood {
  if (score10 === null) return "chao";
  if (score10 >= 8) return "khen";
  if (score10 < 5) return "dong-vien";
  return "chao";
}

/** Câu nói ngắn của Mầm. `name` = tên gọi của em (chữ cuối họ tên). */
export function mascotLine(mood: Mood, o: { name?: string; streak?: number; left?: number } = {}): string {
  const em = o.name ? `, ${o.name}` : "";
  if (mood === "khen") return `Giỏi quá${em}!`;
  if (mood === "dong-vien") return "Sai là để học — mình thử lại nhé!";
  if (mood === "chuoi") return `${o.streak ?? 0} ngày liên tiếp rồi${em}!`;
  if (o.left !== undefined) return o.left > 0 ? `Còn ${o.left} bài cần làm${em}.` : `Xong hết bài rồi${em}!`;
  return `Chào em${em}!`;
}

/** Gọi tên thân mật: chữ cuối họ tên ("Nguyễn Minh Anh" → "Anh"). */
export const givenName = (fullName: string | null | undefined): string => (fullName ?? "").trim().split(/\s+/).pop() ?? "";
