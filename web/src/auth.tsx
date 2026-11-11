import type { SigninRedirectArgs, User, UserManager } from "oidc-client-ts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Trang quay về sau khi đăng nhập Keycloak (khu HS: /hs?ma=…). */
export const AFTER_LOGIN_KEY = "eduvn.after";
const KEYCLOAK = (import.meta.env.VITE_OIDC_AUTHORITY as string | undefined) ?? "http://localhost:8180/realms/eduvn";

/**
 * oidc-client-ts (~18 KB gzip) tải riêng, không nằm trong JS lần đầu của cổng: bắt đầu tải ngay khi module này chạy
 * (song song với vẽ khung), mọi lệnh gọi chờ cùng một promise.
 */
let mgr: Promise<UserManager> | null = null;
export function getUserManager(): Promise<UserManager> {
  mgr ??= import("oidc-client-ts").then(
    ({ UserManager: UM, WebStorageStateStore }) =>
      new UM({
        authority: KEYCLOAK,
        client_id: "eduvn-dev",
        redirect_uri: `${window.location.origin}/callback`,
        post_logout_redirect_uri: window.location.origin,
        response_type: "code",
        scope: "openid profile email",
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        automaticSilentRenew: true,
      }),
  );
  return mgr;
}
/** Có phiên Keycloak đã lưu (đọc đồng bộ, không cần tải oidc) — để chưa đăng nhập thì hiện trang đăng nhập ngay. */
export const hasStoredUser = (): boolean => {
  try {
    return Object.keys(window.localStorage).some((k) => k.startsWith("oidc.user:"));
  } catch {
    return false;
  }
};

/**
 * Phiên Keycloak đã lưu, đọc đồng bộ (JSON của oidc-client-ts) — để vẽ khung + gọi API ngay khi trang mở,
 * không chờ tải thư viện oidc. Thư viện tải xong sẽ thay bằng đối tượng User thật (gia hạn ngầm, sự kiện).
 */
export function readStoredUser(): User | null {
  try {
    const k = Object.keys(window.localStorage).find((x) => x.startsWith("oidc.user:"));
    if (!k) return null;
    const u = JSON.parse(window.localStorage.getItem(k) ?? "null") as (Partial<User> & { expires_at?: number }) | null;
    if (!u?.access_token || !u.expires_at || u.expires_at * 1000 <= Date.now() + 30_000) return null;
    return { ...u, expired: false, expires_in: u.expires_at - Math.floor(Date.now() / 1000) } as unknown as User;
  } catch {
    return null;
  }
}
/** Tải oidc: phiên đã lưu còn hạn → lúc trình duyệt rảnh (không tranh CPU với lần vẽ đầu); hết hạn → ngay để gia hạn. */
if (typeof window !== "undefined" && hasStoredUser()) {
  if (readStoredUser() && window.requestIdleCallback) window.requestIdleCallback(() => void getUserManager(), { timeout: 1500 });
  else void getUserManager();
}

/** Lớp mỏng giữ API cũ (userManager.getUser() …) cho mã hiện có. */
export const userManager = {
  getUser: (): Promise<User | null> => getUserManager().then((m) => m.getUser()),
  removeUser: (): Promise<void> => getUserManager().then((m) => m.removeUser()),
  signinRedirect: (args?: SigninRedirectArgs): Promise<void> => getUserManager().then((m) => m.signinRedirect(args)),
  signoutRedirect: (): Promise<void> => getUserManager().then((m) => m.signoutRedirect()),
  signinRedirectCallback: (): Promise<User> => getUserManager().then((m) => m.signinRedirectCallback()),
};

type AuthState = { user: User | null; ready: boolean; login: (idp?: "google" | "microsoft") => void; logout: () => void };
const Ctx = createContext<AuthState | null>(null);

let callback: Promise<User | undefined> | null = null;
/** Chỉ xử lý /callback một lần (StrictMode gọi effect hai lần). */
export function finishLogin(): Promise<User | undefined> {
  callback ??= userManager.signinRedirectCallback();
  return callback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Có phiên đã lưu còn hạn → sẵn sàng ngay (vẽ khung, gọi API); thư viện oidc tải song song rồi thay bằng User thật.
  const [user, setUser] = useState<User | null>(() => (window.location.pathname === "/callback" ? null : readStoredUser()));
  const [ready, setReady] = useState(() => user !== null);

  useEffect(() => {
    const onLoaded = (u: User) => setUser(u);
    const onGone = () => setUser(null);
    let um: UserManager | null = null;
    let live = true;
    const isCallback = window.location.pathname === "/callback";
    // Chưa từng đăng nhập: không chờ tải oidc.
    if (isCallback || !hasStoredUser()) setReady(true);
    if (!isCallback && !hasStoredUser()) return;
    const attach = () => void getUserManager().then((m) => {
      if (!live) return;
      um = m;
      m.events.addUserLoaded(onLoaded);
      m.events.addUserUnloaded(onGone);
      m.events.addAccessTokenExpired(onGone);
      if (!isCallback)
        m.getUser()
          // cùng token với bản đọc nhanh → giữ đối tượng cũ, khỏi vẽ lại cả cây
          .then((u) => live && setUser((prev) => (u && !u.expired ? (prev && prev.access_token === u.access_token ? prev : u) : null)))
          .finally(() => live && setReady(true));
    });
    // Đã sẵn sàng nhờ phiên đọc nhanh → gắn oidc lúc rảnh; còn lại (callback, phiên hết hạn) → ngay.
    let idle = 0;
    if (!isCallback && readStoredUser() && window.requestIdleCallback) idle = window.requestIdleCallback(attach, { timeout: 1500 });
    else attach();
    return () => {
      live = false;
      if (idle) window.cancelIdleCallback(idle);
      um?.events.removeUserLoaded(onLoaded);
      um?.events.removeUserUnloaded(onGone);
      um?.events.removeAccessTokenExpired(onGone);
    };
  }, []);

  const login = useCallback((idp?: "google" | "microsoft") => {
    void userManager.signinRedirect(idp ? { extraQueryParams: { kc_idp_hint: idp } } : undefined);
  }, []);
  const logout = useCallback(() => {
    void userManager.removeUser().then(() => userManager.signoutRedirect());
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <Ctx value={value}>{children}</Ctx>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
