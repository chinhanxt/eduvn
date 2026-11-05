import { useCallback, useEffect, useState } from "react";
import { api, errText, exportGame, type ExamSummary, type GameSummary } from "../api";
import { Icon } from "../Icon";

const KIND = { quiz: "Đố vui", flashcards: "Thẻ lật" } as const;
const TYPES = [["", "Mọi loại"], ["mcq", "Trắc nghiệm"], ["true_false", "Đúng/sai"], ["short_answer", "Trả lời ngắn"]] as const;

export function Games() {
  const [rows, setRows] = useState<GameSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    api<GameSummary[]>("/api/games").then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);
  const remove = async (id: string) => {
    await api(`/api/games/${id}`, { method: "DELETE" }).catch((e: unknown) => setError(errText(e)));
    load();
  };
  return (
    <>
      <h1>Trò chơi</h1>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setCreating((c) => !c)} data-testid="new-game"><Icon name="plus" size={18} />Tạo trò chơi</button>
      </div>
      {error && <div className="err">{error}</div>}
      {creating && <Create onCreated={() => { setCreating(false); load(); }} />}
      {rows?.length === 0 && <div className="card"><div className="empty">—</div></div>}
      {rows && rows.length > 0 && (
        <div className="card" data-testid="game-list">
          {rows.map((g) => (
            <div key={g.id} className="item" data-testid="game-row">
              <div className="ic amber" style={{ margin: 0, width: 38, height: 38 }}><Icon name="spark" /></div>
              <div className="grow">
                {g.title}
                <small>{KIND[g.kind]} · {g.questionCount} câu{g.timerSeconds ? ` · ${g.timerSeconds} giây/câu` : ""} · {g.source}</small>
              </div>
              <button className="btn" onClick={() => void exportGame(g.id, true)} data-testid="game-open"><Icon name="check" size={18} />Mở</button>
              <button className="btn ghost" onClick={() => void exportGame(g.id)} data-testid="game-download"><Icon name="down" size={18} />Tải .html</button>
              <button className="btn ghost sm" onClick={() => void remove(g.id)} aria-label="Xoá"><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Create({ onCreated }: { onCreated: () => void }) {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [src, setSrc] = useState<"bank" | "exam">("bank");
  const [kind, setKind] = useState<"quiz" | "flashcards">("quiz");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState(10);
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("");
  const [limit, setLimit] = useState(20);
  const [examId, setExamId] = useState("");
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<ExamSummary[]>("/api/exams").then((e) => {
      setExams(e);
      setExamId(e[0]?.id ?? "");
    }).catch(() => setExams([]));
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const source = src === "exam" ? { examId } : { subject, grade, ...(topic.trim() ? { topic: topic.trim() } : {}), ...(type ? { type } : {}), limit };
    try {
      await api("/api/games", { method: "POST", body: { title, kind, source, ...(kind === "quiz" ? { timerSeconds: timer } : {}) } });
      onCreated();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }} data-testid="game-form">
      {error && <div className="err" data-testid="game-error">{error}</div>}
      <div className="formrow">
        <label className="lbl">Tên trò chơi<input className="inp" style={{ width: 240 }} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="g-title" /></label>
        <label className="lbl">Loại
          <select className="inp" value={kind} onChange={(e) => setKind(e.target.value as "quiz" | "flashcards")} data-testid="g-kind">
            <option value="quiz">Đố vui có điểm</option><option value="flashcards">Thẻ lật</option>
          </select>
        </label>
        {kind === "quiz" && <label className="lbl">Giây/câu<input className="inp w-s" type="number" min={0} max={300} value={timer} onChange={(e) => setTimer(Number(e.target.value))} data-testid="g-timer" placeholder="0 = tắt" /></label>}
        <label className="lbl">Nguồn
          <select className="inp" value={src} onChange={(e) => setSrc(e.target.value as "bank" | "exam")} data-testid="g-src">
            <option value="bank">Ngân hàng câu hỏi</option><option value="exam">Một đề thi</option>
          </select>
        </label>
      </div>
      {src === "bank" ? (
        <div className="formrow">
          <label className="lbl">Môn<input className="inp w-m" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="g-subject" /></label>
          <label className="lbl">Lớp<input className="inp w-s" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(Number(e.target.value))} data-testid="g-grade" /></label>
          <label className="lbl">Chủ đề<input className="inp w-m" placeholder="tất cả" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="g-topic" /></label>
          <label className="lbl">Dạng câu
            <select className="inp" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="lbl">Tối đa<input className="inp w-s" type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></label>
        </div>
      ) : (
        <div className="formrow">
          <label className="lbl">Đề thi
            <select className="inp" style={{ minWidth: 280 }} value={examId} onChange={(e) => setExamId(e.target.value)} data-testid="g-exam">
              {exams.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.subject} {x.grade}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className="bar" style={{ marginBottom: 0 }}>
        <span className="sp" />
        <button className="btn" disabled={busy || !title.trim() || (src === "exam" && !examId)} onClick={() => void submit()} data-testid="g-create"><Icon name="check" size={18} />Tạo</button>
      </div>
    </div>
  );
}
