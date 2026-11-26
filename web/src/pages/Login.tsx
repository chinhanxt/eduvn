import { useEffect, useState } from "react";
import { AFTER_LOGIN_KEY, finishLogin, useAuth } from "../auth";
import spriteUrl from "../ui/icons.svg?url";
import "./login.css";

type Idp = "google" | "microsoft" | "email";

/**
 * Icon v2 (cùng sprite ui/icons.svg) cho trang gốc: không import ui/Icon.tsx — module dùng chung cả 3 entry sẽ bị đẩy
 * vào chunk chung của cổng GV/Học và làm tăng JS lần đầu của hai cổng. Đấu trường (/choi) dùng lại từ đây.
 */
export function Icon({ name, size }: { name: string; size?: "sm" }) {
  return (
    <svg className={size ? "i sm" : "i"} aria-hidden="true" focusable="false">
      <use href={`${spriteUrl}#i-${name}`} />
    </svg>
  );
}

/** Vòng lặp lõi: Phát hiện → Cá nhân hoá → Báo đúng người (SVG, chấm sáng chạy quanh vòng). */
export function Loop() {
  const N = [
    { x: 160, y: 34, t: "Phát hiện", i: "search" },
    { x: 269, y: 223, t: "Cá nhân hoá", i: "spark" },
    { x: 51, y: 223, t: "Báo đúng người", i: "send" },
  ];
  return (
    <svg className="lp" viewBox="0 0 320 300" role="img" aria-label="Vòng lặp: phát hiện lỗ hổng, cá nhân hoá bài học, báo đúng người">
      <circle className="lp-ring" cx="160" cy="160" r="126" />
      <circle className="lp-arc" cx="160" cy="160" r="126" pathLength={100} />
      <g className="lp-run"><circle cx="160" cy="34" r="6" /></g>
      {N.map((n, k) => (
        <g key={n.t} className={`lp-n k${k}`} style={{ ["--k" as string]: k }} transform={`translate(${n.x},${n.y})`}>
          <circle r="26" />
          <use href={`${spriteUrl}#i-${n.i}`} x="-11" y="-11" width="22" height="22" className="lp-i" />
          <text x={k === 0 ? 0 : k === 1 ? 24 : -24} y={k === 0 ? -40 : 50} textAnchor={k === 0 ? "middle" : k === 1 ? "start" : "end"}>{n.t}</text>
        </g>
      ))}
      <text className="lp-c" x="160" y="166" textAnchor="middle">AI</text>
    </svg>
  );
}

/** Đăng nhập (/dang-nhap, token v2): GV/SV bằng tài khoản; HS vào lớp bằng mã; đấu trường bằng PIN. */
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
        <a className="lgv-brand" href="/"><span className="lgv-mark"><Icon name="cap" /></span>EDUVN</a>
        <Loop />
        <p className="lgv-quote">Mỗi em một lối học.</p>
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
          <a className="lgv-btn main" href="/dang-nhap"><span>Thử lại</span></a>
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
