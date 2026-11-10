import { useEffect, useState } from "react";
import { ApiError, api } from "../api";
import { Icon } from "../Icon";
import { fileToJpeg } from "./image";
import { SavedList } from "./ScanTab";

type Criterion = { name: string; max: number; points: number; comment: string };
type Essay = { no: number; stem: string; rubric: string; reference: string; points: number };
type Saved = { id: string; kind: string; student: string; title: string; total: number; max: number; createdAt: string };

const num = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : (e as Error).message);

export function EssayTab({ examId }: { examId: string }) {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [question, setQuestion] = useState("");
  const [reference, setReference] = useState("");
  const [rubric, setRubric] = useState("");
  const [maxPoints, setMaxPoints] = useState(1);
  const [student, setStudent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [crit, setCrit] = useState<Criterion[] | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const loadSaved = () => api<Saved[]>("/api/photo/results?kind=essay").then(setSaved).catch(() => setSaved([]));
  useEffect(() => void loadSaved(), []);
  useEffect(() => {
    setEssays([]);
    if (examId) void api<Essay[]>(`/api/photo/exams/${examId}/essays`).then(setEssays).catch(() => setEssays([]));
  }, [examId]);

  const pickEssay = (no: string) => {
    const e = essays.find((x) => String(x.no) === no);
    if (!e) return;
    setQuestion(e.stem);
    setReference(e.reference);
    setRubric(e.rubric);
    setMaxPoints(e.points);
  };

  const run = async (label: string, f: () => Promise<void>) => {
    setErr("");
    setOk("");
    setBusy(label);
    try {
      await f();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const total = crit ? Math.round(crit.reduce((s, c) => s + c.points, 0) * 100) / 100 : 0;

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>1. Đề, đáp án mẫu và rubric</h3>
        <div className="bar">
          {essays.length > 0 && (
            <select className="inp" onChange={(e) => pickEssay(e.target.value)} defaultValue="" aria-label="Câu tự luận" data-testid="e-pick">
              <option value="" disabled>Chọn câu tự luận của đề…</option>
              {essays.map((e) => <option key={e.no} value={e.no}>Câu {e.no} ({e.points} điểm)</option>)}
            </select>
          )}
          <input className="inp w-m" placeholder="Tên / SBD học sinh" value={student} onChange={(e) => setStudent(e.target.value)} data-testid="e-student" />
          <label className="lbl" style={{ gridAutoFlow: "column", alignItems: "center" }}>Điểm tối đa
            <input className="inp w-s" type="number" min={0.25} step={0.25} value={maxPoints} onChange={(e) => setMaxPoints(Number(e.target.value))} />
          </label>
        </div>
        <div className="grid2">
          <label className="lbl">Đề bài<textarea className="inp" rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} data-testid="e-question" /></label>
          <label className="lbl">Đáp án mẫu<textarea className="inp" rows={4} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
        </div>
        <label className="lbl" style={{ marginTop: 10 }}>Rubric / biểu điểm<textarea className="inp" rows={3} value={rubric} onChange={(e) => setRubric(e.target.value)} data-testid="e-rubric" /></label>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>2. Ảnh bài làm → phiên âm</h3>
        <div className="bar">
          <label className="btn ghost" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={18} />Chọn ảnh (nhiều trang)
            <input type="file" accept="image/*" multiple hidden data-testid="e-file" onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              void run("Đang nén ảnh…", async () => setImages(await Promise.all(files.map(fileToJpeg))));
            }} />
          </label>
          <button className="btn" disabled={images.length === 0 || !!busy} onClick={() => void run("Đang đọc chữ viết tay…", async () => setTranscript((await api<{ text: string }>("/api/photo/essay/transcribe", { method: "POST", body: { images, hint: question.slice(0, 200) } })).text))} data-testid="e-transcribe">
            Phiên âm bằng AI
          </button>
          {busy && <span className="tag amber" data-testid="e-busy">{busy}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {images.map((s, i) => <img key={i} src={s} alt={`Trang ${i + 1}`} style={{ height: 90, borderRadius: 8, border: "1px solid var(--line)" }} />)}
        </div>
        <label className="lbl">Chữ phiên âm — rà soát và sửa trước khi chấm (công thức dạng $…$)
          <textarea className="inp" rows={8} value={transcript} onChange={(e) => { setTranscript(e.target.value); setCrit(null); }} data-testid="e-transcript" />
        </label>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>3. Chấm theo rubric → duyệt</h3>
        <div className="bar">
          <button className="btn" disabled={!transcript.trim() || !question.trim() || !rubric.trim() || !!busy} data-testid="e-grade"
            onClick={() => void run("AI đang chấm…", async () => {
              const r = await api<{ criteria: Criterion[]; comment: string }>("/api/photo/essay/grade", { method: "POST", body: { question, reference, rubric, maxPoints, transcript } });
              setCrit(r.criteria);
              setComment(r.comment);
            })}>
            <Icon name="grade" size={18} />Chấm bằng AI
          </button>
        </div>
        {err && <div className="err">{err}</div>}
        {ok && <div className="ok-box">{ok}</div>}
        {crit && (
          <>
            <table data-testid="e-criteria">
              <thead><tr><th style={{ textAlign: "left" }}>Tiêu chí</th><th>Điểm</th><th style={{ textAlign: "left" }}>Nhận xét</th></tr></thead>
              <tbody>
                {crit.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <input className="inp w-s" type="number" min={0} max={c.max} step={0.25} value={c.points} data-testid={`e-pt-${i}`}
                        onChange={(e) => setCrit(crit.map((x, j) => (j === i ? { ...x, points: Math.min(x.max, Math.max(0, Number(e.target.value))) } : x)))} /> / {num(c.max)}
                    </td>
                    <td><input className="inp w-l" value={c.comment} onChange={(e) => setCrit(crit.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="lbl" style={{ marginTop: 10 }}>Nhận xét chung<textarea className="inp" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
            <div className="bar" style={{ margin: "12px 0 0" }}>
              <span className="score" data-testid="e-total">{num(total)}<small style={{ fontSize: 16, color: "var(--muted)" }}> / {num(maxPoints)}</small></span>
              <button className="btn" disabled={!!busy} data-testid="e-save"
                onClick={() => void run("Đang lưu…", async () => {
                  await api("/api/photo/essay", { method: "POST", body: { examId: examId || undefined, student, title: question.slice(0, 60), maxPoints, transcript, grading: { criteria: crit, comment } } });
                  setOk("Đã duyệt và lưu điểm.");
                  void loadSaved();
                })}>
                <Icon name="check" size={18} />Duyệt & lưu
              </button>
            </div>
          </>
        )}
      </div>
      <SavedList rows={saved} onChange={() => void loadSaved()} />
    </>
  );
}
