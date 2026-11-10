import { useSyncExternalStore } from "react";

/** Có mạng = navigator.onLine và lần fetch gần nhất không lỗi mạng. */
let fetchFailed = false;
const subs = new Set<() => void>();
const navOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false);
const emit = () => subs.forEach((f) => f());

export const isOnline = (): boolean => navOnline() && !fetchFailed;
export function reportFetchFailure(): void {
  if (fetchFailed) return;
  fetchFailed = true;
  emit();
}
export function reportFetchSuccess(): void {
  if (!fetchFailed) return;
  fetchFailed = false;
  emit();
}

let bound = false;
function bind() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  // Sự kiện "online" chỉ là gợi ý: bỏ cờ lỗi để lần fetch sau tự kiểm lại.
  window.addEventListener("online", () => {
    fetchFailed = false;
    emit();
  });
  window.addEventListener("offline", emit);
}

export function subscribeOnline(cb: () => void): () => void {
  bind();
  subs.add(cb);
  return () => subs.delete(cb);
}

export const useOnline = (): boolean => useSyncExternalStore(subscribeOnline, isOnline, () => true);
