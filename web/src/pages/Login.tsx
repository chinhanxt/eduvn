import { useEffect, useState } from "react";
import { AFTER_LOGIN_KEY, finishLogin, useAuth } from "../auth";
import { Icon } from "../ui/Icon";
import "../ui/styles/fonts.css";
import "../ui/styles/tokens.css";
import "./login.css";

type Idp = "google" | "microsoft" | "email";

/** Đăng nhập (trang gốc, token v2): GV/SV bằng tài khoản; HS vào lớp bằng mã; đấu trường bằng PIN. */
export function Login() {
  const { login } = useAuth();
  const [busy, setBusy] = useState<Idp | null>(null);
  useEffect(() => {
    document.title = "Đăng nhập · EDUVN";
  }, []);
  const go = (idp: Idp) => {
    if (busy) return; // chuyển sang trang đăng nhập: chặn bấm lặp
    setBusy(idp);
    login(idp === "email" ? undefined : idp);
    // quay lại bằng nút Back (bfcache) → mở khoá
    window.addEventListener("pageshow", () => setBusy(null), { once: true });
  };
  const btn = (idp: Idp, icon: string, label: string, main?: boolean) => (
    <button type="button" className={main ? "lgv-btn main" : "lgv-btn"} aria-busy={busy === idp || undefined} disabled={!!busy && busy !== idp} onClick={() => go(idp)}>
      {busy === idp ? <span className="lgv-spin" aria-hidden="true" /> : <Icon name={icon} size="sm" />}
      <span>{label}</span>
    </button>
  );
  return (
    <div className="lgv">
      <section className="lgv-art" aria-hidden="true">
        <div className="lgv-brand"><span className="lgv-mark"><Icon name="cap" /></span>EDUVN</div>
        <div className="lgv-quote">
          <p>Một nơi cho cả lớp học:<br />soạn, giao, chấm — và học.</p>
          <div className="lgv-grid">
            {["Soạn đề theo ma trận", "Chấm ảnh bài làm", "Gia sư AI", "Lộ trình thành thạo"].map((t, i) => (
              <span key={t} style={{ ["--i" as string]: i }}>{t}</span>
            ))}
          </div>
        </div>
        <small>Trường học trực tuyến cho giáo viên và học sinh Việt Nam</small>
      </section>
      <main className="lgv-main">
        <div className="lgv-card">
          <h1>Đăng nhập</h1>
          <p className="lgv-sub">Giáo viên, sinh viên và học sinh có tài khoản</p>
          {btn("google", "key", "Tiếp tục với Google", true)}
          {btn("microsoft", "org", "Microsoft / tài khoản trường")}
          {btn("email", "mail", "Email và mật khẩu")}
          <div className="lgv-or"><span>Học sinh</span></div>
          <a className="lgv-btn hs" href="/hoc/bai-tap"><Icon name="exam" size="sm" /><span>Vào lớp bằng mã lớp + PIN</span><Icon name="right" size="sm" /></a>
          <a className="lgv-btn hs" href="/choi"><Icon name="game" size="sm" /><span>Vào đấu trường bằng mã PIN</span><Icon name="right" size="sm" /></a>
        </div>
        <p className="lgv-foot">Thư viện <a href="/loi-giai">lời giải công khai</a> — xem không cần đăng nhập.</p>
      </main>
    </div>
  );
}

export function Callback() {
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    finishLogin()
      .then(() => {
        const after = window.sessionStorage.getItem(AFTER_LOGIN_KEY);
        window.sessionStorage.removeItem(AFTER_LOGIN_KEY);
        window.location.replace(after && /^\/(hs|hoc|gv)(\/|\?|$)/.test(after) ? after : "/");
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Lỗi đăng nhập"));
  }, []);
  return (
    <div className="lgv-center" role="status">
      {err ? (
        <div className="lgv-card">
          <h1>Chưa đăng nhập được</h1>
          <p className="lgv-sub">{err}</p>
          <a className="lgv-btn main" href="/"><span>Thử lại</span></a>
        </div>
      ) : (
        <>
          <span className="lgv-spin big" aria-hidden="true" />
          <span>Đang đăng nhập…</span>
        </>
      )}
    </div>
  );
}
