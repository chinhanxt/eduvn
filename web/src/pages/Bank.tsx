import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, aiSkill, api, errText, type BankQuestion, type Question } from "../api";
import { Icon } from "../Icon";
import { MathEditor } from "../math/MathEditor";
import { MathText } from "../math/MathText";

export const SUBJECT_DEFAULT = "Toán";
const TYPE_LABEL: Record<Question["type"], string> = { mcq: "Trắc nghiệm", true_false: "Đúng/sai", short_answer: "Trả lời ngắn", essay: "Tự luận" };

export function Bank() {
  const [subject, setSubject] = useState(SUBJECT_DEFAULT);
  const [grade, setGrade] = useState(10);
  const [rows, setRows] = useState<Question[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<Question[]>(`/api/questions?subject=${encodeURIComponent(subject.trim() || "x")}&grade=${grade}`)
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Lỗi"));
  }, [subject, grade]);
  useEffect(load, [load]);

  return (
    <>
      <h1>Ngân hàng câu hỏi</h1>
      <div className="bar">
        <input className="inp w-m" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Môn" data-testid="f-subject" />
        <input className="inp w-s" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(Number(e.target.value))} aria-label="Lớp" data-testid="f-grade" />
        <span className="sp" />
        <button className="btn ghost" onClick={() => setAiOpen((a) => !a)} data-testid="ai-q-open"><Icon name="spark" size={18} />AI tạo câu hỏi theo YCCĐ</button>
        <button className="btn" onClick={() => setAdding((a) => !a)} data-testid="add-q"><Icon name="plus" size={18} />Thêm</button>
      </div>
      {error && <div className="err">{error}</div>}
      {aiOpen && <AiQuestions subject={subject} grade={grade} onSaved={load} />}
      {adding && (
        <AddForm
          subject={subject}
          grade={grade}
          onDone={() => {
            load();
          }}
        />
      )}
      <div className="card">
        {rows?.length === 0 ? (
          <div className="empty">—</div>
        ) : (
          <table data-testid="q-table">
            <thead><tr><th>Câu hỏi</th><th>Chủ đề</th><th>Mức</th><th>Loại</th></tr></thead>
            <tbody>
              {rows?.map((q) => (
                <tr key={q.id}>
                  <td><MathText value={q.stem} /></td>
                  <td>{q.topic}</td>
                  <td><span className="tag green">{q.level}</span></td>
                  <td><span className="tag violet">{TYPE_LABEL[q.type]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function AddForm({ subject, grade, onDone }: { subject: string; grade: number; onDone: () => void }) {
  const [topic, setTopic] = useState("Mệnh đề");
  const [level, setLevel] = useState("NB");
  const [formKey, setFormKey] = useState(0);
  const [stem, setStem] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/questions", { method: "POST", body: { type: "mcq", subject, grade, topic, level, stem, options, answer } });
      setStem("");
      setFormKey((k) => k + 1);
      setOptions(["", "", "", ""]);
      setAnswer(0);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? "Điền đủ câu hỏi và 4 phương án" : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" style={{ marginBottom: 16 }} onSubmit={(e) => void submit(e)}>
      {error && <div className="err">{error}</div>}
      <div className="formrow">
        <label className="lbl">Chủ đề<input className="inp w-m" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="q-topic" /></label>
        <label className="lbl">Mức
          <select className="inp" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="NB">Nhận biết</option><option value="TH">Thông hiểu</option><option value="VD">Vận dụng</option>
          </select>
        </label>
      </div>
      <MathEditor key={`stem-${formKey}`} value={stem} onChange={setStem} placeholder="Câu hỏi — gõ $ để chèn công thức" testId="q-stem" />
      {options.map((o, i) => (
        <div className="opt" key={i}>
          <input type="radio" name="ans" checked={answer === i} onChange={() => setAnswer(i)} aria-label={`Đáp án ${"ABCD"[i]}`} />
          <span className="letter">{"ABCD"[i]}</span>
          <div style={{ flex: 1 }}>
            <MathEditor key={`opt-${i}-${formKey}`} value={o} onChange={(v) => setOptions((prev) => prev.map((x, j) => (j === i ? v : x)))} placeholder={`Phương án ${"ABCD"[i]}`} testId={`q-opt-${i}`} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 14 }}>
        <button className="btn" disabled={busy} data-testid="q-save"><Icon name="check" size={18} />Lưu</button>
      </div>
    </form>
  );
}

const LETTERS = "ABCD";

/** AI viết câu hỏi bám YCCĐ → xem trước → chọn câu → thêm vào ngân hàng. */
function AiQuestions({ subject, grade, onSaved }: { subject: string; grade: number; onSaved: () => void }) {
  const [f, setF] = useState({ topic: "", yccd: "", level: "TH", type: "mcq", count: 3 });
  const [drafts, setDrafts] = useState<BankQuestion[]>([]);
  const [pick, setPick] = useState<boolean[]>([]);
  const [rejected, setRejected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ err?: string; ok?: string } | null>(null);
  const gen = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await aiSkill<{ questions: BankQuestion[]; rejected: unknown[] }>("cau-hoi", { subject, grade, ...f, yccd: f.yccd.trim() || undefined });
      setDrafts(r.questions);
      setPick(r.questions.map(() => true));
      setRejected(r.rejected.length);
    } catch (e) {
      setMsg({ err: errText(e) });
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      const chosen = drafts.filter((_, i) => pick[i]);
      for (const q of chosen) await api("/api/questions", { method: "POST", body: q });
      setMsg({ ok: `Đã thêm ${chosen.length} câu vào ngân hàng` });
      setDrafts([]);
      onSaved();
    } catch (e) {
      setMsg({ err: errText(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card" style={{ marginBottom: 16 }} data-testid="ai-q-form">
      {msg?.err && <div className="err">{msg.err}</div>}
      {msg?.ok && <div className="ok-box">{msg.ok}</div>}
      <div className="formrow">
        <label className="lbl">Chủ đề<input className="inp w-m" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} data-testid="ai-q-topic" /></label>
        <label className="lbl">Yêu cầu cần đạt<input className="inp" style={{ width: 300 }} placeholder="tuỳ chọn — AI tự lấy theo CT GDPT 2018" value={f.yccd} onChange={(e) => setF({ ...f, yccd: e.target.value })} /></label>
        <label className="lbl">Mức
          <select className="inp" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
            <option value="NB">Nhận biết</option><option value="TH">Thông hiểu</option><option value="VD">Vận dụng</option>
          </select>
        </label>
        <label className="lbl">Dạng
          <select className="inp" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {(Object.keys(TYPE_LABEL) as Question["type"][]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            <option value="mix">Nhiều dạng</option>
          </select>
        </label>
        <label className="lbl">Số câu<input className="inp w-s" type="number" min={1} max={10} value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })} /></label>
        <button className="btn" disabled={busy || !f.topic.trim()} onClick={() => void gen()} data-testid="ai-q-run"><Icon name="spark" size={18} />{busy && drafts.length === 0 ? "Đang viết…" : "Tạo"}</button>
      </div>
      {drafts.map((q, i) => (
        <div key={i} className="item" style={{ alignItems: "flex-start" }} data-testid="ai-q-draft">
          <input type="checkbox" checked={pick[i] ?? false} onChange={(e) => setPick(pick.map((v, j) => (j === i ? e.target.checked : v)))} aria-label={`Chọn câu ${i + 1}`} />
          <div className="grow">
            <span className="tag violet">{TYPE_LABEL[q.type]}</span> <span className="tag green">{q.level}</span>
            <div><MathText value={q.stem} /></div>
            {q.options?.map((o, j) => <div key={j} style={{ color: q.answer === j ? "#116b34" : undefined }}>{LETTERS[j]}. <MathText value={o} /></div>)}
            {q.statements?.map((o, j) => <div key={j}>{"abcd"[j]}) <MathText value={o} /> — {(q.answer as boolean[])[j] ? "Đúng" : "Sai"}</div>)}
            {q.type === "short_answer" && <div>Đáp án: <MathText value={String(q.answer)} /></div>}
            {q.type === "essay" && <div>Thang chấm: <MathText value={q.rubric ?? ""} /> ({q.points} điểm)</div>}
          </div>
        </div>
      ))}
      {drafts.length > 0 && (
        <div className="bar" style={{ marginBottom: 0, marginTop: 10 }}>
          {rejected > 0 && <span className="tag amber">{rejected} câu AI viết lỗi đã bị loại</span>}
          <span className="sp" />
          <button className="btn" disabled={busy || !pick.some(Boolean)} onClick={() => void save()} data-testid="ai-q-save"><Icon name="check" size={18} />Thêm {pick.filter(Boolean).length} câu vào ngân hàng</button>
        </div>
      )}
    </div>
  );
}
