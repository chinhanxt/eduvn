// web/src/solution/fonts.ts — tải Inter (giao diện) + Source Serif 4 (thân lời giải) một lần khi trang có trình xem lời giải.
// Theo docs/design/eduvn-design-system.md D3: Source Serif chỉ tải ở màn có nội dung đọc; display=swap để chữ hiện ngay.
const HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap";

export function ensureFonts(): void {
  if (typeof document === "undefined" || document.querySelector(`link[data-sol-fonts]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = HREF;
  l.dataset.solFonts = "1";
  document.head.appendChild(l);
}
