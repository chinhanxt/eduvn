import type { Ai, AiMessage } from "../../src/services/ai";

export type SkillCall = { task: string; system: string; user: string };
const text = (m: AiMessage | undefined) => (typeof m?.content === "string" ? m.content : "");

const block = (n: string) => ({ name: n, goal: `Mục tiêu ${n}`, content: `Nội dung ${n}`, product: `Sản phẩm ${n}`, steps: { assign: "GV giao việc", perform: "HS làm", report: "HS trình bày", conclude: "GV chốt" } });

/** AI giả theo nội dung SKILL.md trong system prompt (nhận diện bằng tên skill) và dòng đầu của yêu cầu. */
export function fakeSkillsAi(over: Partial<Record<string, (user: string, n: number) => string>> = {}) {
  const calls: SkillCall[] = [];
  const counts: Record<string, number> = {};
  const ai: Ai = {
    async chat(task, messages) {
      const system = text(messages[0]);
      const user = text(messages.filter((m) => m.role === "user")[0]);
      calls.push({ task, system, user });
      const key = system.includes("# Giáo án theo CV 5512") ? "giao-an" : system.includes("# Ma trận + bản đặc tả") ? "ma-tran" : system.includes("# Câu hỏi theo yêu cầu cần đạt") ? "cau-hoi" : system.includes("# Nhận xét học sinh") ? "nhan-xet" : system.includes("# Đề cương học phần") ? "de-cuong" : "rubric";
      counts[key] = (counts[key] ?? 0) + 1;
      const f = over[key];
      if (f) return f(user, counts[key] ?? 1);
      switch (key) {
        case "giao-an": {
          if (user.includes("CHẾ ĐỘ: khung"))
            return JSON.stringify({ objectives: { knowledge: ["Nêu được mệnh đề"], competencies: { general: ["Tự chủ và tự học"], specific: ["Tư duy và lập luận toán học"] }, qualities: ["Chăm chỉ"] }, materials: ["SGK", "Phiếu học tập"], outline: ["Khởi động", "Khái niệm", "Luyện tập", "Vận dụng"].map((name) => ({ name, gist: name, minutes: 20 })) });
          if (user.includes("hoat_dong 2")) return JSON.stringify({ subs: [block("2.1"), block("2.2")] });
          return JSON.stringify(block("x"));
        }
        case "ma-tran":
          return JSON.stringify({ title: "Giữa kì 1", durationMinutes: 45, subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 12, yccd: "Nhận biết mệnh đề" }, { topic: "Mệnh đề", level: "VDC", type: "essay", count: 3, yccd: "(Vận dụng cao) Chứng minh" }, { topic: "Tập hợp", level: "TH", type: "short_answer", count: 2, yccd: "Giải thích" }] });
        case "cau-hoi":
          return JSON.stringify({ questions: [
            { type: "mcq", stem: "Mệnh đề nào đúng?", options: ["A. 1+1=2", "B. 1+1=3", "C. 2>3", "D. 0>1"], answer: 0, explanation: "Đúng." },
            { type: "mcq", stem: "Trùng phương án", options: ["a", "a", "b", "c"], answer: 0 },
            { type: "mcq", stem: "Thiếu phương án", options: ["a"], answer: 0 },
            { type: "short_answer", stem: "1+1=?", answer: 2 },
          ] });
        case "nhan-xet": {
          const st = (JSON.parse(user) as { students: { id: string }[] }).students;
          return JSON.stringify({ items: st.map((s, i) => ({ id: s.id, level: "Khá", text: `Em nắm chắc kiến thức nền ở nội dung ${i + 1}. Em cần rèn thêm cách trình bày lập luận. Học kì tới, em chọn mỗi tuần một bài khó để tự giải.` })) });
        }
        case "de-cuong": {
          if (user.startsWith("PHA: khung"))
            return JSON.stringify({ name: "Cấu trúc dữ liệu", code: "IT2010", credits: 3, level: "Đại học năm 2", hours: { lecture: 30, practice: 30, selfStudy: 90 }, prerequisites: ["Nhập môn lập trình"], description: "Học phần cung cấp...", plos: [{ code: "PLO1", text: "Áp dụng kiến thức" }, { code: "PLO2", text: "Phân tích" }], clos: [{ code: "CLO1", text: "Giải thích được cấu trúc", bloom: "Hiểu" }, { code: "CLO2", text: "Cài đặt được danh sách", bloom: "Vận dụng" }, { code: "CLO3", text: "Phân tích được độ phức tạp", bloom: "Phân tích" }], cloPlo: [{ clo: "CLO1", plo: [{ code: "PLO1", level: "I" }] }, { clo: "CLO2", plo: [{ code: "PLO1", level: "R" }] }, { clo: "CLO3", plo: [{ code: "PLO2", level: "M" }] }], assessment: [{ component: "Chuyên cần", weight: 10, method: "Điểm danh", clos: ["CLO1"], criteria: "Có mặt" }, { component: "Bài tập lớn", weight: 30, method: "Nhóm", clos: ["CLO2"], criteria: "Rubric" }, { component: "Cuối kì", weight: 60, method: "Viết", clos: ["CLO1", "CLO3"], criteria: "Đáp án" }], ghiChu: "PLO giả định" });
          return JSON.stringify({ schedule: [1, 2, 3, 4].map((week) => ({ week, topic: `Tuần ${week}`, clos: ["CLO1"], activities: "Giảng", selfStudy: "Đọc" })), materials: { main: ["Giáo trình A"], reference: [] } });
        }
        default:
          return JSON.stringify({ totalPoints: 3, criteria: [{ name: "Kết quả", maxPoints: 2, levels: [{ label: "Đúng", points: 2, descriptor: "Đúng kết quả" }, { label: "Sai", points: 0, descriptor: "Sai" }] }, { name: "Trình bày", maxPoints: 1, levels: [{ label: "Rõ", points: 1, descriptor: "Rõ ràng" }, { label: "Không", points: 0, descriptor: "Không" }] }], notes: "Chấp nhận cách giải khác" });
      }
    },
    // eslint-disable-next-line require-yield
    async *stream() {
      throw new Error("không dùng");
    },
  };
  return { ai, calls };
}
