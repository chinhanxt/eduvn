import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Trang quay về sau khi đăng nhập Keycloak (khu HS: /hs?ma=…). */
export const AFTER_LOGIN_KEY = "eduvn.after";
const KEYCLOAK = (import.meta.env.VITE_OIDC_AUTHORITY as string | undefined) ?? "http://localhost:8180/realms/eduvn";

export const userManager = new UserManager({
  authority: KEYCLOAK,
  client_id: "eduvn-dev",
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
});

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
    userManager.events.addUserLoaded(onLoaded);
    userManager.events.addUserUnloaded(onGone);
    userManager.events.addAccessTokenExpired(onGone);
    if (window.location.pathname === "/callback") {
      setReady(true);
    } else {
      userManager
        .getUser()
        .then((u) => setUser(u && !u.expired ? u : null))
        .finally(() => setReady(true));
    }
    return () => {
      userManager.events.removeUserLoaded(onLoaded);
      userManager.events.removeUserUnloaded(onGone);
      userManager.events.removeAccessTokenExpired(onGone);
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
