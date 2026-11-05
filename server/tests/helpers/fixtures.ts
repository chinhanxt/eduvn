import type { QuestionInput } from "../../src/domain/question";

type Of<T extends QuestionInput["type"]> = Extract<QuestionInput, { type: T }>;

const base = { subject: "Toán", grade: 10, topic: "Mệnh đề", level: "NB" as const, tags: [] as string[] };

export function mcq(p: Partial<Of<"mcq">> = {}): Of<"mcq"> {
  return {
    ...base,
    type: "mcq",
    stem: "Câu nào sau đây là mệnh đề?",
    options: ["2 + 2 = 4", "Bạn khỏe không?", "Hãy đóng cửa lại!", "x > 1"],
    answer: 0,
    ...p,
  };
}

export function tf(p: Partial<Of<"true_false">> = {}): Of<"true_false"> {
  return {
    ...base,
    type: "true_false",
    stem: "Xét tính đúng sai của các mệnh đề sau:",
    statements: ["3 là số nguyên tố", "4 là số lẻ", "√2 là số hữu tỉ", "0 là số tự nhiên"],
    answer: [true, false, false, true],
    ...p,
  };
}

export function short(p: Partial<Of<"short_answer">> = {}): Of<"short_answer"> {
  return { ...base, type: "short_answer", stem: "Viết 3/2 dưới dạng số thập phân.", answer: "1,5", ...p };
}

export function essay(p: Partial<Of<"essay">> = {}): Of<"essay"> {
  return {
    ...base,
    type: "essay",
    stem: "Chứng minh √2 là số vô tỉ.",
    rubric: "Giả sử phản chứng (0,5đ); suy ra mâu thuẫn (0,5đ).",
    points: 1,
    ...p,
  };
}

let counter = 0;
export function stored<T extends QuestionInput>(q: T, id = `q${++counter}`): T & { id: string } {
  return { ...q, id };
}
