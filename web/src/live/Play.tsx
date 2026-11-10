import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { MathText } from "../math/MathText";
import { LETTERS, type PlayerState, useLeftMs, useStream } from "./live";

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
      <div className="lv-card">
        <div className="lv-brand">EDUVN · Đấu trường</div>
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
  const [sent, setSent] = useState<{ q: number; choice?: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const qi = s?.qi ?? -1;
  useEffect(() => {
    setText("");
    setMsg(null);
  }, [qi]);

  const send = useCallback(async (choice?: number) => {
    if (!s) return;
    setSent({ q: s.qi, choice });
    setMsg(null);
    try {
      await call("/api/live/answer", { t: token, q: s.qi, ...(choice !== undefined ? { choice } : { text }) });
    } catch (e) {
      setSent(null);
      setMsg((e as Error).message);
    }
  }, [s, token, text]);

  if (!s) return <div className="lv lv-play"><div className="lv-card"><div className="lv-sub">Đang kết nối…</div></div></div>;
  const q = s.question;
  const answered = s.answered || sent?.q === s.qi;
  const pct = s.limitMs > 0 ? Math.min(100, (left / s.limitMs) * 100) : 0;

  return (
    <div className="lv lv-play" data-testid="pl-game" data-phase={s.phase}>
      <div className="lv-pbar"><span>{s.name}</span><span>{s.me.score} điểm</span></div>
      {!live && <div className="lv-offline">Mất kết nối — đang nối lại…</div>}

      {s.phase === "lobby" && <div className="lv-mid"><div className="lv-bigtext">Bạn đã vào phòng</div><div className="lv-sub">PIN {pin} · Chờ thầy cô bắt đầu</div></div>}

      {s.phase === "question" && q && (
        <div className="lv-qwrap">
          <div className="lv-timer"><div style={{ width: `${pct}%` }} className={pct < 25 ? "low" : ""} /></div>
          <div className="lv-pq"><span className="lv-sub">Câu {q.i + 1}/{s.total}</span><MathText value={q.q} /></div>
          {s.paused && <div className="lv-offline">Thầy cô đang tạm dừng</div>}
          {answered ? (
            <div className="lv-mid"><div className="lv-bigtext">Đã gửi</div><div className="lv-sub">Chờ kết quả…</div></div>
          ) : q.kind === "choice" ? (
            <div className="lv-popts">
              {q.options?.map((o, i) => <button key={i} className={`lv-popt c${i}`} disabled={s.paused || left <= 0} onClick={() => void send(i)} data-testid={`pl-opt-${i}`}><span className="lv-letter">{LETTERS[i]}</span><MathText value={o} /></button>)}
            </div>
          ) : (
            <div className="lv-textrow">
              <input className="lv-input" placeholder="Gõ đáp án" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) void send(); }} data-testid="pl-text" />
              <button className="lv-btn wide" disabled={!text.trim() || s.paused || left <= 0} onClick={() => void send()} data-testid="pl-send">Gửi</button>
            </div>
          )}
          {msg && <div className="lv-err">{msg}</div>}
        </div>
      )}

      {s.phase === "reveal" && (
        <div className={`lv-res ${s.result?.ok ? "ok" : "bad"}`} data-testid="pl-result">
          <div className="lv-bigtext">{s.result?.ok ? "Đúng rồi!" : s.result && s.result.pts === 0 && !s.answered ? "Chưa kịp trả lời" : "Chưa đúng"}</div>
          {s.result?.ok && <div className="lv-pts">+{s.result.pts}</div>}
          {!s.result?.ok && s.result && <div className="lv-sub">Đáp án: <MathText value={s.result.answer} /></div>}
          <div className="lv-rank">Hạng {s.me.rank}/{s.me.of} · {s.me.score} điểm{s.me.streak >= 2 ? ` · chuỗi ${s.me.streak} câu đúng` : ""}</div>
        </div>
      )}

      {s.phase === "ended" && (
        <div className="lv-mid" data-testid="pl-end">
          <div className="lv-bigtext">Kết thúc trận!</div>
          <div className="lv-rank">Bạn đứng hạng {s.me.rank}/{s.me.of} với {s.me.score} điểm</div>
          <ol className="lv-top5 light">{(s.podium ?? []).map((t, i) => <li key={i}><span>{i + 1}. {t.name}</span><b>{t.score}</b></li>)}</ol>
          <button className="lv-btn" onClick={() => { window.localStorage.removeItem(KEY(pin)); window.location.assign("/choi"); }}>Chơi trận khác</button>
        </div>
      )}
    </div>
  );
}
