import type { SendResult, Sender } from "./syncQueue";
import type { Answers, StudentSession } from "./types";

const KEY = "eduvn.hs";
export type StoredSession = StudentSession & { expiresAt: number };

export const isSessionValid = (s: StoredSession | null, now = Date.now()): s is StoredSession => !!s && s.expiresAt - 60_000 > now;

export function loadSession(): StoredSession | null {
  try {
    const s = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? "null") as StoredSession | null;
    if (isSessionValid(s)) return s;
    if (s) globalThis.localStorage?.removeItem(KEY);
    return null;
  } catch {
    return null;
  }
}
export function saveSession(s: StudentSession, now = Date.now()): StoredSession {
  const stored = { ...s, expiresAt: now + s.expiresInSeconds * 1000 };
  globalThis.localStorage?.setItem(KEY, JSON.stringify(stored));
  return stored;
}
export const clearSession = (): void => globalThis.localStorage?.removeItem(KEY);

export class StudentApiError extends Error {
  constructor(
    public status: number,
    public body: { error?: string; status?: string; issues?: unknown[] } | null,
  ) {
    super(body?.error ?? `HTTP ${status}`);
  }
}

/** Chờ trước khi gửi lại khi 429/503: theo Retry-After nếu có, không thì lùi dần; cộng nhiễu 0–400 ms để cả lớp không gửi cùng lúc. */
export function retryAfterMs(header: string | null, attempt: number, rand: () => number = Math.random): number {
  const s = Number(header);
  const base = header !== null && Number.isFinite(s) && s > 0 ? s * 1000 : Math.min(8000, 500 * 2 ** attempt);
  return Math.round(base + rand() * 400);
}

type Init = { method?: string; body?: unknown; keepalive?: boolean; retries?: number; token?: string | null };

/** fetch có phiên HS; 429/503 thì tự gửi lại (mặc định 2 lần). Lỗi mạng ném TypeError như fetch. */
export async function hsFetch(path: string, init: Init = {}): Promise<Response> {
  const token = init.token === undefined ? loadSession()?.token : init.token;
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const retries = init.keepalive ? 0 : (init.retries ?? 2); // keepalive: trang đang đóng, không chờ gửi lại
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(path, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), keepalive: init.keepalive });
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      await new Promise((r) => setTimeout(r, retryAfterMs(res.headers.get("retry-after"), attempt)));
      continue;
    }
    return res;
  }
}

/** JSON hoặc ném StudentApiError. 401 ngoài trang đăng nhập: xoá phiên, về /hs. */
export async function hsJson<T>(path: string, init: Init = {}): Promise<T> {
  const res = await hsFetch(path, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/api/student/session")) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/hs") window.location.assign("/hs");
    }
    throw new StudentApiError(res.status, data);
  }
  return data as T;
}

export const errMsg = (e: unknown): string => (e instanceof StudentApiError ? e.message : e instanceof TypeError ? "Mất mạng – em kiểm tra kết nối rồi thử lại" : "Có lỗi, em thử lại nhé");

/**
 * Bộ gửi tự lưu cho AnswerSync. 401 → xoá phiên và trả "unauthorized" (AnswerSync báo sự kiện cho UI);
 * 409/410/423 hoặc body.status đã nộp → "closed"; 429/503 → "retry"; lỗi mạng → "offline".
 */
export function autosaveSender(path: string, method = "PUT"): Sender {
  return async (seq: number, answers: Answers, { keepalive }): Promise<SendResult> => {
    try {
      const res = await hsFetch(path, { method, body: { seq, answers }, keepalive, retries: 0 });
      if (res.ok) return { kind: "ok", seq };
      if (res.status === 401) {
        clearSession();
        return { kind: "unauthorized" };
      }
      const body = (await res.json().catch(() => null)) as { status?: string } | null;
      if ([409, 410, 423].includes(res.status) || body?.status === "submitted" || body?.status === "auto_submitted") return { kind: "closed", status: body?.status ?? "submitted" };
      if (res.status === 429 || res.status === 503) return { kind: "retry", afterMs: retryAfterMs(res.headers.get("retry-after"), 0) };
      return { kind: "offline" };
    } catch {
      return { kind: "offline" };
    }
  };
}
