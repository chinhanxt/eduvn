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

/** Lời nhắn gửi gia sư khi HS bấm "Chưa hiểu bước này": đề + các bước trước + bước đang vướng. */
export function stuckMessage(s: Pick<Solution, "problem" | "steps">, index: number): string {
  const prev = s.steps.slice(0, index).map((st, i) => `Bước ${i + 1} — ${st.title}: ${st.body}`).join("\n");
  const cur = s.steps[index]!;
  return `Em đang xem lời giải bài sau và chưa hiểu bước ${index + 1}.\n\nĐề bài:\n${s.problem}\n\n${prev ? `Các bước trước:\n${prev}\n\n` : ""}Bước em chưa hiểu — Bước ${index + 1}: ${cur.title}\n${cur.body}\n\nThầy/cô gợi ý từng chút để em tự hiểu bước này (vì sao làm vậy, dùng kiến thức gì), đừng giải lại cả bài nhé.`;
}
