import { preloadPath } from "./routes";

// Nạp lúc trình duyệt rảnh (AppShell) — không nằm trong JS lần đầu.
/** Tải trước code (và dữ liệu) của trang khi rê chuột/tiêu điểm vào link nội bộ ≥ 80 ms. */
export function installPrefetch(base: string): () => void {
  let timer = 0;
  let last: string | null = null;
  const pathOf = (a: HTMLAnchorElement): string | null => {
    if (a.origin !== window.location.origin || a.target === "_blank" || a.hasAttribute("download")) return null;
    const p = a.pathname;
    if (base && base !== "/") return p === base || p.startsWith(`${base}/`) ? p.slice(base.length) || "/" : null;
    return p;
  };
  const over = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    const p = pathOf(a);
    if (!p || p === last) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      last = p;
      void preloadPath(p)?.catch(() => {});
    }, 80);
  };
  const out = () => window.clearTimeout(timer);
  document.addEventListener("pointerover", over);
  document.addEventListener("focusin", over);
  document.addEventListener("pointerout", out);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("pointerover", over);
    document.removeEventListener("focusin", over);
    document.removeEventListener("pointerout", out);
  };
}
