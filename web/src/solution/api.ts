// web/src/solution/api.ts — gọi API lời giải P13 (SSE giải từng bước, ngân hàng, chia sẻ, thư viện công khai).
import { ApiError, api, getOrgId } from "../api";
import { userManager } from "../auth";
import { parseSse } from "../hoc/text";
import type { Solution, SolutionRow, SolveEvent, VerifyStatus } from "./types";

export async function streamSolve(body: { problem?: string; questionId?: string; subject?: string; topic?: string; save?: boolean }, onEvent: (e: SolveEvent) => void, signal: AbortSignal): Promise<void> {
  const user = await userManager.getUser();
  if (!user || user.expired) throw new ApiError(401, { error: "Hết phiên đăng nhập" });
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}`, "content-type": "application/json" };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
  const res = await fetch("/api/solutions/solve", { method: "POST", headers, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) throw new ApiError(res.status, await res.json().catch(() => null));
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const { events, rest } = parseSse(buf);
    buf = rest;
    for (const e of events) onEvent(e as SolveEvent);
  }
}

export const getSolution = (id: string) => api<SolutionRow>(`/api/solutions/${id}`);
export const questionSolution = (qid: string) => api<{ solution: SolutionRow | null }>(`/api/questions/${qid}/solution`);
export const solutionStatus = (ids: string[]) => api<Record<string, VerifyStatus>>("/api/solutions/status", { method: "POST", body: { ids } });
export const publishSolution = (id: string, on: boolean) => api<SolutionRow>(`/api/solutions/${id}/publish`, { method: "POST", body: { public: on } });

export type PublicItem = { slug: string; subject: string; topic: string; status: VerifyStatus; views: number; problem: string; answer: string; publishedAt: string };
export type PublicList = { items: PublicItem[]; topics: { topic: string; n: number }[]; page: number };
export type PublicSolution = { slug: string; subject: string; topic: string; views: number; publishedAt: string; solution: Solution };

async function pub<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
export const publicList = (q: { topic?: string; q?: string; page?: number }) => {
  const p = new URLSearchParams();
  if (q.topic) p.set("topic", q.topic);
  if (q.q) p.set("q", q.q);
  if (q.page && q.page > 1) p.set("page", String(q.page));
  return pub<PublicList>(`/api/public/solutions${p.size ? `?${p}` : ""}`);
};
export const publicSolution = (slug: string) => pub<PublicSolution>(`/api/public/solutions/${encodeURIComponent(slug)}`);

// ——— gia sư "Chưa hiểu bước này" ———
export type HintEvent = { type: "meta"; sessionId: string } | { type: "delta"; text: string } | { type: "done" } | { type: "error"; message: string } | { type: "end" } | { type: "title" };
export type HintAsk = (body: { sessionId?: string; message: string; hintLevel: number }, onEvent: (e: HintEvent) => void, signal: AbortSignal) => Promise<void>;

async function readSse(res: Response, onEvent: (e: HintEvent) => void) {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const { events, rest } = parseSse(buf);
    buf = rest;
    for (const e of events) onEvent(e as HintEvent);
  }
}

/** Người dùng đăng nhập OIDC (GV, HS/SV cổng /hoc): gia sư P6 /api/tutor/chat chế độ gợi ý; phiên hiện trong trang Gia sư. */
export const staffHint: HintAsk = async (body, onEvent, signal) => {
  const user = await userManager.getUser();
  if (!user || user.expired) throw new ApiError(401, { error: "Đăng nhập để hỏi gia sư" });
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}`, "content-type": "application/json" };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
  const res = await fetch("/api/tutor/chat", { method: "POST", headers, body: JSON.stringify({ ...body, mode: "hint" }), signal });
  if (!res.ok || !res.body) throw new ApiError(res.status, await res.json().catch(() => null));
  await readSse(res, onEvent);
};

/** HS cổng /hs (phiên mã/thẻ): cùng gia sư P6, phiên riêng của HS. */
export function studentHint(token: string): HintAsk {
  return async (body, onEvent, signal) => {
    const res = await fetch("/api/student/tutor/step", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body), signal });
    if (!res.ok || !res.body) throw new ApiError(res.status, await res.json().catch(() => null));
    await readSse(res, onEvent);
  };
}

export const studentSolutions = (submissionId: string, token: string) =>
  fetch(`/api/student/submissions/${submissionId}/solutions`, { headers: { authorization: `Bearer ${token}` } }).then(async (r) => {
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new ApiError(r.status, data);
    return (data as { solutions: Record<string, Solution> }).solutions;
  });
