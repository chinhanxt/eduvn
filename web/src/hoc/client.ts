import { ApiError, api, getOrgId } from "../api";
import { userManager } from "../auth";
import { parseSse } from "./text";

export type Citation = { n: number; docId: string; doc: string; page: number; snippet: string };
export type Kb = { id: string; name: string; subject: string; grade: number; docCount: number };
export type KbDoc = { id: string; name: string; source: string; pages: number; chars: number };
export type SessionRow = { id: string; title: string; kbId: string | null; mode: string; updatedAt: string };
export type Msg = { id?: string; role: "user" | "assistant"; content: string; citations: Citation[] };

export type ChatEvent =
  | { type: "meta"; sessionId: string; citations: Citation[]; query: string }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string; citations: Citation[] }
  | { type: "title"; title: string }
  | { type: "error"; message: string }
  | { type: "end" };

/** POST /api/tutor/chat và đọc SSE từng mẩu. */
export async function streamChat(body: unknown, onEvent: (e: ChatEvent) => void, signal: AbortSignal): Promise<void> {
  const user = await userManager.getUser();
  if (!user || user.expired) throw new ApiError(401, { error: "Hết phiên đăng nhập" });
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}`, "content-type": "application/json" };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
  const res = await fetch("/api/tutor/chat", { method: "POST", headers, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const { events, rest } = parseSse(buf);
    buf = rest;
    for (const e of events) onEvent(e as ChatEvent);
  }
}

export const tutorApi = <T,>(path: string, init?: { method?: string; body?: unknown }) => api<T>(`/api/tutor${path}`, init);
export const toBase64 = (buf: ArrayBuffer): string => {
  let s = "";
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fileToDataUrl = (f: File): Promise<string> =>
  new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => no(r.error);
    r.readAsDataURL(f);
  });
