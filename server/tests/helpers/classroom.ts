import type { testApp } from "./app";

/** Dựng nhanh lớp + thẻ lớp + đăng nhập HS cho các test HTTP của P9a. */
export type TApp = Awaited<ReturnType<typeof testApp>>;
export type Card = { studentId: string; seat: number; fullName: string; pin: string; qrToken: string };
export type Headers = Record<string, string>;

export const bearerOf = (token: string): Headers => ({ authorization: `Bearer ${token}` });

export async function teacher(t: TApp, sub = "gv-1", name = "Cô Lan"): Promise<Headers> {
  return bearerOf(await t.sign({ sub, name }));
}

export const call = (t: TApp, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, headers: Headers, payload?: unknown) =>
  t.app.inject({ method, url, headers, payload: payload as object });

/** Lớp 10A1 (Toán) + danh sách: mặc định 3 HS, thứ tự lớp An (1), Bình (2), Cường (3). */
export async function classWithStudents(t: TApp, auth: Headers, lines = ["Nguyễn Văn An;05/03/2010", "Trần Thị Bình", "Lê Văn Cường"]): Promise<string> {
  const c = await call(t, "POST", "/api/classes", auth, { name: "10A1", schoolYear: "2026-2027", subject: "Toán" });
  await call(t, "POST", `/api/classes/${c.json().id}/students`, auth, { text: lines.join("\n") });
  return c.json().id as string;
}

export async function issueAll(t: TApp, auth: Headers, classId: string): Promise<{ classCode: string; cards: Card[] }> {
  const r = await call(t, "POST", `/api/classes/${classId}/credentials`, auth, {});
  if (r.statusCode !== 201) throw new Error(`issue ${r.statusCode} ${r.body}`);
  return r.json();
}

export async function loginStudent(t: TApp, classCode: string, card: Card): Promise<Headers> {
  const r = await call(t, "POST", "/api/student/session", {}, { classCode, seat: card.seat, pin: card.pin });
  if (r.statusCode !== 200) throw new Error(`login ${r.statusCode} ${r.body}`);
  return bearerOf(r.json().token);
}

/** Ngân hàng 5 câu (2 trắc nghiệm, 1 đúng/sai, 1 trả lời ngắn "1,5", 1 tự luận) + đề `variants` mã. Toán: tối đa 3 điểm. */
export async function examFor(t: TApp, auth: Headers, variants = 2): Promise<string> {
  const { essay, mcq, short, tf } = await import("./fixtures");
  for (const q of [mcq(), mcq({ stem: "Số nào là số chẵn?", options: ["1", "3", "4", "5"], answer: 2 }), tf(), short(), essay()]) {
    const r = await call(t, "POST", "/api/questions", auth, q);
    if (r.statusCode !== 201) throw new Error(`question ${r.body}`);
  }
  const cells = (["mcq", "true_false", "short_answer", "essay"] as const).map((type) => ({ topic: "Mệnh đề", level: "NB", type, count: type === "mcq" ? 2 : 1 }));
  const r = await call(t, "POST", "/api/exams", auth, { title: "Kiểm tra 15 phút", variants, durationMinutes: 15, matrix: { subject: "Toán", grade: 10, cells } });
  if (r.statusCode !== 201) throw new Error(`exam ${r.body}`);
  return r.json().examId as string;
}

export const inHours = (h: number, from = new Date()) => new Date(from.getTime() + h * 3600_000).toISOString();

export async function publishFromExam(t: TApp, auth: Headers, classId: string, examId: string, extra: Record<string, unknown> = {}): Promise<{ id: string; [k: string]: unknown }> {
  const r = await call(t, "POST", `/api/classes/${classId}/assignments`, auth, { title: "KT 15 phút", source: { examId }, dueAt: inHours(2), publish: true, ...extra });
  if (r.statusCode !== 201) throw new Error(`assignment ${r.statusCode} ${r.body}`);
  return r.json();
}
