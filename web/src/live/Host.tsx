import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { api, errText, type ClassDetail, type ClassSummary, type ExamSummary, type GameSummary } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";

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
