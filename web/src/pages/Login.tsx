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
export function Loop({ big }: { big?: boolean }) {
  const N = [
    { x: 160, y: 34, t: "Phát hiện", i: "search" },
    { x: 269, y: 223, t: "Cá nhân hoá", i: "spark" },
    { x: 51, y: 223, t: "Báo đúng người", i: "send" },
  ];
  return (
    <svg className={big ? "lp big" : "lp"} viewBox="0 0 320 300" role="img" aria-label="Vòng lặp: phát hiện lỗ hổng, cá nhân hoá bài học, báo đúng người">
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

const DOORS = [
  { to: "/gv", k: "gv", name: "Giáo viên", say: "Soạn, giao, chấm" },
  { to: "/hoc", k: "hoc", name: "Học sinh", say: "Học vừa sức" },
  { to: "/phu-huynh", k: "ph", name: "Phụ huynh", say: "Biết con học ra sao" },
  { to: "/truong", k: "tr", name: "Nhà trường", say: "Thấy bức tranh chung" },
] as const;

/** Hình nhỏ riêng cho từng cửa (không lặp một kiểu icon). */
function DoorArt({ k }: { k: (typeof DOORS)[number]["k"] }) {
  if (k === "gv")
    return (
      <svg viewBox="0 0 120 64" aria-hidden="true">
        {[38, 52, 30, 58, 44, 24, 50].map((h, i) => <rect key={i} x={6 + i * 16} y={64 - h} width="10" height={h} rx="2" style={{ ["--i" as string]: i }} />)}
      </svg>
    );
  if (k === "hoc")
    return (
      <svg viewBox="0 0 120 64" aria-hidden="true">
        <circle cx="32" cy="32" r="24" className="tr" />
        <circle cx="32" cy="32" r="24" className="v" pathLength={100} transform="rotate(-90 32 32)" />
        <text x="32" y="38" textAnchor="middle">7/8</text>
        <path d="M70 46 l10 -10 l10 6 l18 -22" className="ln" />
      </svg>
    );
  if (k === "ph")
    return (
      <svg viewBox="0 0 120 64" aria-hidden="true">
        <rect x="6" y="8" width="96" height="40" rx="14" className="bb" />
        <path d="M24 48 l-6 12 l16 -12z" className="bb" />
        <text x="54" y="34" textAnchor="middle">Con học ổn</text>
      </svg>
    );
  return (
    <svg viewBox="0 0 120 64" aria-hidden="true">
      {Array.from({ length: 21 }, (_, i) => <rect key={i} x={6 + (i % 7) * 16} y={6 + Math.floor(i / 7) * 19} width="13" height="16" rx="3" style={{ opacity: [0.25, 0.5, 0.85, 0.4, 0.65, 1, 0.3][(i * 5) % 7] }} />)}
    </svg>
  );
}

/** Trang gốc cho khách: giới thiệu EDUVN, ít chữ, dẫn vào 4 cổng. */
export function Intro() {
  useEffect(() => {
    document.title = "EDUVN · Dạy và học cùng AI";
  }, []);
  return (
    <div className="itr">
      <header className="itr-top">
        <a className="lgv-brand" href="/"><span className="lgv-mark"><Icon name="cap" /></span>EDUVN</a>
        <nav className="itr-nav" aria-label="Trang công khai">
          <a href="/loi-giai">Lời giải</a>
          <a href="/choi">Đấu trường</a>
          <a className="lgv-btn sm" href="/dang-nhap"><span>Đăng nhập</span></a>
        </nav>
      </header>
      <main>
        <section className="itr-hero">
          <div className="itr-hero-t">
            <div className="itr-eye">Dạy và học cùng AI · mọi môn, mọi cấp</div>
            <h1>Mỗi em một lối học.</h1>
            <p>AI tìm chỗ hổng, soạn bài vừa sức, báo đúng người.</p>
            <div className="itr-acts">
              <a className="lgv-btn main" href="/dang-nhap"><span>Bắt đầu</span><Icon name="right" size="sm" /></a>
              <a className="itr-link" href="/hoc/bai-tap">Vào lớp bằng mã<Icon name="right" size="sm" /></a>
            </div>
          </div>
          <Loop big />
        </section>
        <section className="itr-doors" aria-label="Chọn cổng">
          {DOORS.map((d, i) => (
            <a key={d.k} className={`itr-door d-${d.k}`} href={d.to} style={{ ["--i" as string]: i }}>
              <DoorArt k={d.k} />
              <b>{d.name}</b>
              <span>{d.say}</span>
              <Icon name="right" size="sm" />
            </a>
          ))}
        </section>
        <section className="itr-proof" aria-label="Thời gian tiết kiệm">
          <div><b>3 giờ<i>→</i>25 phút</b><span>soạn một bài giảng</span></div>
          <div><b>2 giờ<i>→</i>3 phút</b><span>chấm 40 bài kiểm tra</span></div>
          <div><b>15</b><span>môn, từ lớp 6 đến đại học</span></div>
        </section>
      </main>
      <footer className="itr-foot">
        <span>EDUVN · môi trường dạy và học có AI theo chương trình 2018</span>
        <a href="/loi-giai">Thư viện lời giải</a>
      </footer>
    </div>
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
