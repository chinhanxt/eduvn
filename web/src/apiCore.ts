// Lõi gọi API dùng ở JS lần đầu (lớp dữ liệu ui/data): lỗi HTTP, header đăng nhập + tổ chức. api.ts re-export cho mã cũ.
import { getUserManager, readStoredUser, userManager } from "./auth";

export const ORG_KEY = "eduvn.org";
export const getOrgId = () => window.localStorage.getItem(ORG_KEY);
export const setOrgId = (id: string) => window.localStorage.setItem(ORG_KEY, id);

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super((body as { error?: string } | null)?.error ?? `HTTP ${status}`);
  }
}

/** Header đăng nhập Keycloak + tổ chức đang chọn; hết phiên → ApiError 401. Dùng chung cho api() và lớp dữ liệu ui/data. */
let oidcReady = false;
if (typeof window !== "undefined" && readStoredUser()) {
  const load = () => void getUserManager().then(() => (oidcReady = true));
  if (window.requestIdleCallback) window.requestIdleCallback(load, { timeout: 1500 });
  else load();
}
export async function authHeaders(): Promise<Record<string, string>> {
  // Chưa tải xong oidc: dùng token đã lưu (còn hạn ≥ 30 s) để gọi API ngay — không chờ thêm một lượt mạng.
  const user = (!oidcReady && readStoredUser()) || (await userManager.getUser());
  if (!user || user.expired) {
    void userManager.removeUser();
    throw new ApiError(401, { error: "Hết phiên đăng nhập" });
  }
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}` };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
  return headers;
}

