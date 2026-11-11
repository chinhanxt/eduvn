import { createContext, useContext } from "react";
import type { Me } from "../api";

/** Thông tin tài khoản Keycloak (/api/me) cho các trang trong khung cổng. null = chưa có/không phải GV. */
export const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx);

export const ROLE_VI: Record<string, string> = { owner: "Chủ sở hữu", admin: "Quản trị", teacher: "Giáo viên", assistant: "Trợ giảng", student: "Học viên" };
/** Chữ cái đầu cho avatar: "Nguyễn Minh Anh" → "MA" (họ Việt đứng trước nên lấy 2 chữ cuối). */
export function initialsOf(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  const w = (raw.includes("@") ? raw.split("@")[0]! : raw).split(/[\s._-]+/).filter(Boolean);
  if (!w.length) return "?";
  const pick = w.length >= 2 ? [w[w.length - 2]!, w[w.length - 1]!] : [w[0]!];
  return pick.map((x) => x.charAt(0).toUpperCase()).join("");
}
