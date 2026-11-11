// Lõi gọi API dùng ở JS lần đầu (lớp dữ liệu ui/data): lỗi HTTP, header đăng nhập + tổ chức. api.ts re-export cho mã cũ.
import { userManager } from "./auth";

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
export async function authHeaders(): Promise<Record<string, string>> {
  const user = await userManager.getUser();
  if (!user || user.expired) {
    void userManager.removeUser();
    throw new ApiError(401, { error: "Hết phiên đăng nhập" });
  }
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}` };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
  return headers;
}

