// Đường P9a cũ → v2 (tải lười cùng LegacyHoc/StudentLogin, không nằm trong JS lần đầu của cổng).
import { HOC_PATH } from "./paths";

/**
 * Đường P9a cũ trong cổng Học (/hoc/hs/…) → đường v2. null = không phải đường cũ.
 * Query/hash do nơi gọi nối thêm (QR mang token ở hash, mã tham gia ở ?ma=).
 */
export function hocV2Path(pathname: string): string | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (p === "/hoc/hs") return HOC_PATH.baiTap;
  if (!p.startsWith("/hoc/hs/")) return null;
  if (p === "/hoc/hs/qr") return HOC_PATH.qr;
  const bai = /^\/hoc\/hs\/bai\/([^/]+)$/.exec(p);
  if (bai) return `/hoc/lam-bai/${bai[1]}`;
  const kq = /^\/hoc\/hs\/ket-qua\/([^/]+)$/.exec(p);
  if (kq) return `/hoc/ket-qua/${kq[1]}`;
  return HOC_PATH.baiTap;
}

/** Thẻ QR in cho HS trỏ về `${origin}/hs/qr#token` (thẻ cũ) hoặc `/hoc/bai-tap/qr#token`. */
export const isCardQr = (raw: string, origin: string): boolean => raw.startsWith(`${origin}/hs/qr#`) || raw.startsWith(`${origin}${HOC_PATH.qr}#`);
