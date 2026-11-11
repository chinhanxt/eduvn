import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AFTER_LOGIN_KEY, finishLogin, useAuth } from "../auth";
import { Icon } from "../Icon";

export function Login() {
  const { login } = useAuth();
  return (
    <div className="login">
      <div className="box">
        <div className="brand"><span className="mark"><Icon name="cap" /></span>EDUVN</div>
        <div className="sub">Trợ lý cho giáo viên</div>
        <button className="sso main" onClick={() => login("google")}><Icon name="key" />Đăng nhập với Google</button>
        <button className="sso" onClick={() => login("microsoft")}><Icon name="org" />Microsoft / tài khoản trường</button>
        <button className="sso" onClick={() => login()}><Icon name="mail" />Email</button>
      </div>
    </div>
  );
}

export function Callback() {
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    finishLogin()
      .then(() => {
        const after = window.sessionStorage.getItem(AFTER_LOGIN_KEY);
        window.sessionStorage.removeItem(AFTER_LOGIN_KEY);
        window.location.replace(after && /^\/(hs|hoc|gv)(\/|\?|$)/.test(after) ? after : "/");
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Lỗi đăng nhập"));
  }, [nav]);
  return <div className="center">{err ?? "…"}</div>;
}
