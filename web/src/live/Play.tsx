import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { MathText } from "../math/MathText";
import { Avatar, CountUp, confetti } from "./fx";
import { LETTERS, type PlayerState, useLeftMs, useStream } from "./live";
import "./live.css";

type Info = { title: string; phase: string; players: number; roster: { id: string; name: string; taken: boolean }[] | null };
const KEY = (pin: string) => `eduvn.live.${pin}`;

async function call<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new Error(data.error ?? `Lỗi ${r.status}`);
  return data as T;
}

/** Trang công khai cho học sinh: /choi?pin=123456 */
export function Play() {
  const [params] = useSearchParams();
  const [pin, setPin] = useState(params.get("pin") ?? "");
  const [token, setToken] = useState<string | null>(() => {
    const p = params.get("pin");
    return p ? window.localStorage.getItem(KEY(p)) : null;
  });
  const [info, setInfo] = useState<Info | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (p: string) => {
    setBusy(true);
    setError(null);
    try {
      setInfo(await call<Info>(`/api/live/pin/${p}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const p = params.get("pin");
    if (p && /^\d{6}$/.test(p) && !token) void lookup(p);
  }, [params, token]);

  const join = async (body: { name?: string; studentId?: string }) => {
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ token: string }>(`/api/live/pin/${pin}/join`, body);
      window.localStorage.setItem(KEY(pin), r.token);
      window.history.replaceState(null, "", `/choi?pin=${pin}`); // tải lại trang vẫn vào đúng phòng
      setToken(r.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (token) return <Game pin={pin} token={token} onGone={(m) => { window.localStorage.removeItem(KEY(pin)); setToken(null); setInfo(null); setError(m); }} />;
  return (
    <div className="lv lv-play">
      <div className="lv-grain" />
      <div className="lv-card">
        <div className="pl-brand"><span className="lv-mark" />EDUVN <em>Đấu trường</em></div>
        {!info ? (
          <>
            <h1>Nhập mã PIN</h1>
            <input className="lv-input" inputMode="numeric" maxLength={6} placeholder="123456" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} data-testid="pl-pin" autoFocus />
            <button className="lv-btn wide" disabled={busy || pin.length !== 6} onClick={() => void lookup(pin)} data-testid="pl-go">Vào phòng</button>
          </>
        ) : info.roster ? (
          <>
            <h1>Bạn là ai?</h1>
            <p className="lv-sub">{info.title}</p>
            <div className="lv-roster" data-testid="pl-roster">
              {info.roster.map((s) => <button key={s.id} className="lv-pick" disabled={busy || s.taken} onClick={() => void join({ studentId: s.id })}>{s.name}{s.taken && <small>đã vào</small>}</button>)}
            </div>
          </>
        ) : (
          <>
            <h1>Chọn biệt danh</h1>
            <p className="lv-sub">{info.title}</p>
            <input className="lv-input" maxLength={24} placeholder="Biệt danh của bạn" value={name} onChange={(e) => setName(e.target.value)} data-testid="pl-name" autoFocus />
            <button className="lv-btn wide" disabled={busy || !name.trim()} onClick={() => void join({ name })} data-testid="pl-join">Tham gia</button>
          </>
        )}
        {error && <div className="lv-err" data-testid="pl-error">{error}</div>}
      </div>
    </div>
  );
}

function Game({ pin, token, onGone }: { pin: string; token: string; onGone: (m: string) => void }) {
  const { state: s, skew, live } = useStream<PlayerState>(`/api/live/stream?t=${encodeURIComponent(token)}`, onGone);
  const left = useLeftMs(s, skew);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<{ q: number; choice?: number; text?: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const qi = s?.qi ?? -1;
  const phase = s?.phase;
  useEffect(() => {
    setText("");
    setMsg(null);
  }, [qi]);
  useEffect(() => {
    if (phase === "ended" && cv.current) return confetti(cv.current, 0.5);
  }, [phase]);

  const send = useCallback(async (choice?: number) => {
    if (!s) return;
    navigator.vibrate?.(18);
    setSent({ q: s.qi, choice, text: choice === undefined ? text.trim() : undefined });
    setMsg(null);
    try {
      await call("/api/live/answer", { t: token, q: s.qi, ...(choice !== undefined ? { choice } : { text }) });
    } catch (e) {
      setSent(null);
      setMsg((e as Error).message);
    }
  }, [s, token, text]);

  if (!s) return <div className="lv lv-play"><div className="lv-grain" /><div className="lv-card"><div className="lv-sub">Đang kết nối…</div></div></div>;
  const q = s.question;
  const mine = sent?.q === s.qi ? sent : null;
  const answered = s.answered || !!mine;
  const pct = s.limitMs > 0 ? Math.min(100, (left / s.limitMs) * 100) : 0;
  const secs = Math.ceil(left / 1000);
  const tone = secs <= 2 ? "red" : secs <= 5 ? "amber" : "gold";
  const move = s.me.prevRank > 0 ? s.me.prevRank - s.me.rank : 0;
  const ok = !!s.result?.ok;

  return (
    <div className="lv lv-play" data-testid="pl-game" data-phase={s.phase}>
      <div className="lv-grain" />
      <canvas ref={cv} className="lv-confetti" />
      <header className="pl-head">
        <Avatar name={s.name} size={36} />
        <span className="pl-name">{s.name}</span>
        {s.me.rank > 0 && <span className="pl-rankchip">Hạng {s.me.rank}</span>}
        <b className="pl-score">{s.me.score}</b>
      </header>
      {!live && <div className="pl-offline">Mất kết nối — đang nối lại…</div>}

      {s.phase === "lobby" && (
        <div className="pl-mid">
          <div className="pl-pulse"><Avatar name={s.name} size={84} /></div>
          <div className="pl-big">Bạn đã vào phòng</div>
          <div className="lv-sub">PIN {pin} · chờ thầy cô bắt đầu<span className="lv-dots"><i /><i /><i /></span></div>
        </div>
      )}

      {s.phase === "question" && q && (
        <div className="pl-q" key={`q${q.i}`}>
          <div className="pl-timer"><div className="pl-bar"><i style={{ transform: `scaleX(${pct / 100})` }} className={tone} /></div><span className={tone}>{s.paused ? "‖" : secs}</span></div>
          <div className="pl-qtext"><small>Câu {q.i + 1}/{s.total}</small><MathText value={q.q} /></div>
          {s.paused && <div className="pl-offline">Thầy cô đang tạm dừng</div>}
          {answered ? (
            <div className="pl-wait">
              {mine?.choice !== undefined ? <div className={`pl-chosen t${mine.choice}`}><span className="lv-letter">{LETTERS[mine.choice]}</span><MathText value={q.options?.[mine.choice] ?? ""} /></div> : mine?.text ? <div className="pl-chosen t0"><MathText value={mine.text} /></div> : null}
              <div className="pl-pulse sm"><span /></div>
              <div className="pl-big sm">{mine?.choice !== undefined ? `Đã chọn ${LETTERS[mine.choice]} — chờ cả lớp` : "Đã gửi — chờ cả lớp"}</div>
            </div>
          ) : q.kind === "choice" ? (
            <div className={`pl-tiles${(q.options?.length ?? 4) === 2 ? " two" : ""}`}>
              {q.options?.map((o, i) => (
                <button key={i} className={`pl-tile t${i}`} style={{ "--i": i } as React.CSSProperties} disabled={s.paused || left <= 0} onClick={() => void send(i)} data-testid={`pl-opt-${i}`}>
                  <span className="lv-letter">{LETTERS[i]}</span>
                  <span className="pl-opt"><MathText value={o} /></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="pl-textrow">
              <input className="lv-input" placeholder="Gõ đáp án" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) void send(); }} data-testid="pl-text" />
              <button className="lv-btn primary wide" disabled={!text.trim() || s.paused || left <= 0} onClick={() => void send()} data-testid="pl-send">Gửi</button>
            </div>
          )}
          {msg && <div className="lv-err">{msg}</div>}
        </div>
      )}

      {s.phase === "reveal" && (
        <div className={`pl-res ${ok ? "ok" : "bad"}`} data-testid="pl-result" key={`r${s.qi}`}>
          <div className="pl-bigmark">{ok ? <svg viewBox="0 0 24 24"><path d="M5 12.500l4.500 4.500L19 7" /></svg> : <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>}</div>
          <div className="pl-big">{ok ? "Đúng rồi!" : s.result?.answered ? "Chưa đúng" : "Chưa kịp trả lời"}</div>
          {ok && <div className="pl-gain">+<CountUp to={s.result?.pts ?? 0} ms={700} />{s.me.streak >= 2 && <span> · chuỗi {s.me.streak}</span>}</div>}
          {!ok && s.result && <div className="pl-correct"><small>Đáp án đúng</small><MathText value={s.result.answer} /></div>}
          <div className="pl-rankline">Hạng <b>{s.me.rank}</b>/{s.me.of}{move !== 0 && <span className={move > 0 ? "up" : "down"}>{move > 0 ? "↑" : "↓"}{Math.abs(move)}</span>}<em>·</em><b className="num">{s.me.score}</b> điểm</div>
          {s.result?.explain && <div className="pl-explain"><MathText value={s.result.explain} /></div>}
        </div>
      )}

      {s.phase === "ended" && (
        <div className="pl-end" data-testid="pl-end">
          <div className="pl-eyebrow">Kết thúc trận</div>
          <div className={`pl-finalrank r${Math.min(s.me.rank, 4)}`}><small>Hạng</small><b>{s.me.rank}</b><small>/{s.me.of}</small></div>
          <div className="pl-finalscore"><CountUp to={s.me.score} ms={1200} /> <small>điểm</small></div>
          {s.me.rank > 0 && s.me.rank <= 3 && <div className="pl-big sm">Chúc mừng, bạn trên bục vinh danh!</div>}
          <ol className="pl-top3">{(s.podium ?? []).map((t, i) => <li key={i}><span className="pk">{i + 1}</span><Avatar name={t.name} size={30} /><span className="pn">{t.name}</span><b className="num">{t.score}</b></li>)}</ol>
          <button className="lv-btn ghost" onClick={() => { window.localStorage.removeItem(KEY(pin)); window.location.assign("/choi"); }}>Chơi trận khác</button>
        </div>
      )}
    </div>
  );
}
