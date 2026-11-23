/**
 * Prompt AI soạn câu hỏi đặc thù Ngữ văn & chấm nghị luận theo rubric (dùng lại P7 `gradePrompt` + P8 rubric).
 * Task cổng AI: khai báo trong `gateway/tasks.d/van.json` (`van_soan_cau_hoi`, `van_cham_nghi_luan`).
 */
import { type EssayResult, gradePrompt } from "../../domain/essay";
import type { Ai } from "../../services/ai";
import {
  type DocHieuSet,
  DocHieuSetSchema,
  type LiteratureRubric,
  type OutlineOrderQuestion,
  OutlineOrderQuestionSchema,
  RHETORICAL_DEVICES,
  RHETORICAL_DEVICE_LABEL,
  type RhetoricalQuestion,
  RhetoricalQuestionSchema,
  formatRubricText,
  normalizeLiteratureEssay,
} from "./questions";
import { type QuoteVerificationResult, verifyQuotesInText } from "./quoteVerify";

export function buildDocHieuPrompt(p: {
  grade: number;
  topic: string;
  title: string;
  author: string;
  source: string;
  genre: "tho" | "truyen" | "nghi_luan" | "ky" | "kich";
  excerpt: string;
}): string {
  return [
    `Soạn bộ 4 câu hỏi ĐỌC HIỂU Ngữ văn lớp ${p.grade} theo đúng 4 mức nhận thức CTGDPT 2018: NB (Nhận biết) → TH (Thông hiểu) → VD (Vận dụng) → VDC (Vận dụng cao).`,
    `Chủ đề: ${p.topic}. Tác phẩm: ${p.title} (${p.author}, nguồn: ${p.source}).`,
    `# Đoạn trích nguyên văn (KHÔNG tự sửa hoặc bịa thêm câu ngoài đoạn trích này)\n${p.excerpt}`,
    [
      "Quy tắc bắt buộc:",
      "1. Câu 1 (NB, format='mcq'): hỏi phương thức biểu đạt / thể thơ / chi tiết trực tiếp trong đoạn trích (4 phương án khác nhau rõ rệt).",
      "2. Câu 2 (TH, format='mcq' hoặc 'short_answer'): hỏi ý nghĩa hình ảnh hoặc tác dụng biện pháp tu từ có thật trong đoạn trích.",
      "3. Câu 3 (VD, format='short_answer'): yêu cầu rút ra nhận xét, thái độ tác giả hoặc liên hệ ngắn gọn.",
      "4. Câu 4 (VDC, format='essay', points=2): viết đoạn văn nghị luận (~150–200 chữ) kèm rubric 4 tiêu chí, tổng điểm đúng 2, bước 0,25.",
      'Trả về DUY NHẤT JSON: {"grade":số,"topic":chuỗi,"passage":{"title","author","source","genre","copyrightStatus":"short_excerpt","excerpt"},"items":[...]}.',
    ].join("\n"),
  ].join("\n\n");
}

export function buildRhetoricalQuestionPrompt(p: {
  grade: number;
  topic: string;
  author: string;
  source: string;
  excerpt: string;
}): string {
  const list = RHETORICAL_DEVICES.map((d) => `${d} (${RHETORICAL_DEVICE_LABEL[d]})`).join(", ");
  return [
    `Soạn 1 câu hỏi NHẬN DIỆN BIỆN PHÁP TU TỪ cho Ngữ văn lớp ${p.grade} dựa đúng vào đoạn trích dưới đây.`,
    `# Đoạn trích (${p.author}, ${p.source})\n${p.excerpt}`,
    `Danh sách mã biện pháp hợp lệ: ${list}.`,
    'Trả về DUY NHẤT JSON: {"grade":số,"topic":chuỗi,"level":"TH","excerpt":chuỗi,"targetPhrase":"cụm từ trích nguyên văn","author":chuỗi,"source":chuỗi,"device":"mã_đúng","distractors":["mã1","mã2","mã3"],"effectExplanation":"phân tích ngắn gọn 2-3 câu tác dụng nghệ thuật + nội dung"}.',
  ].join("\n\n");
}

export function buildOutlineOrderPrompt(p: { grade: number; topic: string; essayPrompt: string }): string {
  return [
    `Soạn 1 câu hỏi SẮP XẾP DÀN Ý NGHỊ LUẬN cho Ngữ văn lớp ${p.grade}, chủ đề "${p.topic}".`,
    `Đề bài nghị luận: ${p.essayPrompt}`,
    "Tạo đúng 4–5 ý ngắn gọn (mỗi ý 1 câu ≤ 25 từ) theo trình tự logic: luận đề (luan_de) → giải thích/luận điểm 1 (giai_thich/luan_diem) → luận cứ/bằng chứng (luan_cu) → phản đề hoặc luận điểm 2 → kết luận (ket_luan).",
    'Trả về DUY NHẤT JSON: {"grade":số,"topic":chuỗi,"level":"VD","prompt":chuỗi,"steps":[{"id":"s1","role":"luan_de","text":"..."},...],"explanation":"vì sao trình tự này chặt chẽ"}.',
  ].join("\n\n");
}

export function buildLiteratureGradePrompt(p: {
  question: string;
  reference?: string;
  rubric: LiteratureRubric | string;
  maxPoints: number;
  essayText: string;
  sourceText?: string | null;
}): { prompt: string; quoteCheck: QuoteVerificationResult } {
  const quoteCheck = verifyQuotesInText(p.essayText, p.sourceText);
  const rubricText = typeof p.rubric === "string" ? p.rubric : formatRubricText(p.rubric);
  const base = gradePrompt({
    question: p.question,
    reference: p.reference ?? "",
    rubric: rubricText,
    maxPoints: p.maxPoints,
    transcript: p.essayText,
  });
  const quoteNote = `\n\n# Kết quả tự kiểm tất định trích dẫn (KHÔNG được tự thay đổi trạng thái này)\nTrạng thái: ${quoteCheck.badge}. ${quoteCheck.summary}`;
  return { prompt: base + quoteNote, quoteCheck };
}

function parseJsonBlock(raw: string): unknown {
  const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  return JSON.parse((m ? m[1]! : raw).trim());
}

/** Gọi cổng AI soạn bộ đọc hiểu 4 mức (có fallback qua `AI_TASK_OVERRIDES` nếu gateway chưa nạp tasks.d). */
export async function draftDocHieuSet(
  ai: Ai,
  req: Parameters<typeof buildDocHieuPrompt>[0],
): Promise<DocHieuSet> {
  const out = await ai.chat({
    task: "van_soan_cau_hoi",
    messages: [{ role: "user", content: buildDocHieuPrompt(req) }],
  });
  return DocHieuSetSchema.parse(parseJsonBlock(out.text));
}

export async function draftRhetoricalQuestion(
  ai: Ai,
  req: Parameters<typeof buildRhetoricalQuestionPrompt>[0],
): Promise<RhetoricalQuestion> {
  const out = await ai.chat({
    task: "van_soan_cau_hoi",
    messages: [{ role: "user", content: buildRhetoricalQuestionPrompt(req) }],
  });
  return RhetoricalQuestionSchema.parse(parseJsonBlock(out.text));
}

export async function draftOutlineOrderQuestion(
  ai: Ai,
  req: Parameters<typeof buildOutlineOrderPrompt>[0],
): Promise<OutlineOrderQuestion> {
  const out = await ai.chat({
    task: "van_soan_cau_hoi",
    messages: [{ role: "user", content: buildOutlineOrderPrompt(req) }],
  });
  return OutlineOrderQuestionSchema.parse(parseJsonBlock(out.text));
}

/** Chấm đoạn/bài văn nghị luận qua AI theo rubric + đính kèm kết quả tự kiểm trích dẫn tất định. */
export async function gradeLiteratureEssay(
  ai: Ai,
  req: Parameters<typeof buildLiteratureGradePrompt>[0],
): Promise<{ grading: EssayResult; quoteCheck: QuoteVerificationResult }> {
  const { prompt, quoteCheck } = buildLiteratureGradePrompt(req);
  const out = await ai.chat({
    task: "van_cham_nghi_luan",
    messages: [{ role: "user", content: prompt }],
  });
  const grading = normalizeLiteratureEssay(parseJsonBlock(out.text), req.maxPoints);
  return { grading, quoteCheck };
}
