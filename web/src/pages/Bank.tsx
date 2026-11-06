import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, api, type Question } from "../api";
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
        <button className="btn" onClick={() => setAdding((a) => !a)} data-testid="add-q"><Icon name="plus" size={18} />Thêm</button>
      </div>
      {error && <div className="err">{error}</div>}
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
