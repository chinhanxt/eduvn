import { useSyncExternalStore } from "react";

/** Giao diện sáng/tối: mặc định luôn sáng; chỉ tối khi người dùng chọn (nhớ trong localStorage "eduvn-theme").
 *  HTML mỗi cổng có đoạn script nhỏ trong <head> đặt data-theme trước khi vẽ → không nháy sáng. */
export type Theme = "light" | "dark";
export const THEME_KEY = "eduvn-theme";
const subs = new Set<() => void>();

export const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function setTheme(t: Theme): void {
  const apply = () => {
    document.documentElement.dataset.theme = t;
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      /* chế độ riêng tư: chỉ đổi trong phiên */
    }
    subs.forEach((f) => f());
  };
  // Đổi giao diện mờ chéo bằng View Transitions khi có (trình duyệt cũ: đổi ngay).
  const d = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (d.startViewTransition && !reduce) d.startViewTransition(apply).ready.catch(() => {});
  else apply();
}
export const toggleTheme = (): void => setTheme(getTheme() === "dark" ? "light" : "dark");

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    getTheme,
    () => "light",
  );
}
