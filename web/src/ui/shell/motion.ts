import { flushSync } from "react-dom";

/**
 * Chuyển trang trong cổng bằng View Transitions API: trình duyệt chụp trang cũ, React vẽ trang mới đồng bộ (flushSync),
 * rồi mờ-trượt vùng nội dung (`view-transition-name: page`, CSS trong ui.css). Code trang chưa tải thì chờ tối đa 300 ms
 * để chuyển thẳng sang nội dung (không qua skeleton). Không có API / giảm chuyển động → điều hướng thường;
 * khi đó AppShell chạy hiệu ứng dự phòng bằng Web Animations.
 */
let vtRunning = false;
export const viewTransitionActive = () => vtRunning;
type VT = { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void> };
type Doc = Document & { startViewTransition?: (cb: () => void) => VT };
export const canViewTransition = (): boolean => !!(document as Doc).startViewTransition && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export async function navigateWithTransition(navigate: () => void, ready?: Promise<unknown> | null): Promise<void> {
  if (ready) await Promise.race([ready.catch(() => {}), new Promise((r) => setTimeout(r, 300))]);
  const d = document as Doc;
  if (!canViewTransition() || !d.startViewTransition) {
    navigate();
    return;
  }
  vtRunning = true;
  // Đặt tên "page" cho vùng nội dung chỉ trong lúc chuyển: tên view-transition tạo stacking context,
  // để thường trực sẽ đẩy hộp thoại fixed của trang cũ xuống dưới thanh trên.
  const root = document.documentElement;
  root.classList.add("vt-nav");
  try {
    const vt = d.startViewTransition(() => flushSync(navigate));
    // bị bỏ qua (trang ẩn, chuyển chồng) → promise ready bị từ chối: không phải lỗi
    vt.ready.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
    await vt.finished;
  } catch {
    /* bị ngắt bởi lần chuyển khác: bỏ qua */
  } finally {
    vtRunning = false;
    root.classList.remove("vt-nav");
  }
}

/** Đường trong router từ một link nội bộ của cổng; null = ngoài cổng (cổng khác, /api, /dl… → để trình duyệt tải). */
export function routerPathOf(a: HTMLAnchorElement, base: string, scope: RegExp): string | null {
  if (a.origin !== window.location.origin) return null;
  if (a.target && a.target !== "_self") return null;
  if (a.hasAttribute("download")) return null;
  const p = a.pathname;
  if (!scope.test(p)) return null;
  const inner = base ? p.slice(base.length) || "/" : p;
  return `${inner}${a.search}${a.hash}`;
}
