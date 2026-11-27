// Kiểu dữ liệu soạn sẵn cho server demo (scripts/serve-demo-v2.ts). Nội dung tĩnh, tiếng Việt chuẩn, không gọi AI.
import type { LessonPlan } from "../../src/domain/lesson";
import type { Level } from "../../src/domain/question";
import type { SlideDeck } from "../../src/domain/slides";
import type { KnowledgeType } from "../../src/domain/tutorLearning";
import type { BookBlock } from "../../src/db/schema";

/** Mã GV trong thế giới mẫu (docs/demo/the-gioi-mau.md). GV khác do script tự sinh. */
export type TeacherKey =
  | "ha" // Lê Thu Hà · Toán · GVCN 10A1 · tổ Toán – Tin (GV đăng nhập demo)
  | "thu" // Đinh Hoài Thu · Toán · tổ Toán – Tin
  | "tam" // Lương Văn Tâm · Toán · tổ Toán – Tin
  | "ngoc" // Hồ Bích Ngọc · Tin học · tổ Toán – Tin
  | "khai" // TS. Đặng Văn Khải · Lập trình (ĐH) · GVCN KTPM K23
  | "bao-gv" // Nguyễn Quốc Bảo · Ngữ văn · tổ trưởng tổ Ngữ văn · GVCN 11A3
  | "mai" // Đỗ Thị Mai · Ngữ văn · GVCN 6A1
  | "phuong" // Trần Mai Phương · Lịch sử – Địa lí · tổ Xã hội · GVCN 12A1
  | "minh" // Hoàng Minh · Tiếng Anh · tổ Xã hội · GVCN 12A2
  | "trang" // Bùi Thu Trang · Tiếng Anh · GVCN 9A1
  | "lan" // Võ Ngọc Lan · Sinh học / KHTN · tổ KHTN · GVCN 8A2
  | "long" // Phạm Đức Long · Hoá học · tổ KHTN · GVCN 10A2
  | "binh" // Ngô Thanh Bình · Vật lí · GVCN 11A1
  | "hung"; // Vũ Văn Hưng · Toán · GVCN 7A3

// ---------------- Ngân hàng câu hỏi ----------------
/** Một câu hỏi rút gọn. Công thức viết Unicode (x², √, ≤) hoặc LaTeX trong $…$. Đáp án trắc nghiệm: chỉ số 0–3 (A–D), rải đều. */
export type DQ =
  | { t: "mcq"; lv: Level; stem: string; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3; explanation?: string }
  | { t: "tf"; lv: Level; stem: string; statements: [string, string, string, string]; answer: [boolean, boolean, boolean, boolean]; explanation?: string }
  /** Trả lời ngắn: đáp án là số (thập phân dùng dấu phẩy "2,5") hoặc một từ/cụm từ rất ngắn. */
  | { t: "short"; lv: Level; stem: string; answer: string; explanation?: string }
  | { t: "essay"; lv: Level; stem: string; rubric: string; points: number; explanation?: string };

/** Một chủ đề của một môn – lớp. `week` = tuần dạy theo PPCT học kỳ I (1–18; tuần 1 bắt đầu đầu tháng 9; tuần 9–10 kiểm tra giữa kì). */
export type DTopic = { subject: string; grade: number; topic: string; week: number; yccd: string; qs: DQ[] };

// ---------------- Nội dung GV soạn ----------------
export type DLesson = { owner: TeacherKey; plan: LessonPlan; /** Ngày dạy so với hôm nay (0 = hôm nay, 2 = hai ngày nữa, −7 = tuần trước). */ teachDay: number; /** Lớp dạy (ghi chú) */ className?: string };
export type DDeck = { owner: TeacherKey; deck: SlideDeck; /** Tên bài giáo án gốc (nếu bộ slide dựng từ giáo án) */ fromLesson?: string };

export type DAiScene =
  | { type: "slide"; title: string; description: string; keyPoints: string[]; heading: string; bullets: string[]; /** Công thức nổi bật (LaTeX, không $) */ formula?: string; /** Lời giảng: 2–4 câu nói tự nhiên, KHÔNG có ký hiệu LaTeX/markdown, đọc công thức bằng lời */ speech: string[] }
  | { type: "quiz"; title: string; description: string; keyPoints: string[]; questions: { question: string; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3; analysis: string }[]; speech: string[] };
export type DAiLesson = { owner: TeacherKey; title: string; subject: string; grade: number; requirement: string; scenes: DAiScene[] };

export type DMindNode = { label: string; children?: DMindNode[] };
export type DDiagram =
  | { owner: TeacherKey; title: string; subject: string; grade: number; topic: string; kind: "mind"; root: DMindNode }
  | { owner: TeacherKey; title: string; subject: string; grade: number; topic: string; kind: "flow"; nodes: { id: string; label: string; shape: "rect" | "round" | "diamond" | "parallelogram" | "pill" }[]; edges: { from: string; to: string; label?: string }[] };

/** Bảng giảng: mỗi trang vài dòng chữ (hỗ trợ $LaTeX$), tuỳ chọn một đồ thị hàm số (LaTeX của vế phải y = …). */
export type DBoard = { owner: TeacherKey; title: string; subject: string; grade: number; topic: string; pages: { lines: string[]; graph?: { exprs: string[]; view: { xMin: number; xMax: number; yMin: number; yMax: number } } }[] };

/** Văn bản hành chính: đúng khoá của VANBAN_SHAPE_HELP (server/src/domain/vanban.ts). `daysAgo` = ngày soạn. */
export type DVanBan = { owner: TeacherKey; daysAgo: number; input: Record<string, unknown> };

// ---------------- Tự học ----------------
/** Lời giải từng bước (SolutionSchema, server/src/domain/solution.ts) để chia sẻ ở /loi-giai. */
export type DSolution = { owner: TeacherKey; daysAgo: number; views: number; solution: Record<string, unknown> };

/** Kho tri thức cho gia sư: mỗi tài liệu là danh sách trang (mỗi trang 600–1500 ký tự chữ thật). */
export type DKb = { key: string; owner: TeacherKey; name: string; subject: string; grade: number; /** tên lớp gắn kho (vd "10A1") */ className?: string; docs: { name: string; source: "upload" | "text" | "lesson"; pages: string[] }[] };

/** Trích dẫn trong câu trả lời của gia sư: [n] trong nội dung ↔ trang của tài liệu (theo tên tài liệu trong kho). */
export type DCite = { n: number; doc: string; page: number; snippet: string };
export type DChat = { kbKey?: string; mode: "chat" | "hint"; title: string; daysAgo: number; hour: number; summary?: string; messages: { role: "user" | "assistant"; content: string; cite?: DCite[] }[] };

export type DPath = {
  kbKey?: string; name: string; goal: string; subject: string; grade: number; description: string; daysAgo: number;
  modules: { name: string; objective: string; points: { name: string; type: KnowledgeType; mastery: number; attempts: number }[] }[];
  errors: { point: string; question: string; errorType: string; remediation: string; daysAgo: number }[];
};

export type DBook = {
  kbKey?: string; owner: TeacherKey; title: string; description: string; scope: string; level: "beginner" | "intermediate" | "advanced" | "mixed";
  pages: { title: string; summary: string; objectives: string[]; contentType: "theory" | "practice" | "mixed"; blocks: BookBlock[] }[];
};
