import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { api, errText, type ClassDetail, type ClassSummary, type ExamSummary, type GameSummary } from "../api";
import { MathText } from "../math/MathText";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/components/Button";
import { Skeleton } from "../ui/components/Skeleton";
import { PageHead } from "../ui/shell/PageHead";
import { ROSTER_10A1 } from "../demo/kit/world";
import "../portal/gv/gv.css";

// ---------- Trang "Đấu trường": mở phòng + phòng đang mở + kết quả cũ ----------
type Mine = { pin: string; title: string; phase: string; players: number; total: number };
type SessionRow = { id: string; title: string; classId: string | null; questionCount: number; endedAt: string };
type Src = "game" | "exam" | "bank" | "ai";

const SRC: { k: Src; label: string; icon: string }[] = [
  { k: "game", label: "Trò chơi", icon: "game" },
  { k: "exam", label: "Đề thi", icon: "exam" },
  { k: "bank", label: "Ngân hàng", icon: "bank" },
  { k: "ai", label: "AI tạo câu", icon: "spark" },
];
/** HS 10A1 của thế giới mẫu (tên gọi = 2 chữ cuối): Minh Anh, Khánh Duy, Đức Thịnh, Bảo Châu, Gia Hân, Quốc Huy, Thu Trang. */
const PLAYERS = ROSTER_10A1.slice(0, 7).map((n) => n.split(" ").slice(-2).join(" "));
const ini = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(-2).toUpperCase();

/** Hình sân khấu: màn chiếu lên lớp (PIN + QR) và HS lần lượt vào phòng. */
function Stage({ pin, title, players }: { pin?: string; title?: string; players?: number }) {
  const shown = players == null ? PLAYERS : PLAYERS.slice(0, Math.min(players, PLAYERS.length));
  return (
    <div className="lv-stage" aria-hidden="true">
      <div className="scr">
        <span className="ttl">{title ?? "Ôn tập nhanh"}</span>
        <div className="pin">
          <small>Mã phòng</small>
          <b>{pin ? pin.replace(/(\d{3})(?=\d)/, "$1 ") : "482 913"}</b>
        </div>
        <svg className="qr" viewBox="0 0 21 21">
          {Array.from({ length: 21 * 21 }, (_, i) => {
            const x = i % 21, y = Math.floor(i / 21);
            const eye = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
            const on = eye ? (x % 6 === 0 || y % 6 === 0 || (x > 13 && (x - 14) % 6 === 0) || (y > 13 && (y - 14) % 6 === 0) || ((x % 7 > 1 && x % 7 < 5) && (y % 7 > 1 && y % 7 < 5))) : ((x * 7 + y * 13 + x * y) % 5) < 2;
            return on ? <rect key={i} x={x} y={y} width="1" height="1" /> : null;
          })}
        </svg>
      </div>
      <div className="ppl">
        {shown.map((n, i) => (
          <span key={n} className="p" style={{ ["--i" as string]: i, ["--c" as string]: `var(--c${(i % 8) + 1})` }} title={n}>{ini(n)}</span>
        ))}
        <span className="cnt">{players ?? 28} em đã vào</span>
      </div>
    </div>
  );
}

export function Arena() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [src, setSrc] = useState<Src>("game");
  const [touched, setTouched] = useState(!!params.get("game"));
  const [gameId, setGameId] = useState(params.get("game") ?? "");
  const [examId, setExamId] = useState("");
  const [code, setCode] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState(10);
  const [topic, setTopic] = useState("");
  const [limit, setLimit] = useState(10);
  const [level, setLevel] = useState("TH");
  const [classId, setClassId] = useState("");
  const [secs, setSecs] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<GameSummary[]>("/api/games").then((g) => { setGames(g); setGameId((cur) => cur || g[0]?.id || ""); }).catch(() => setGames([]));
    api<ExamSummary[]>("/api/exams").then((e) => { setExams(e); setExamId(e[0]?.id ?? ""); }).catch(() => setExams([]));
    api<ClassSummary[]>("/api/classes").then(setClasses).catch(() => undefined);
    api<Mine[]>("/api/live").then(setMine).catch(() => undefined);
    api<SessionRow[]>("/api/live/sessions").then(setSessions).catch(() => setSessions([]));
  }, []);
  // Chưa có trò chơi nào → mặc định nguồn có sẵn (đề thi, rồi ngân hàng) thay vì một ô chọn trống.
  useEffect(() => {
    if (touched || games === null || exams === null) return;
    if (games.length === 0) setSrc(exams.length ? "exam" : "bank");
  }, [touched, games, exams]);

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
  const count = (k: Src) => (k === "game" ? games?.length : k === "exam" ? exams?.length : undefined);

  return (
    <>
      <PageHead title="Đấu trường" />
      {error && <div className="note err" role="alert" data-testid="live-error" style={{ marginBottom: 16 }}>{error}</div>}
      {mine.map((m) => (
        <Link key={m.pin} className="lv-live" to={`/dau-truong/${m.pin}`}>
          <i className="dot" />
          <b>{m.title}</b>
          <span className="mono">PIN {m.pin}</span>
          <span>{m.players} em · {m.total} câu</span>
          <span className="go">Vào lại <Icon name="arrowr" size="sm" /></span>
        </Link>
      ))}

      <div className="lv-hero">
        <Stage />
        <form className="lv-form" data-testid="live-form" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) void open(); }}>
          <h2>Mở phòng thi đấu</h2>
          <div className="lv-src" role="radiogroup" aria-label="Lấy câu hỏi từ">
            {SRC.map(({ k, label, icon }) => (
              <button key={k} type="button" role="radio" aria-checked={src === k} onClick={() => (setSrc(k), setTouched(true))} data-testid={`lv-src-${k}`}>
                <Icon name={icon} />
                <span>{label}</span>
                {count(k) != null && <small>{count(k)}</small>}
              </button>
            ))}
          </div>

          <div className="lv-fields" key={src}>
            {src === "game" && (
              games?.length === 0 ? (
                <p className="lv-none">Chưa có trò chơi. <Link to="/tro-choi">Tạo trò chơi</Link> hoặc lấy câu từ nguồn khác.</p>
              ) : (
                <label className="field full">
                  <span className="lbl-sm">Trò chơi</span>
                  <select className="select" value={gameId} onChange={(e) => setGameId(e.target.value)} data-testid="lv-game">
                    {(games ?? []).map((g) => <option key={g.id} value={g.id}>{g.title} · {g.questionCount} câu</option>)}
                  </select>
                </label>
              )
            )}
            {src === "exam" && (
              <>
                <label className="field grow2">
                  <span className="lbl-sm">Đề thi</span>
                  <select className="select" value={examId} onChange={(e) => { setExamId(e.target.value); setCode(""); }}>
                    {(exams ?? []).map((x) => <option key={x.id} value={x.id}>{x.title} · {x.subject} {x.grade}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="lbl-sm">Mã đề</span>
                  <select className="select" value={code} onChange={(e) => setCode(e.target.value)}>
                    <option value="">Mã đầu tiên</option>
                    {(exams?.find((x) => x.id === examId)?.codes ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </>
            )}
            {(src === "bank" || src === "ai") && (
              <>
                <label className="field">
                  <span className="lbl-sm">Môn</span>
                  <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="vd: Địa lí" data-testid="lv-subject" />
                </label>
                <label className="field sm">
                  <span className="lbl-sm">Lớp</span>
                  <input className="input" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(Number(e.target.value))} />
                </label>
                <label className="field grow2">
                  <span className="lbl-sm">Chủ đề</span>
                  <input className="input" placeholder={src === "ai" ? "vd: khí hậu Việt Nam" : "Tất cả"} value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="lv-topic" />
                </label>
                {src === "ai" && (
                  <label className="field">
                    <span className="lbl-sm">Mức</span>
                    <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}><option value="NB">Nhận biết</option><option value="TH">Thông hiểu</option><option value="VD">Vận dụng</option></select>
                  </label>
                )}
                <label className="field sm">
                  <span className="lbl-sm">{src === "ai" ? "Số câu" : "Tối đa"}</span>
                  <input className="input" type="number" min={2} max={src === "ai" ? 10 : 100} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
                </label>
              </>
            )}
          </div>

          <div className="lv-fields">
            <label className="field grow2">
              <span className="lbl-sm">Lớp tham gia</span>
              <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)} data-testid="lv-class">
                <option value="">Tự do · HS nhập biệt danh</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.studentCount} HS</option>)}
              </select>
            </label>
            <label className="field sm">
              <span className="lbl-sm">Giây/câu</span>
              <input className="input" type="number" min={5} max={120} value={secs} onChange={(e) => setSecs(Number(e.target.value))} data-testid="lv-secs" />
            </label>
          </div>
          <Button type="submit" variant="primary" size="lg" icon="play" disabled={busy || !ready} data-testid="lv-open">{busy ? "Đang mở…" : "Mở phòng"}</Button>
        </form>
      </div>

      <section className="lv-past" aria-label="Các trận trước">
        <h3 className="gt-sec">Các trận trước {sessions && sessions.length > 0 && <span>{sessions.length}</span>}</h3>
        {sessions === null && <Skeleton h={44} />}
        {sessions?.length === 0 && <p className="kb-muted">Kết quả từng trận (xếp hạng, câu sai nhiều, ghi sổ điểm) sẽ nằm ở đây.</p>}
        {sessions?.map((s) => (
          <Link key={s.id} className="lv-row" to={`/dau-truong/phien/${s.id}`}>
            <Icon name="flag" size="sm" />
            <b>{s.title}</b>
            <span>{s.questionCount} câu{s.classId ? " · có lớp" : ""}</span>
            <span className="when">{new Date(s.endedAt).toLocaleString("vi-VN", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <Icon name="chevr" size="sm" />
          </Link>
        ))}
      </section>
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
  if (!s) return error ? <div className="note err" role="alert">{error}</div> : <Skeleton h={320} />;
  const top = s.results.slice(0, 3);
  const podium = [top[1], top[0], top[2]];
  return (
    <>
      <Link className="back-link" to="/dau-truong"><Icon name="left" size="sm" />Đấu trường</Link>
      <PageHead title={s.title} />
      {error && <div className="note err" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {msg && <div className="note ok" role="status" data-testid="lv-gb-ok" style={{ marginBottom: 16 }}>{msg}</div>}
      <div className="lv-res">
        <section aria-label="Bảng xếp hạng">
          {top.length > 0 && (
            <div className="lv-podium" aria-hidden="true">
              {podium.map((r, i) => r ? (
                <div key={r.rank} className={`pd r${r.rank}`} style={{ ["--d" as string]: `${i * 60}ms` }}>
                  <span className="av">{ini(r.name)}</span>
                  <b>{r.name}</b>
                  <span className="bar"><em>{r.rank}</em><small>{r.score}</small></span>
                </div>
              ) : <div key={i} />)}
            </div>
          )}
          <table className="ctable lv-table">
            <thead><tr><th>Hạng</th><th>Tên</th><th className="r">Điểm</th><th className="r">Đúng</th><th className="r">Thang 10</th></tr></thead>
            <tbody>{s.results.map((r) => <tr key={r.rank}><td className="r" style={{ width: 48, textAlign: "left" }}>{r.rank}</td><td>{r.name}</td><td className="r">{r.score}</td><td className="r">{r.correct}/{s.questionCount}</td><td className="r"><b>{String(r.scored10).replace(".", ",")}</b></td></tr>)}</tbody>
          </table>
        </section>
        <aside aria-label="Câu sai nhiều nhất">
          <h3 className="gt-sec" style={{ borderTop: 0, paddingTop: 0 }}>Câu sai nhiều nhất</h3>
          {s.hardest.length === 0 && <p className="kb-muted">Không câu nào khó với cả lớp.</p>}
          {s.hardest.map((h) => (
            <div key={h.i} className="lv-hard">
              <span className="q">Câu {h.i}</span>
              <div className="grow"><MathText value={h.q.split("\n")[0] ?? h.q} /><span className="m"><i style={{ width: `${h.wrongPct}%` }} /></span><small>{h.wrongPct}% sai · {h.answered} em trả lời</small></div>
            </div>
          ))}
        </aside>
      </div>
      {s.classId && cls && (
        <form className="lv-gb" onSubmit={(e) => { e.preventDefault(); void write(); }}>
          <Icon name="clip" />
          <span className="grow"><b>Ghi vào sổ điểm {cls.name}</b><small>Đúng ÷ {s.questionCount} × 10, chỉ em đã chọn tên trong lớp</small></span>
          <select className="select" value={column} onChange={(e) => setColumn(e.target.value)} data-testid="lv-gb-col" aria-label="Cột điểm">{cls.columns.map((c) => <option key={c.name}>{c.name}</option>)}</select>
          <select className="select" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Học kỳ"><option>HK1</option><option>HK2</option></select>
          <Button type="submit" variant="primary" data-testid="lv-gb-write">Ghi điểm</Button>
        </form>
      )}
    </>
  );
}
