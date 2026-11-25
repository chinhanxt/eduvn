import { useSyncExternalStore } from "react";

/** Sáng/tối gọn cho cổng công khai (cùng khoá "eduvn-theme" với cổng GV/Học, không kéo cả ui/shell vào JS lần đầu). */
const KEY = "eduvn-theme";
const subs = new Set<() => void>();
const root = () => document.documentElement;
export const isDark = () => root().dataset.theme === "dark";

export function applyStoredTheme() {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "dark" || t === "light") root().dataset.theme = t;
  } catch {
    /* chế độ riêng tư */
  }
}

export function toggleDark() {
  const t = isDark() ? "light" : "dark";
  root().dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* chỉ đổi trong phiên */
  }
  subs.forEach((f) => f());
}

export const useDark = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    isDark,
    () => false,
  );
