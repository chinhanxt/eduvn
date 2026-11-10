import qrcode from "qrcode-generator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, errText } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { Avatar, CountUp, Flame, Ring, confetti } from "./fx";
import { LETTERS, type HostState, type Top, useLeftMs, useStream } from "./live";
import "./live.css";

const qrSvg = (text: string) => {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
};
const ROW = 74; // cao một hàng bảng xếp hạng + khoảng cách (px) — dùng cho hiệu ứng FLIP

/** Bảng top 5 sau mỗi câu: hàng trượt về hạng mới (FLIP), điểm đếm lên, +điểm câu này, ngọn lửa chuỗi. */
function Board({ top }: { top: Top[] }) {
  return (
    <ol className="lv-board" data-testid="lv-top5">
      {top.slice(0, 5).map((t, i) => {
        const from = t.prevRank > 0 ? Math.max(-5, Math.min(5, t.prevRank - t.rank)) * ROW : 0;
        return (
          <li key={t.name} className={`lv-brow${t.rank === 1 ? " first" : ""}${t.prevRank === 0 ? " fresh" : ""}`} style={{ "--from": `${from}px`, "--i": i } as React.CSSProperties}>
            <span className="lv-rk">{t.rank}</span>
            <Avatar name={t.name} size={42} />
            <span className="lv-bname"><span className="nm">{t.name}</span>{t.streak >= 2 && <Flame n={t.streak} />}</span>
            <span className="lv-bright">
              <b className="lv-bscore"><CountUp from={t.score - t.delta} to={t.score} delay={500} /></b>
              {t.delta > 0 && <span className="lv-delta">+{t.delta}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Podium({ s }: { s: HostState }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const podium = s.podium ?? [];
  useEffect(() => {
    const t = setTimeout(() => { if (cv.current) confetti(cv.current); }, 3300);
    return () => clearTimeout(t);
  }, []);
  const delay: number[] = [2900, 1700, 500]; // 1 → 2 → 3: hạng 3 lên trước, hạng 1 sau cùng
  const sum = s.summary;
  const nav = useNavigate();
  return (
    <div className="lv-end">
      <canvas ref={cv} className="lv-confetti" />
      <div className="lv-stagewrap">
        <div className="lv-beam b1" /><div className="lv-beam b2" />
        <div className="lv-podium" data-testid="lv-podium">
          {[1, 0, 2].map((idx) => {
            const p = podium[idx];
            if (!p) return null;
            return (
              <div key={idx} className={`lv-step s${idx + 1}`} style={{ "--d": `${delay[idx] ?? 0}ms` } as React.CSSProperties}>
                <div className="lv-pwho">
                  <div className="lv-medal"><Avatar name={p.name} size={idx === 0 ? 92 : 76} /><i>{idx + 1}</i></div>
                  <div className="lv-pname">{p.name}</div>
                  <div className="lv-pscore"><CountUp to={p.score} delay={(delay[idx] ?? 0) + 300} ms={1200} /> <small>điểm</small></div>
                </div>
                <div className="lv-block"><span>{idx + 1}</span></div>
              </div>
            );
          })}
        </div>
        <div className="lv-floor" />
      </div>
      {sum && (
        <div className="lv-sums" data-testid="lv-summary">
          <div className="lv-sum"><small>Độ chính xác cả lớp</small><b>{sum.accuracy}%</b></div>
          <div className="lv-sum wide"><small>Câu khó nhất{sum.hardest ? ` · câu ${sum.hardest.n} · ${sum.hardest.wrongPct}% sai` : ""}</small><b className="txt">{sum.hardest ? <MathText value={(sum.hardest.q.split("\n")[0] ?? "").slice(0, 80)} /> : "—"}</b></div>
          <div className="lv-sum"><small>Đúng nhanh nhất</small><b className="txt">{sum.fastest ? `${sum.fastest.name} · ${(sum.fastest.ms / 1000).toFixed(1).replace(".", ",")} s` : "—"}</b></div>
        </div>
      )}
      <div className="lv-actions">
        {s.sessionId ? <Link className="lv-btn primary" to={`/dau-truong/phien/${s.sessionId}`} data-testid="lv-result">Xem kết quả{s.classId ? " & ghi vào sổ điểm" : ""}</Link> : <span className="lv-hint">Đang lưu kết quả…</span>}
        <button className="lv-btn ghost" onClick={() => nav("/dau-truong")}>Về Đấu trường</button>
      </div>
    </div>
  );
}

export function HostScreen() {
  const { pin = "" } = useParams();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fs, setFs] = useState(false);
  const joinUrl = `${window.location.origin}/choi?pin=${pin}`;
  useEffect(() => {
    api<{ hostToken: string }>(`/api/live/room/${pin}`).then((r) => setToken(r.hostToken)).catch((e: unknown) => setError(errText(e)));
  }, [pin]);
  const { state: s, skew } = useStream<HostState>(token ? `/api/live/room/${pin}/host-stream?t=${encodeURIComponent(token)}` : null, setError);
  const left = useLeftMs(s, skew);
  const qr = useMemo(() => qrSvg(joinUrl), [joinUrl]);
  const ctl = useCallback(async (action: string) => {
    try {
      await api(`/api/live/room/${pin}/control`, { method: "POST", body: { action } });
    } catch (e) {
      setError(errText(e));
    }
  }, [pin]);
  useEffect(() => {
    const f = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const toggleFs = () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  if (error && !s) return <div className="lv lv-host"><div className="lv-grain" /><div className="lv-center"><div className="err">{error}</div><Link className="lv-btn primary" to="/dau-truong">Về Đấu trường</Link></div></div>;
  if (!s) return <div className="lv lv-host"><div className="lv-grain" /><div className="lv-center lv-hint">…</div></div>;
  const secs = Math.ceil(left / 1000);
  const q = s.question;
  const lastQ = s.qi + 1 >= s.total;
  const tone = s.paused ? "ice" : secs <= 2 ? "red" : secs <= 5 ? "amber" : "gold";
  const showQ = (s.phase === "question" || s.phase === "reveal") && q;
  const rv = s.reveal;
  const totalAns = Math.max(1, rv?.answeredCount ?? 0);

  return (
    <div className="lv lv-host" data-testid="lv-host" data-phase={s.phase}>
      <div className="lv-grain" />
      <header className="lv-top">
        <div className="lv-brand"><span className="lv-mark"><Icon name="game" size={16} /></span>EDUVN <em>Đấu trường</em></div>
        <div className="lv-title">{s.title}{s.className ? ` · ${s.className}` : ""}</div>
        <div className="lv-meta">
          {s.phase !== "lobby" && s.phase !== "ended" && <span className="lv-qn">Câu <b>{s.qi + 1}</b>/{s.total}</span>}
          <span className="lv-count"><Icon name="users" size={16} /><b>{s.playerCount}</b></span>
          <button className="lv-ic" onClick={toggleFs} aria-label={fs ? "Thoát toàn màn hình" : "Toàn màn hình"} data-testid="lv-fs"><Icon name="max" size={18} /></button>
        </div>
      </header>
      {s.phase !== "lobby" && s.phase !== "ended" && <div className="lv-progress"><i style={{ transform: `scaleX(${(s.qi + 1) / s.total})` }} /></div>}
      {error && <div className="err lv-errbar">{error}</div>}

      {s.phase === "lobby" && (
        <main className="lv-lobby">
          <section className="lv-joincard">
            <div className="lv-eyebrow">Vào bằng điện thoại</div>
            <div className="lv-url">{window.location.host}/choi</div>
            <div className="lv-eyebrow">Mã PIN</div>
            <div className="lv-pin" data-testid="lv-pin">{pin.slice(0, 3)}<span /> {pin.slice(3)}</div>
            <div className="lv-qr" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="lv-eyebrow">hoặc quét mã QR</div>
          </section>
          <section className="lv-who">
            <div className="lv-bigcount"><b key={s.playerCount}>{s.playerCount}</b><span>học sinh đã vào{s.className ? ` · ${s.className}` : ""}</span></div>
            <div className="lv-chips" data-testid="lv-names">
              {(s.names ?? []).map((n) => <span key={n} className="lv-chip"><Avatar name={n} size={30} />{n}</span>)}
            </div>
            {s.playerCount === 0 && <div className="lv-hint">Đang chờ học sinh vào phòng…<span className="lv-dots"><i /><i /><i /></span></div>}
          </section>
        </main>
      )}

      {showQ && q && (
        <main className={`lv-stage ${s.phase === "reveal" ? "is-reveal" : ""}`} key={`q${s.qi}`}>
          <div className="lv-qhead">
            <div className="lv-side">
              {s.phase === "question" ? (
                <Ring value={s.limitMs > 0 ? left / s.limitMs : 0} size={118} stroke={10} tone={tone}>
                  <span className={`lv-secs ${tone}`} data-testid="lv-clock">{s.paused ? "‖" : secs}</span>
                </Ring>
              ) : (
                <Ring value={1} size={118} stroke={10} tone="ice"><Icon name="check" size={44} /></Ring>
              )}
            </div>
            <div className="lv-qbox">
              <div className="lv-q" data-testid="lv-q"><MathText value={q.q} /></div>
              {q.image && <img className="lv-img" src={q.image} alt="" />}
            </div>
            <div className="lv-side">
              <Ring value={s.playerCount ? s.answered / s.playerCount : 0} size={96} stroke={8} tone="ice">
                <span className="lv-ans"><b>{s.answered}</b><small>/{s.playerCount}</small></span>
              </Ring>
              <div className="lv-eyebrow">đã trả lời</div>
            </div>
          </div>
          {s.paused && <div className="lv-pause">Tạm dừng</div>}

          <div className={`lv-body ${s.phase === "reveal" ? "two" : ""}`}>
            <div className="lv-left">
              {q.kind === "choice" ? (
                <div className={`lv-tiles${(q.options?.length ?? 4) === 2 ? " two" : ""}`}>
                  {q.options?.map((o, i) => {
                    const n = rv?.counts[i] ?? 0;
                    const ok = rv?.correctIndex === i;
                    return (
                      <div key={i} className={`lv-tile t${i}${rv ? (ok ? " ok" : " dim") : ""}`} style={{ "--i": i } as React.CSSProperties} data-testid={`lv-bar-${i}`}>
                        <span className="lv-letter">{ok ? <Icon name="check" size={26} /> : LETTERS[i]}</span>
                        <span className="lv-opt"><MathText value={o} /></span>
                        {rv && (
                          <span className="lv-dist">
                            <span className="lv-track"><i style={{ "--w": n / totalAns } as React.CSSProperties} /></span>
                            <b>{n}</b><small>{Math.round((n / totalAns) * 100)}%</small>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : rv ? (
                <div className="lv-textans">
                  <div className="lv-eyebrow">Đáp án</div>
                  <div className="lv-big"><MathText value={rv.answer} /></div>
                  <div className="lv-track wide"><i style={{ "--w": rv.correct / totalAns } as React.CSSProperties} /></div>
                  <div className="lv-hint"><b>{rv.correct}</b>/{rv.answeredCount} học sinh trả lời đúng</div>
                </div>
              ) : (
                <div className="lv-textans"><div className="lv-hint">Học sinh gõ đáp án ngắn trên điện thoại<span className="lv-dots"><i /><i /><i /></span></div></div>
              )}
              {rv?.explain && <div className="lv-explain"><div className="lv-eyebrow">Lời giải</div><MathText value={rv.explain} /></div>}
            </div>
            {rv && (
              <aside className="lv-lb">
                <div className="lv-eyebrow">Bảng xếp hạng</div>
                <Board top={rv.top} />
              </aside>
            )}
          </div>
        </main>
      )}

      {s.phase === "ended" && <Podium s={s} />}

      {s.phase !== "ended" && (
        <footer className="lv-foot">
          {s.phase === "lobby" && <button className="lv-btn primary" disabled={s.playerCount === 0} onClick={() => void ctl("start")} data-testid="lv-start">Bắt đầu</button>}
          {s.phase === "question" && (
            <>
              <button className="lv-btn ghost" onClick={() => void ctl(s.paused ? "resume" : "pause")} data-testid="lv-pause">{s.paused ? "Tiếp tục" : "Tạm dừng"}</button>
              <button className="lv-btn primary" onClick={() => void ctl("skip")} data-testid="lv-skip">Chốt câu</button>
            </>
          )}
          {s.phase === "reveal" && <button className="lv-btn primary" onClick={() => void ctl("next")} data-testid="lv-next">{lastQ ? "Xem bục vinh danh" : "Câu tiếp theo"}</button>}
          <button className="lv-btn ghost quiet" onClick={() => { if (confirm("Kết thúc trận chơi ngay bây giờ?")) void ctl("end"); }} data-testid="lv-end">Kết thúc</button>
        </footer>
      )}
    </div>
  );
}
