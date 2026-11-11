import { userManager } from "./auth";
import type { BoardDoc } from "./board/doc";

const ORG_KEY = "eduvn.org";
export const getOrgId = () => window.localStorage.getItem(ORG_KEY);
export const setOrgId = (id: string) => window.localStorage.setItem(ORG_KEY, id);

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super((body as { error?: string } | null)?.error ?? `HTTP ${status}`);
  }
}

/** Header đăng nhập Keycloak + tổ chức đang chọn; hết phiên → ApiError 401. Dùng chung cho api() và lớp dữ liệu ui/data. */
export async function authHeaders(): Promise<Record<string, string>> {
  const user = await userManager.getUser();
  if (!user || user.expired) {
    void userManager.removeUser();
    throw new ApiError(401, { error: "Hết phiên đăng nhập" });
  }
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}` };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
  return headers;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers = await authHeaders();
  const org = headers["x-org-id"];
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(path, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok && res.status !== 422) {
    // x-org-id cũ không còn hợp lệ → bỏ để lần sau dùng tổ chức mặc định
    if (res.status === 403 && org) window.localStorage.removeItem(ORG_KEY);
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export type Me = {
  user: { name: string | null; email: string | null };
  org: { id: string; name: string };
  role: string;
  orgs: { id: string; name: string; role: string }[];
};
export type ExamSummary = { id: string; title: string; subject: string; grade: number; codes: string[]; createdAt: string };
export type Links = { exams: { code: string; url: string }[]; answerKey: string; matrix: string; expiresInMinutes: number };
export type Question = {
  id: string;
  subject: string;
  grade: number;
  topic: string;
  level: "NB" | "TH" | "VD";
  type: "mcq" | "true_false" | "short_answer" | "essay";
  stem: string;
  /** Hình vẽ kèm câu (PNG data URL) */
  figure?: string;
};
export type KeyEntry = { no: number; section: string; sectionNo: number; answer: string };

export const getLinks = (examId: string) => api<Links>(`/api/exams/${examId}/links`, { method: "POST", body: {} });

export async function downloadFirst(examId: string) {
  const links = await getLinks(examId);
  const first = links.exams[0];
  if (first) window.location.assign(first.url);
}

export type ClassSummary = { id: string; name: string; schoolYear: string; subject: string | null; scale: "TT22" | "TT27"; studentCount: number };
export type StudentRow = { id: string; code: string | null; fullName: string; dob: string | null; gender: string | null; note: string };
export type ClassDetail = Omit<ClassSummary, "studentCount"> & { columns: { name: string; weight: number }[]; students: StudentRow[] };
export type AttStatus = "present" | "excused" | "unexcused";
export type GbStudent = StudentRow & {
  scores: Record<string, number>;
  dtb: number | null;
  dtbYear: number | null;
  attendance: Record<AttStatus, number>;
  comments: Partial<Record<"HK1" | "HK2", { text: string; level: string }>>;
};
export type Gradebook = { term: "HK1" | "HK2"; class: Omit<ClassSummary, "studentCount">; columns: { name: string; weight: number }[]; dates: string[]; students: GbStudent[] };
export const LEVELS = { TT22: ["Tốt", "Khá", "Đạt", "Chưa đạt"], TT27: ["Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"] } as const;

/** Lỗi nhập liệu có danh sách → nhiều dòng. */
export const errText = (e: unknown): string => {
  if (e instanceof ApiError) {
    const issues = (e.body as { issues?: unknown[] } | null)?.issues;
    if (issues?.length && typeof issues[0] === "string") return issues.join("\n");
    return e.message;
  }
  return "Lỗi";
};
export const vn = (n: number | null | undefined): string => (n === null || n === undefined ? "" : String(n).replace(".", ","));
export const dobVi = (iso: string | null): string => (iso ? iso.split("-").reverse().join("/") : "");

export async function exportClass(id: string, kind: "class_list" | "gradebook", term?: "HK1" | "HK2") {
  const link = await api<{ url: string }>(`/api/classes/${id}/export`, { method: "POST", body: { kind, term } });
  window.location.assign(link.url);
}

export type LessonSummary = { id: string; title: string; subject: string; grade: number; periods: number; updatedAt: string };
export type LessonBody = {
  name: string; goal: string; content: string; product: string;
  steps: { assign: string; perform: string; report: string; conclude: string };
};
export type LessonPlan = {
  header: { school: string; department: string; teacher: string; subject: string; grade?: number; title: string; periods?: number; date: string };
  objectives: { knowledge: string[]; competencies: { general: string[]; specific: string[] }; qualities: string[] };
  materials: string[];
  activities: (LessonBody & { subs: LessonBody[] })[];
};
export type LessonDetail = LessonSummary & { plan: LessonPlan };

export async function exportLesson(id: string) {
  const link = await api<{ url: string }>(`/api/lessons/${id}/export`, { method: "POST", body: {} });
  window.location.assign(link.url);
}

export type VanBanSummary = { id: string; loai: string; trichYeu: string; soKyHieu: string; ngay: string; updatedAt: string };

export async function exportVanBan(id: string) {
  const link = await api<{ url: string }>(`/api/van-ban/${id}/export`, { method: "POST", body: {} });
  window.location.assign(link.url);
}

export type DeckSummary = { id: string; title: string; subject: string | null; grade: number | null; slideCount: number; sourceLessonPlanId: string | null; updatedAt: string };
export type GameSummary = { id: string; title: string; kind: "quiz" | "flashcards"; questionCount: number; timerSeconds: number; source: string; updatedAt: string };

export async function exportSlide(id: string) {
  const link = await api<{ url: string }>(`/api/slides/${id}/export`, { method: "POST", body: {} });
  window.location.assign(link.url);
}

/** open=true mở trò chơi ở tab mới (chơi ngay); ngược lại tải file .html. */
export async function exportGame(id: string, open = false) {
  const link = await api<{ url: string }>(`/api/games/${id}/export`, { method: "POST", body: {} });
  if (open) window.open(`${link.url}?mo=1`, "_blank", "noopener");
  else window.location.assign(link.url);
}

export type BoardSummary = { id: string; title: string; subject: string; grade: number; topic: string; pageCount: number; updatedAt: string };
export type BoardDetail = BoardSummary & { doc: BoardDoc };
/** Câu hỏi đầy đủ (gợi ý bài, chiếu lên bảng). */
export type BankQuestion = Question & { options?: string[]; statements?: string[]; answer: number | boolean[] | string; explanation?: string; rubric?: string; points?: number };
export const gradeLabel = (g: number): string => (g <= 12 ? `Lớp ${g}` : `Năm ${g - 12}`);

import type { DiagramDoc } from "./diagram/types";
export type DiagramSummary = { id: string; title: string; subject: string; grade: number; topic: string; kind: "mind" | "flow"; nodeCount: number; updatedAt: string };
export type DiagramDetail = DiagramSummary & { doc: DiagramDoc };
export type AiDiagramResult = { nodes: { id: string; label: string; parent: string | null }[]; links: { from: string; to: string; label?: string }[] };

/** Nút AI dùng skill sư phạm (P8): trả bản nháp để giáo viên duyệt. */
export const aiSkill = <T,>(path: string, body: unknown) => api<T>(`/api/ai-skills/${path}`, { method: "POST", body });

/** POST rồi tải tệp trả về (cần header đăng nhập nên không dùng link trực tiếp). */
export async function downloadPost(path: string, body: unknown, filename: string) {
  const user = await userManager.getUser();
  if (!user || user.expired) throw new ApiError(401, { error: "Hết phiên đăng nhập" });
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}`, "content-type": "application/json" };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
  const res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
