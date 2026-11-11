import { type ComponentType, lazy, type LazyExoticComponent } from "react";
import { matchPath } from "react-router";

/** Trang tải theo màn: `lazyPage(() => import("…").then(m => m.X))` → component lazy + preload (gọi khi rê/tiêu điểm link). */
export type Page = { Component: LazyExoticComponent<ComponentType>; preload: () => Promise<unknown> };
export function lazyPage(load: () => Promise<ComponentType>): Page {
  let p: Promise<{ default: ComponentType }> | null = null;
  const get = () => (p ??= load().then((C) => ({ default: C })).catch((e: unknown) => {
    p = null; // lỗi mạng: lần sau thử lại
    throw e;
  }));
  return { Component: lazy(get), preload: get };
}

/** Bảng đường dẫn → hàm tải trước (đường trong app, đã bỏ basename). */
export type PreloadEntry = { path: string; preload: () => Promise<unknown>; data?: (params: Record<string, string | undefined>) => void };
const table: PreloadEntry[] = [];
export function registerPreload(entries: readonly PreloadEntry[]): void {
  table.push(...entries);
}
export function preloadPath(pathname: string): Promise<unknown> | null {
  for (const e of table) {
    const m = matchPath({ path: e.path, end: true }, pathname);
    if (m) {
      e.data?.(m.params);
      return e.preload();
    }
  }
  return null;
}
