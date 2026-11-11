// server/src/domain/essay.ts
/** Chấm tự luận viết tay (P7b): lời nhắc 2 bước + chuẩn hoá điểm theo thang. Thuần, không I/O.
 *  Tách 2 bước (phiên âm → GV sửa → chấm) vì phần lớn lỗi chấm bằng AI-vision đến từ phiên âm sai. */
import { z } from "zod";
import { round2 } from "./scoring";

export const Criterion = z.object({
  name: z.string().trim().min(1).max(200),
  max: z.number().min(0).max(100),
  points: z.number().min(0).max(100),
  comment: z.string().max(2000).default(""),
});
export const EssayGrading = z.object({ criteria: z.array(Criterion).min(1).max(20), comment: z.string().max(4000).default("") });
export type EssayGrading = z.infer<typeof EssayGrading>;
export type EssayResult = EssayGrading & { total: number; max: number };

/** Ép thang: tổng `max` các tiêu chí = maxPoints, mỗi điểm ≤ max tiêu chí, làm tròn 0,01. */
export function normalizeEssay(raw: unknown, maxPoints: number): EssayResult {
  const g = EssayGrading.parse(raw);
  const sum = g.criteria.reduce((s, c) => s + c.max, 0);
  const k = sum > 0 ? maxPoints / sum : 1;
  const criteria = g.criteria.map((c) => {
    const max = round2(c.max * k);
    return { ...c, max, points: Math.min(max, round2(c.points * k)) };
  });
  const total = round2(Math.min(maxPoints, criteria.reduce((s, c) => s + c.points, 0)));
  return { criteria, comment: g.comment, total, max: maxPoints };
}

export const TRANSCRIBE_SYSTEM =
  "Bạn phiên âm bài làm viết tay của học sinh Việt Nam từ ảnh. Chép LẠI ĐÚNG những gì học sinh viết, giữ nguyên lỗi chính tả/sai kiến thức, " +
  "KHÔNG sửa, KHÔNG chấm, KHÔNG thêm lời bình. Giữ xuống dòng như bài làm. Công thức/biểu thức toán viết bằng LaTeX trong $…$ (hoặc $$…$$ nếu đứng riêng dòng). " +
  "Chữ không đọc được ghi [?]. Nhiều ảnh = nhiều trang theo thứ tự, ngăn bằng dòng ---. Chỉ trả về văn bản bài làm.";

export function gradePrompt(p: { question: string; reference: string; rubric: string; maxPoints: number; transcript: string }): string {
  return [
    "Chấm bài tự luận của học sinh theo ĐÚNG rubric. Chỉ dựa vào đáp án mẫu và rubric, không tự thêm tiêu chí.",
    `Thang điểm tối đa: ${p.maxPoints}.`,
    `# Đề bài\n${p.question}`,
    `# Đáp án mẫu\n${p.reference || "(không có)"}`,
    `# Rubric / biểu điểm\n${p.rubric}`,
    `# Bài làm của học sinh (đã được giáo viên rà soát)\n${p.transcript}`,
    'Trả về DUY NHẤT một JSON: {"criteria":[{"name":"tên tiêu chí","max":số,"points":số,"comment":"nhận xét ngắn, cụ thể"}],"comment":"nhận xét chung 1-2 câu"}. ' +
      `Tổng max các tiêu chí = ${p.maxPoints}; points từng tiêu chí từ 0 đến max; bước chấm 0,25. Nhận xét tiếng Việt, nêu điểm đúng trước, chỗ thiếu sau.`,
  ].join("\n\n");
}
