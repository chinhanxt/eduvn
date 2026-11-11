import type { ServerClock } from "./clock";
import type { SendResult, Sender } from "./syncQueue";
import type { Answers, StudentSession } from "./types";

export { clearSession, isSessionValid, loadSession, saveSession, SESSION_EVENT, type StoredSession } from "./session";
import { type StoredSession, loadSession, clearSession } from "./session";

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
 * Bộ gửi tự lưu cho AnswerSync. Phản hồi OK là SaveResult { ok, seq, serverNow, deadlineAt }: seq máy chủ xác nhận
 * được trả về, serverNow nạp vào ServerClock (clock.sample với mốc đơn điệu lúc gửi/nhận).
 * 401 → xoá phiên, "unauthorized"; 409/410/423 hoặc body.status đã nộp → "closed"; 400/404/413 → "rejected" (dứt khoát, không gửi lại);
 * 429/503 → "retry"; còn lại / lỗi mạng → "offline".
 */
export function autosaveSender(path: string, opts: { method?: string; clock?: ServerClock; mono?: () => number } = {}): Sender {
  const mono = opts.mono ?? (() => performance.now());
  return async (seq: number, answers: Answers, { keepalive }): Promise<SendResult> => {
    try {
      const sentAt = mono();
      const res = await hsFetch(path, { method: opts.method ?? "PUT", body: { seq, answers }, keepalive, retries: 0 });
      const receivedAt = mono();
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { seq?: number; serverNow?: string } | null;
        if (body?.serverNow && opts.clock) opts.clock.sample(body.serverNow, sentAt, receivedAt);
        return { kind: "ok", seq: typeof body?.seq === "number" ? body.seq : seq };
      }
      if (res.status === 401) {
        clearSession();
        return { kind: "unauthorized" };
      }
      const body = (await res.json().catch(() => null)) as { status?: string } | null;
      if ([409, 410, 423].includes(res.status) || body?.status === "submitted" || body?.status === "auto_submitted") return { kind: "closed", status: body?.status ?? "submitted" };
      if ([400, 404, 413].includes(res.status)) return { kind: "rejected", status: res.status };
      if (res.status === 429 || res.status === 503) return { kind: "retry", afterMs: retryAfterMs(res.headers.get("retry-after"), 0) };
      return { kind: "offline" };
    } catch {
      return { kind: "offline" };
    }
  };
}
