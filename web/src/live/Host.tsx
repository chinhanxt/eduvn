import qrcode from "qrcode-generator";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { api, errText, type ClassDetail, type ClassSummary, type ExamSummary, type GameSummary } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { LETTERS, type HostState, useLeftMs, useStream } from "./live";

// ---------- Trang "Đấu trường": mở phòng + phòng đang mở + kết quả cũ ----------
type Mine = { pin: string; title: string; phase: string; players: number; total: number };
type SessionRow = { id: string; title: string; classId: string | null; questionCount: number; endedAt: string };

export function Arena() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [src, setSrc] = useState<"game" | "exam" | "bank" | "ai">(params.get("game") ? "game" : "game");
  const [gameId, setGameId] = useState(params.get("game") ?? "");
  const [examId, setExamId] = useState("");
  const [code, setCode] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState(10);
  const [topic, setTopic] = useState("");
  const [limit, setLimit] = useState(10);
  const [level, setLevel] = useState("TH");
  const [classId, setClassId] = useState("");
  const [secs, setSecs] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<GameSummary[]>("/api/games").then((g) => { setGames(g); setGameId((cur) => cur || g[0]?.id || ""); }).catch(() => undefined);
    api<ExamSummary[]>("/api/exams").then((e) => { setExams(e); setExamId(e[0]?.id ?? ""); }).catch(() => undefined);
    api<ClassSummary[]>("/api/classes").then(setClasses).catch(() => undefined);
    api<Mine[]>("/api/live").then(setMine).catch(() => undefined);
    api<SessionRow[]>("/api/live/sessions").then(setSessions).catch(() => undefined);
  }, []);

  const open = async () => {
    setBusy(true);
    setError(null);
    const source =
      src === "game" ? { gameId }
      : src === "exam" ? { examId, ...(code.trim() ? { code: code.trim() } : {}) }
      : src === "bank" ? { subject, grade, ...(topic.trim() ? { topic: topic.trim() } : {}), limit }
      : { ai: { subject, grade, topic: topic.trim(), level, count: limit } };
    try {
      const r = await api<{ pin: string }>("/api/live", { method: "POST", body: { source, timerSeconds: secs, ...(classId ? { classId } : {}) } });
      nav(`/dau-truong/${r.pin}`);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const needTopic = src === "ai" && !topic.trim();
  const ready = src === "game" ? !!gameId : src === "exam" ? !!examId : src === "bank" ? !!subject.trim() : !needTopic && !!subject.trim();

  return (
    <>
      <h1>Đấu trường</h1>
      <p className="hint" style={{ textAlign: "left", marginTop: -8 }}>Mở một phòng, chiếu màn hình lên lớp; học sinh vào bằng mã PIN hoặc quét QR trên điện thoại.</p>
      {error && <div className="err" data-testid="live-error">{error}</div>}
      {mine.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Phòng đang mở</h2>
          {mine.map((m) => (
            <div key={m.pin} className="item">
              <div className="grow">{m.title}<small>PIN {m.pin} · {m.players} người · {m.total} câu</small></div>
              <Link className="btn" to={`/dau-truong/${m.pin}`}>Vào lại</Link>
            </div>
          ))}
        </div>
      )}
      <div className="card" style={{ marginBottom: 16 }} data-testid="live-form">
        <h2>Mở phòng mới</h2>
        <div className="formrow">
          <div className="tabs">
            {([["game", "Trò chơi đã lưu"], ["exam", "Mã đề"], ["bank", "Ngân hàng"], ["ai", "AI tạo câu"]] as const).map(([k, l]) => (
              <button key={k} className={src === k ? "on" : ""} onClick={() => setSrc(k)} data-testid={`lv-src-${k}`}>{l}</button>
            ))}
          </div>
        </div>
        {src === "game" && (
          <div className="formrow">
            <label className="lbl">Trò chơi
              <select className="inp" style={{ minWidth: 300 }} value={gameId} onChange={(e) => setGameId(e.target.value)} data-testid="lv-game">
                {games.map((g) => <option key={g.id} value={g.id}>{g.title} · {g.questionCount} câu</option>)}
              </select>
            </label>
            {games.length === 0 && <span className="hint">Chưa có trò chơi — tạo ở mục Trò chơi hoặc chọn nguồn khác.</span>}
          </div>
        )}
        {src === "exam" && (
          <div className="formrow">
            <label className="lbl">Đề thi
              <select className="inp" style={{ minWidth: 300 }} value={examId} onChange={(e) => { setExamId(e.target.value); setCode(""); }}>
                {exams.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.subject} {x.grade}</option>)}
              </select>
            </label>
            <label className="lbl">Mã đề
              <select className="inp" value={code} onChange={(e) => setCode(e.target.value)}>
                <option value="">mã đầu tiên</option>
                {(exams.find((x) => x.id === examId)?.codes ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        )}
        {(src === "bank" || src === "ai") && (
          <div className="formrow">
            <label className="lbl">Môn<input className="inp w-m" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="lv-subject" /></label>
            <label className="lbl">Lớp<input className="inp w-s" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(Number(e.target.value))} /></label>
            <label className="lbl">Chủ đề<input className="inp w-m" placeholder={src === "ai" ? "bắt buộc" : "tất cả"} value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="lv-topic" /></label>
            {src === "ai" && (
              <label className="lbl">Mức
                <select className="inp" value={level} onChange={(e) => setLevel(e.target.value)}><option value="NB">Nhận biết</option><option value="TH">Thông hiểu</option><option value="VD">Vận dụng</option></select>
              </label>
            )}
            <label className="lbl">{src === "ai" ? "Số câu (2–10)" : "Tối đa"}<input className="inp w-s" type="number" min={2} max={src === "ai" ? 10 : 100} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></label>
          </div>
        )}
        <div className="formrow">
          <label className="lbl">Gắn lớp (HS chọn tên trong danh sách)
            <select className="inp" style={{ minWidth: 260 }} value={classId} onChange={(e) => setClassId(e.target.value)} data-testid="lv-class">
              <option value="">Không gắn lớp — HS nhập biệt danh</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.schoolYear} · {c.studentCount} HS</option>)}
            </select>
          </label>
          <label className="lbl">Giây mỗi câu<input className="inp w-s" type="number" min={5} max={120} value={secs} onChange={(e) => setSecs(Number(e.target.value))} data-testid="lv-secs" /></label>
          <button className="btn" disabled={busy || !ready} onClick={() => void open()} data-testid="lv-open"><Icon name="play" size={18} />{busy ? "Đang tạo…" : "Mở phòng"}</button>
        </div>
      </div>
      {sessions.length > 0 && (
        <div className="card">
          <h2>Kết quả các trận trước</h2>
          {sessions.map((s) => (
            <div key={s.id} className="item">
              <div className="grow">{s.title}<small>{new Date(s.endedAt).toLocaleString("vi-VN")} · {s.questionCount} câu{s.classId ? " · có lớp" : ""}</small></div>
              <Link className="btn ghost" to={`/dau-truong/phien/${s.id}`}>Xem</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------- Kết quả một trận + ghi vào sổ điểm ----------
type SessionDetail = { id: string; title: string; classId: string | null; questionCount: number; results: { rank: number; name: string; studentId: string | null; score: number; correct: number; scored10: number }[]; hardest: { i: number; q: string; answered: number; wrongPct: number }[] };

export function SessionPage() {
  const { id } = useParams();
  const [s, setS] = useState<SessionDetail | null>(null);
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [column, setColumn] = useState("");
  const [term, setTerm] = useState("HK1");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<SessionDetail>(`/api/live/sessions/${id}`).then((d) => {
      setS(d);
      if (d.classId) api<ClassDetail>(`/api/classes/${d.classId}`).then((c) => { setCls(c); setColumn(c.columns[0]?.name ?? ""); }).catch(() => undefined);
    }).catch((e: unknown) => setError(errText(e)));
  }, [id]);
  const write = async () => {
    setMsg(null);
    setError(null);
    try {
      const r = await api<{ updated: number; column: string }>(`/api/live/sessions/${id}/gradebook`, { method: "POST", body: { column, term } });
      setMsg(`Đã ghi điểm thang 10 của ${r.updated} học viên vào cột ${r.column} (${term}).`);
    } catch (e) {
      setError(errText(e));
    }
  };
  if (!s) return error ? <div className="err">{error}</div> : <div className="center">…</div>;
  return (
    <>
      <Link className="back" to="/dau-truong"><Icon name="back" size={16} />Đấu trường</Link>
      <h1>{s.title}</h1>
      {error && <div className="err">{error}</div>}
      {msg && <div className="ok-box" data-testid="lv-gb-ok">{msg}</div>}
      {s.classId && cls && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Ghi vào sổ điểm lớp {cls.name}</h2>
          <p className="hint" style={{ textAlign: "left" }}>Điểm thang 10 = số câu đúng ÷ {s.questionCount} × 10, chỉ cho học viên đã chọn tên trong danh sách lớp.</p>
          <div className="formrow">
            <label className="lbl">Cột điểm<select className="inp" value={column} onChange={(e) => setColumn(e.target.value)} data-testid="lv-gb-col">{cls.columns.map((c) => <option key={c.name}>{c.name}</option>)}</select></label>
            <label className="lbl">Học kỳ<select className="inp" value={term} onChange={(e) => setTerm(e.target.value)}><option>HK1</option><option>HK2</option></select></label>
            <button className="btn" onClick={() => void write()} data-testid="lv-gb-write"><Icon name="clip" size={18} />Ghi vào sổ điểm</button>
          </div>
        </div>
      )}
      <div className="grid2">
        <div className="card">
          <h2>Bảng xếp hạng</h2>
          <table>
            <thead><tr><th>Hạng</th><th>Tên</th><th>Điểm</th><th>Đúng</th><th>Thang 10</th></tr></thead>
            <tbody>{s.results.map((r) => <tr key={r.rank}><td>{r.rank}</td><td>{r.name}</td><td>{r.score}</td><td>{r.correct}/{s.questionCount}</td><td>{String(r.scored10).replace(".", ",")}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card">
          <h2>Câu sai nhiều nhất</h2>
          {s.hardest.length === 0 && <div className="empty">—</div>}
          {s.hardest.map((h) => (
            <div key={h.i} className="item"><div className="grow"><MathText value={h.q.split("\n")[0] ?? h.q} /><small>Câu {h.i} · {h.answered} HS trả lời</small></div><span className="tag amber">{h.wrongPct}% sai</span></div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------- Màn chiếu lớp ----------
const qrSvg = (text: string) => {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
};

export function HostScreen() {
  const { pin = "" } = useParams();
  const nav = useNavigate();
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

  if (error && !s) return <div className="lv lv-host"><div className="lv-center"><div className="err">{error}</div><Link className="btn" to="/dau-truong">Về Đấu trường</Link></div></div>;
  if (!s) return <div className="lv lv-host"><div className="lv-center">…</div></div>;
  const secs = Math.ceil(left / 1000);
  const q = s.question;
  const lastQ = s.qi + 1 >= s.total;

  return (
    <div className="lv lv-host" data-testid="lv-host" data-phase={s.phase}>
      <header className="lv-top">
        <div className="lv-title">{s.title}{s.className ? ` · ${s.className}` : ""}</div>
        <div className="lv-meta">
          {s.phase !== "lobby" && <span>Câu {Math.max(s.qi + 1, 1)}/{s.total}</span>}
          <span><Icon name="users" size={18} /> {s.playerCount}</span>
          <button className="lv-ic" onClick={toggleFs} aria-label={fs ? "Thoát toàn màn hình" : "Toàn màn hình"} data-testid="lv-fs"><Icon name="max" size={20} /></button>
        </div>
      </header>
      {error && <div className="err" style={{ margin: "0 24px" }}>{error}</div>}

      {s.phase === "lobby" && (
        <div className="lv-lobby">
          <div className="lv-join">
            <div className="lv-label">Vào bằng điện thoại</div>
            <div className="lv-url">{window.location.host}/choi</div>
            <div className="lv-label">Mã PIN</div>
            <div className="lv-pin" data-testid="lv-pin">{pin}</div>
            <div className="lv-qr" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
          <div className="lv-names">
            <div className="lv-label">{s.playerCount} học sinh đã vào</div>
            <div className="lv-chips" data-testid="lv-names">{(s.names ?? []).map((n) => <span key={n} className="lv-chip">{n}</span>)}</div>
            {s.playerCount === 0 && <div className="lv-wait">Đang chờ học sinh vào phòng…</div>}
          </div>
        </div>
      )}

      {(s.phase === "question" || s.phase === "reveal") && q && (
        <div className="lv-stage">
          <div className="lv-qrow">
            {s.phase === "question" ? (
              <div className={`lv-clock${secs <= 5 ? " low" : ""}`} data-testid="lv-clock">{s.paused ? "‖" : secs}</div>
            ) : <div className="lv-clock done"><Icon name="check" size={34} /></div>}
            <div className="lv-q" data-testid="lv-q"><MathText value={q.q} /></div>
            <div className="lv-answered"><b>{s.answered}</b>/{s.playerCount}<small>đã trả lời</small></div>
          </div>
          {s.paused && <div className="lv-pause">Tạm dừng</div>}
          {q.kind === "choice" && s.phase === "question" && (
            <div className={`lv-opts n${q.options?.length ?? 4}`}>
              {q.options?.map((o, i) => <div key={i} className={`lv-opt c${i}`}><span className="lv-letter">{LETTERS[i]}</span><MathText value={o} /></div>)}
            </div>
          )}
          {q.kind === "text" && s.phase === "question" && <div className="lv-wait">Học sinh gõ đáp án ngắn trên điện thoại</div>}
          {s.phase === "reveal" && s.reveal && (
            <div className="lv-reveal">
              <div className="lv-bars">
                {q.kind === "choice" ? q.options?.map((o, i) => {
                  const n = s.reveal?.counts[i] ?? 0;
                  const max = Math.max(1, ...(s.reveal?.counts ?? [1]));
                  const ok = s.reveal?.correctIndex === i;
                  return (
                    <div key={i} className={`lv-bar${ok ? " ok" : ""}`} data-testid={`lv-bar-${i}`}>
                      <div className="lv-barfill" style={{ height: `${(n / max) * 100}%` }}><b>{n}</b></div>
                      <div className="lv-barlbl">{ok && <Icon name="check" size={16} />}{LETTERS[i]}<span><MathText value={o} /></span></div>
                    </div>
                  );
                }) : (
                  <div className="lv-textans"><div className="lv-label">Đáp án</div><div className="lv-big"><MathText value={s.reveal.answer} /></div><div className="lv-label">{s.reveal.correct}/{s.reveal.answeredCount} học sinh đúng</div></div>
                )}
              </div>
              <div className="lv-side">
                {s.reveal.explain && <div className="lv-explain"><MathText value={s.reveal.explain} /></div>}
                <div className="lv-label">Top 5</div>
                <ol className="lv-top5" data-testid="lv-top5">{s.reveal.top.map((t, i) => <li key={i}><span>{t.name}</span><b>{t.score}</b></li>)}</ol>
              </div>
            </div>
          )}
        </div>
      )}

      {s.phase === "ended" && (
        <div className="lv-end">
          <div className="lv-label">Bục vinh danh</div>
          <div className="lv-podium" data-testid="lv-podium">
            {[1, 0, 2].map((idx) => {
              const p = s.podium?.[idx];
              return p ? <div key={idx} className={`lv-step s${idx + 1}`}><div className="lv-pname">{p.name}</div><div className="lv-pscore">{p.score}</div><div className="lv-block">{idx + 1}</div></div> : null;
            })}
          </div>
          <div className="lv-actions">
            {s.sessionId ? <Link className="lv-btn" to={`/dau-truong/phien/${s.sessionId}`} data-testid="lv-result">Xem kết quả{s.classId ? " & ghi vào sổ điểm" : ""}</Link> : <span className="lv-label">Đang lưu kết quả…</span>}
            <button className="lv-btn ghost" onClick={() => nav("/dau-truong")}>Về Đấu trường</button>
          </div>
        </div>
      )}

      {s.phase !== "ended" && (
        <footer className="lv-foot">
          {s.phase === "lobby" && <button className="lv-btn" disabled={s.playerCount === 0} onClick={() => void ctl("start")} data-testid="lv-start">Bắt đầu</button>}
          {s.phase === "question" && (
            <>
              <button className="lv-btn ghost" onClick={() => void ctl(s.paused ? "resume" : "pause")} data-testid="lv-pause">{s.paused ? "Tiếp tục" : "Tạm dừng"}</button>
              <button className="lv-btn" onClick={() => void ctl("skip")} data-testid="lv-skip">Chốt câu</button>
            </>
          )}
          {s.phase === "reveal" && <button className="lv-btn" onClick={() => void ctl("next")} data-testid="lv-next">{lastQ ? "Xem bục vinh danh" : "Câu tiếp theo"}</button>}
          <button className="lv-btn ghost" onClick={() => { if (confirm("Kết thúc trận chơi ngay bây giờ?")) void ctl("end"); }} data-testid="lv-end">Kết thúc</button>
        </footer>
      )}
    </div>
  );
}
