import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router";
import { MathText } from "../math/MathText";
import { Mascot } from "../portal/hoc/Mascot";
import { Icon } from "../pages/Login";
import { Avatar, CountUp, confetti } from "./fx";
import { LETTERS, type PlayerState, useLeftMs, useStream } from "./live";
// font + token v2 đã có trong CSS entry gốc (pages/login.css)
import "./play.css";

type Info = { title: string; phase: string; players: number; roster: { id: string; name: string; taken: boolean }[] | null };
const KEY = (pin: string) => `eduvn.live.${pin}`;

async function call<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new Error(data.error ?? `Lỗi ${r.status}`);
  return data as T;
}
const errText = (e: unknown) => (e instanceof TypeError ? "Mất mạng — kiểm tra kết nối rồi thử lại" : (e as Error).message);

/** Thông báo ngắn tự tắt (trang công khai không có khung toast của cổng). */
function useFlash(): [string | null, (m: string) => void] {
  const [m, setM] = useState<string | null>(null);
  const t = useRef(0);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return [
    m,
    useCallback((x: string) => {
      window.clearTimeout(t.current);
      setM(x);
      t.current = window.setTimeout(() => setM(null), 4000);
    }, []),
  ];
}

/** Khung trang đấu trường: cổng Học (lục lam), sáng/tối theo cài đặt. */
function useHocSkin() {
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.dataset.portal;
    el.dataset.portal = "hoc";
    document.title = "Đấu trường · EDUVN";
    return () => {
      if (prev) el.dataset.portal = prev;
      else delete el.dataset.portal;
    };
  }, []);
}

/** Trang công khai cho học sinh: /choi?pin=123456 */
export function Play() {
  useHocSkin();
  const [params, setParams] = useSearchParams();
  const [pin, setPin] = useState(params.get("pin") ?? "");
  const [token, setToken] = useState<string | null>(() => {
    const p = params.get("pin");
    return p ? window.localStorage.getItem(KEY(p)) : null;
  });
  const [info, setInfo] = useState<Info | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [looking, setLooking] = useState(() => /^\d{6}$/.test(params.get("pin") ?? "") && !token);

  const lookup = async (p: string) => {
    if (busy) return;
    setBusy("pin");
    setError(null);
    try {
      setInfo(await call<Info>(`/api/live/pin/${p}`));
      setParams({ pin: p }, { replace: true }); // mã PIN trong URL: tải lại vẫn đúng phòng
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
      setLooking(false);
    }
  };
  useEffect(() => {
    const p = params.get("pin");
    if (p && /^\d{6}$/.test(p) && !token && !info) void lookup(p);
  }, [params, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async (body: { name?: string; studentId?: string }) => {
    if (busy) return;
    setBusy(body.studentId ?? "name");
    setError(null);
    try {
      const r = await call<{ token: string }>(`/api/live/pin/${pin}/join`, body);
      window.localStorage.setItem(KEY(pin), r.token);
      window.history.replaceState(null, "", `/choi?pin=${pin}`);
      setToken(r.token);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };
  const back = () => {
    setInfo(null);
    setError(null);
    setParams({}, { replace: true });
  };

  if (token)
    return (
      <Game
        pin={pin}
        token={token}
        onGone={(m) => {
          window.localStorage.removeItem(KEY(pin));
          setToken(null);
          setInfo(null);
          setError(m);
        }}
      />
    );
  return (
    <div className="pv pv-join">
      <header className="pv-top"><span className="pv-mark"><Icon name="cap" size="sm" /></span><b>EDUVN</b><span className="pv-tag">Đấu trường</span></header>
      <main className="pv-card" key={info ? (info.roster ? "roster" : "name") : "pin"}>
        <Mascot mood="chao" size={64} className="pv-mam" />
        {looking ? (
          <div className="pv-skel" aria-busy="true" aria-label="Đang tìm phòng"><i /><i /><i className="b" /></div>
        ) : !info ? (
          <form onSubmit={(e) => { e.preventDefault(); if (pin.length === 6) void lookup(pin); }}>
            <h1>Nhập mã PIN</h1>
            <p className="pv-sub">Mã 6 số trên màn hình của thầy cô</p>
            <input className="pv-input pin" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="123456" aria-label="Mã PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} data-testid="pl-pin" autoFocus />
            <button type="submit" className="pv-btn main" aria-busy={busy === "pin" || undefined} disabled={!!busy || pin.length !== 6} data-testid="pl-go">{busy === "pin" ? <span className="pv-spin" /> : null}Vào phòng</button>
          </form>
        ) : info.roster ? (
          <>
            <h1>Bạn là ai?</h1>
            <p className="pv-sub">{info.title} · {info.players} bạn đã vào</p>
            <div className="pv-roster" data-testid="pl-roster">
              {info.roster.map((s) => (
                <button type="button" key={s.id} className="pv-pick" aria-busy={busy === s.id || undefined} disabled={!!busy || s.taken} onClick={() => void join({ studentId: s.id })}>
                  {s.name}
                  {s.taken && <small>đã vào</small>}
                </button>
              ))}
            </div>
            <button type="button" className="pv-link" onClick={back}><Icon name="left" size="sm" />Nhập mã khác</button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void join({ name }); }}>
            <h1>Chọn biệt danh</h1>
            <p className="pv-sub">{info.title} · {info.players} bạn đã vào</p>
            <input className="pv-input" maxLength={24} placeholder="Biệt danh của bạn" aria-label="Biệt danh" value={name} onChange={(e) => setName(e.target.value)} data-testid="pl-name" autoFocus />
            <button type="submit" className="pv-btn main" aria-busy={busy === "name" || undefined} disabled={!!busy || !name.trim()} data-testid="pl-join">{busy === "name" ? <span className="pv-spin" /> : null}Tham gia</button>
            <button type="button" className="pv-link" onClick={back}><Icon name="left" size="sm" />Nhập mã khác</button>
          </form>
        )}
        {error && <div className="pv-err" role="alert" data-testid="pl-error"><Icon name="alert" size="sm" />{error}</div>}
      </main>
      <p className="pv-foot">Có tài khoản lớp? <a href="/hoc/bai-tap">Vào khu Bài tập</a></p>
    </div>
  );
}

function Game({ pin, token, onGone }: { pin: string; token: string; onGone: (m: string) => void }) {
  const { state: s, skew, live } = useStream<PlayerState>(`/api/live/stream?t=${encodeURIComponent(token)}`, onGone);
  const left = useLeftMs(s, skew);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<{ q: number; choice?: number; text?: string } | null>(null);
  const [flash, setFlash] = useFlash();
  const cv = useRef<HTMLCanvasElement>(null);
  const sending = useRef(false);
  const qi = s?.qi ?? -1;
  const phase = s?.phase;
  useEffect(() => setText(""), [qi]);
  useEffect(() => {
    if (phase === "ended" && cv.current) return confetti(cv.current, 0.5);
  }, [phase]);

  const send = useCallback(
    async (choice?: number) => {
      if (!s || sending.current || sent?.q === s.qi) return; // chặn bấm lặp
      sending.current = true;
      navigator.vibrate?.(18);
      setSent({ q: s.qi, choice, text: choice === undefined ? text.trim() : undefined });
      try {
        await call("/api/live/answer", { t: token, q: s.qi, ...(choice !== undefined ? { choice } : { text }) });
      } catch (e) {
        setSent(null);
        setFlash(errText(e));
      } finally {
        sending.current = false;
      }
    },
    [s, token, text, sent, setFlash],
  );

  if (!s)
    return (
      <div className="pv pv-game" aria-busy="true">
        <header className="pv-head"><span className="pv-skel-av" /><span className="pv-skel-line" /></header>
        <div className="pv-mid"><div className="pv-skel"><i /><i className="b" /></div><p className="pv-sub">Đang kết nối phòng {pin}…</p></div>
      </div>
    );
  const q = s.question;
  const mine = sent?.q === s.qi ? sent : null;
  const answered = s.answered || !!mine;
  const pct = s.limitMs > 0 ? Math.min(100, (left / s.limitMs) * 100) : 0;
  const secs = Math.ceil(left / 1000);
  const tone = secs <= 2 ? "crit" : secs <= 5 ? "warn" : "";
  const move = s.me.prevRank > 0 ? s.me.prevRank - s.me.rank : 0;
  const ok = !!s.result?.ok;

  return (
    <div className="pv pv-game" data-testid="pl-game" data-phase={s.phase}>
      <canvas ref={cv} className="pv-confetti" aria-hidden="true" />
      <header className="pv-head">
        <Avatar name={s.name} size={36} />
        <span className="pv-name">{s.name}</span>
        {s.me.rank > 0 && <span className="pv-rank">Hạng {s.me.rank}</span>}
        <b className="pv-score" aria-label={`${s.me.score} điểm`}>{s.me.score}</b>
      </header>
      {!live && <div className="pv-bar warn" role="status"><Icon name="offline" size="sm" />Mất kết nối — đang nối lại…</div>}
      {flash && <div className="pv-toast" role="status">{flash}</div>}

      {s.phase === "lobby" && (
        <div className="pv-mid">
          <Mascot mood="chao" size={96} />
          <div className="pv-big">Bạn đã vào phòng</div>
          <div className="pv-sub">PIN {pin} · chờ thầy cô bắt đầu<span className="pv-dots"><i /><i /><i /></span></div>
        </div>
      )}

      {s.phase === "question" && q && (
        <div className="pv-q" key={`q${q.i}`}>
          <div className="pv-timer">
            <div className="pv-track"><i style={{ transform: `scaleX(${pct / 100})` }} className={tone} /></div>
            <span className={tone} role="timer" aria-label={`Còn ${secs} giây`}>{s.paused ? "‖" : secs}</span>
          </div>
          <div className="pv-qtext"><small>Câu {q.i + 1}/{s.total}</small><MathText value={q.q} /></div>
          {s.paused && <div className="pv-bar" role="status"><Icon name="pause" size="sm" />Thầy cô đang tạm dừng</div>}
          {answered ? (
            <div className="pv-wait">
              {mine?.choice !== undefined ? (
                <div className={`pv-chosen t${mine.choice}`}><span className="pv-letter">{LETTERS[mine.choice]}</span><MathText value={q.options?.[mine.choice] ?? ""} /></div>
              ) : mine?.text ? (
                <div className="pv-chosen t2"><MathText value={mine.text} /></div>
              ) : null}
              <div className="pv-sub">{mine?.choice !== undefined ? `Đã chọn ${LETTERS[mine.choice]} — chờ cả lớp` : "Đã gửi — chờ cả lớp"}<span className="pv-dots"><i /><i /><i /></span></div>
            </div>
          ) : q.kind === "choice" ? (
            <div className={`pv-tiles${(q.options?.length ?? 4) === 2 ? " two" : ""}`}>
              {q.options?.map((o, i) => (
                <button type="button" key={i} className={`pv-tile t${i}`} style={{ "--i": i } as CSSProperties} disabled={s.paused || left <= 0} onClick={() => void send(i)} data-testid={`pl-opt-${i}`}>
                  <span className="pv-letter">{LETTERS[i]}</span>
                  <span className="pv-opt"><MathText value={o} /></span>
                </button>
              ))}
            </div>
          ) : (
            <form className="pv-textrow" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void send(); }}>
              <input className="pv-input" placeholder="Gõ đáp án" aria-label="Đáp án" value={text} onChange={(e) => setText(e.target.value)} data-testid="pl-text" autoFocus />
              <button type="submit" className="pv-btn main" disabled={!text.trim() || s.paused || left <= 0} data-testid="pl-send">Gửi</button>
            </form>
          )}
        </div>
      )}

      {s.phase === "reveal" && (
        <div className={`pv-res ${ok ? "ok" : "bad"}`} data-testid="pl-result" key={`r${s.qi}`}>
          <Mascot mood={ok ? "khen" : "dong-vien"} size={104} />
          <div className="pv-big">{ok ? "Đúng rồi!" : s.result?.answered ? "Chưa đúng" : "Chưa kịp trả lời"}</div>
          {ok && <div className="pv-gain">+<CountUp to={s.result?.pts ?? 0} ms={700} />{s.me.streak >= 2 && <em> · chuỗi {s.me.streak}</em>}</div>}
          {!ok && s.result && <div className="pv-correct"><small>Đáp án đúng</small><MathText value={s.result.answer} /></div>}
          <div className="pv-rankline">Hạng <b>{s.me.rank}</b>/{s.me.of}{move !== 0 && <span className={move > 0 ? "up" : "dn"}>{move > 0 ? "↑" : "↓"}{Math.abs(move)}</span>}<em>·</em><b>{s.me.score}</b> điểm</div>
          {s.result?.explain && <div className="pv-explain"><MathText value={s.result.explain} /></div>}
        </div>
      )}

      {s.phase === "ended" && (
        <div className="pv-end" data-testid="pl-end">
          <div className="pv-eyebrow">Kết thúc trận</div>
          <div className={`pv-final r${Math.min(s.me.rank, 4)}`}><small>Hạng</small><b>{s.me.rank}</b><small>/{s.me.of}</small></div>
          <div className="pv-finalscore"><CountUp to={s.me.score} ms={1200} /> <small>điểm</small></div>
          {s.me.rank > 0 && s.me.rank <= 3 ? <Mascot mood="khen" size={64} say="Bạn trên bục vinh danh!" /> : <Mascot mood="chao" size={64} say="Trận sau bứt phá nhé!" />}
          <ol className="pv-top3">
            {(s.podium ?? []).map((t, i) => (
              <li key={i}><span className="pk">{i + 1}</span><Avatar name={t.name} size={30} /><span className="pn">{t.name}</span><b>{t.score}</b></li>
            ))}
          </ol>
          <button type="button" className="pv-btn" onClick={() => { window.localStorage.removeItem(KEY(pin)); window.location.assign("/choi"); }}>Chơi trận khác</button>
        </div>
      )}
    </div>
  );
}
