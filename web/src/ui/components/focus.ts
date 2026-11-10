const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
/** Giữ Tab trong hộp (focus trap). Gọi trong onKeyDown của hộp. */
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault: () => void }, box: HTMLElement | null): void {
  if (e.key !== "Tab" || !box) return;
  const els = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!els.length) return;
  const first = els[0]!;
  const last = els[els.length - 1]!;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
/** Bỏ dấu tiếng Việt để tìm "lop" ra "Lớp". */
export const fold = (s: string): string => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
