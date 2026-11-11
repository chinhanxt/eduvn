// Phiên HS (mã lớp/PIN) trong localStorage — tách khỏi studentApi.ts để khung cổng Học không phải tải cả lớp gọi API P9a.
import type { StudentSession } from "./types";

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
  sessionChanged();
  return stored;
}
export const clearSession = (): void => {
  globalThis.localStorage?.removeItem(KEY);
  sessionChanged();
};
/** Báo khung cổng Học (cùng tab) rằng phiên HS vừa đổi — tab khác nhận qua sự kiện "storage". */
export const SESSION_EVENT = "eduvn-hs-session";
function sessionChanged(): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(SESSION_EVENT));
}

