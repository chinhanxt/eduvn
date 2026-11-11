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
if (typeof window !== "undefined" && hasStoredUser()) void getUserManager();

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
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onLoaded = (u: User) => setUser(u);
    const onGone = () => setUser(null);
    let um: UserManager | null = null;
    let live = true;
    const isCallback = window.location.pathname === "/callback";
    // Chưa từng đăng nhập: không chờ tải oidc.
    if (isCallback || !hasStoredUser()) setReady(true);
    if (!isCallback && !hasStoredUser()) return;
    void getUserManager().then((m) => {
      if (!live) return;
      um = m;
      m.events.addUserLoaded(onLoaded);
      m.events.addUserUnloaded(onGone);
      m.events.addAccessTokenExpired(onGone);
      if (!isCallback)
        m.getUser()
          .then((u) => live && setUser(u && !u.expired ? u : null))
          .finally(() => live && setReady(true));
    });
    return () => {
      live = false;
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
