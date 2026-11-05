const act = (n: string) => ({
  name: n,
  goal: "Học sinh nêu được khái niệm.",
  content: "Làm việc nhóm với phiếu học tập.",
  product: "Bài làm của nhóm.",
  steps: { assign: "GV giao nhiệm vụ.", perform: "HS làm việc nhóm.", report: "Đại diện nhóm trình bày.", conclude: "GV nhận xét, chốt kiến thức." },
});

export function lessonPlan(over: Record<string, unknown> = {}) {
  return {
    header: { school: "THPT Nguyễn Huệ", teacher: "Cô Lan", subject: "Toán", grade: 10, title: "Mệnh đề", periods: 2 },
    objectives: {
      knowledge: ["Nêu được khái niệm mệnh đề."],
      competencies: { general: ["Tự chủ và tự học"], specific: ["Tư duy và lập luận toán học"] },
      qualities: ["Chăm chỉ, trung thực"],
    },
    materials: ["Máy chiếu", "Phiếu học tập"],
    activities: [act("Khởi động"), { subs: [act("Khái niệm"), act("Ví dụ")] }, act("Luyện tập"), act("Vận dụng")],
    ...over,
  };
}
