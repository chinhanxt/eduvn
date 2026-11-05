import { userManager } from "./auth";

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

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const user = await userManager.getUser();
  if (!user || user.expired) {
    void userManager.removeUser();
    throw new ApiError(401, { error: "Hết phiên đăng nhập" });
  }
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}` };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
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
export type Links = { exams: { code: string; url: string }[]; answerKey: string; expiresInMinutes: number };
export type Question = {
  id: string;
  subject: string;
  grade: number;
  topic: string;
  level: "NB" | "TH" | "VD";
  type: "mcq" | "true_false" | "short_answer" | "essay";
  stem: string;
};
export type KeyEntry = { no: number; section: string; sectionNo: number; answer: string };

export const getLinks = (examId: string) => api<Links>(`/api/exams/${examId}/links`, { method: "POST", body: {} });

export async function downloadFirst(examId: string) {
  const links = await getLinks(examId);
  const first = links.exams[0];
  if (first) window.location.assign(first.url);
}
