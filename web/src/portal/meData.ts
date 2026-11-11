import type { Me } from "../api";
import { request } from "../ui/data/http";

/** /api/me dùng chung 2 cổng (vai trò, tổ chức) — cache 5 phút trong lớp dữ liệu. */
export const ME_KEY = "me";
export const fetchMe = (signal: AbortSignal) => request<Me>("/api/me", { signal });
