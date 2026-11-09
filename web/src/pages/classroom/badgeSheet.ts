import QRCode from "qrcode";

export type BadgeView = { seat: number; fullName: string; pin: string; qrUrl: string };
export const PER_PAGE = 8;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
export const seatLabel = (n: number) => String(n).padStart(2, "0");

export const qrSvg = (url: string): Promise<string> => QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 });

/** Trang in A4 dọc, 8 thẻ mỗi trang (2 × 4), cắt theo nét đứt. svgs[i] = QR của cards[i]. */
export function badgeSheetHtml(o: { className: string; subject: string | null; classCode: string; cards: readonly BadgeView[]; svgs: readonly string[] }): string {
  const sub = esc(`Lớp ${o.className}${o.subject ? ` · ${o.subject}` : ""}`);
  const badge = (c: BadgeView, i: number) => `<div class="badge"><div class="bh"><b>EDUVN</b><span>${esc(o.classCode)}</span></div>
<div class="g"><div class="nm">${esc(c.fullName)}</div><div class="cl">${sub}</div>
<div class="kv"><div><small>Mã lớp</small><b>${esc(o.classCode)}</b></div><div><small>STT</small><b>${seatLabel(c.seat)}</b></div><div><small>PIN</small><b>${esc(c.pin)}</b></div></div></div>
<div class="qr">${o.svgs[i] ?? ""}</div></div>`;
  const pages: string[] = [];
  for (let i = 0; i < o.cards.length; i += PER_PAGE) pages.push(`<section class="page">${o.cards.slice(i, i + PER_PAGE).map((c, k) => badge(c, i + k)).join("")}</section>`);
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Thẻ lớp ${esc(o.className)}</title><style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; } body { margin: 0; font: 12px/1.35 "Be Vietnam Pro", system-ui, sans-serif; color: #1b2033; }
.page { width: 190mm; height: 277mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); gap: 4mm; page-break-after: always; }
.page:last-child { page-break-after: auto; }
.badge { border: 1.5px dashed #b6bdd4; border-radius: 4mm; padding: 4mm; display: grid; grid-template-columns: 1fr 34mm; grid-template-rows: auto 1fr; gap: 2mm 3mm; overflow: hidden; }
.bh { grid-column: 1 / -1; display: flex; justify-content: space-between; color: #3e57d1; font-weight: 700; } .bh span { color: #636b84; font-weight: 500; }
.nm { font-weight: 700; font-size: 15px; } .cl { color: #636b84; margin-bottom: 2mm; }
.kv { display: flex; gap: 1.5mm; } .kv div { background: #f4f6fb; border-radius: 2mm; padding: 1mm 2mm; } .kv small { display: block; color: #636b84; font-size: 9px; } .kv b { font-size: 13px; letter-spacing: .03em; }
.qr svg { width: 34mm; height: 34mm; display: block; }
</style></head><body>${pages.join("")}</body></html>`;
}

/** Mở cửa sổ in. URL QR = <origin>/hs/qr#<token> (token nằm sau #, không lên log máy chủ). */
export async function printBadges(o: { className: string; subject: string | null; classCode: string; cards: readonly { seat: number; fullName: string; pin: string; qrToken: string }[] }): Promise<void> {
  const views = o.cards.map((c) => ({ seat: c.seat, fullName: c.fullName, pin: c.pin, qrUrl: `${window.location.origin}/hs/qr#${c.qrToken}` }));
  const svgs = await Promise.all(views.map((v) => qrSvg(v.qrUrl)));
  const w = window.open("", "_blank");
  if (!w) throw new Error("Trình duyệt chặn cửa sổ in — cho phép cửa sổ bật lên rồi thử lại");
  w.document.write(badgeSheetHtml({ ...o, cards: views, svgs }));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
