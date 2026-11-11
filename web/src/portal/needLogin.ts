import { AFTER_LOGIN_KEY } from "../auth";

/** Chưa đăng nhập Keycloak: nhớ trang đang mở rồi về trang đăng nhập gốc (index.html). */
export function goLogin(): void {
  const l = window.location;
  window.sessionStorage.setItem(AFTER_LOGIN_KEY, `${l.pathname}${l.search}${l.hash}`);
  window.location.replace("/");
}
