import { useEffect, useState } from "react";
import { api, type ExamSummary, type KeyEntry } from "../api";
import { Icon } from "../Icon";

const num = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);

type Resp = number | boolean[] | string;
type Result = { total: number; autoMax: number; pendingEssay: number[] };

export function Grade() {
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [examId, setExamId] = useState("");
  const [code, setCode] = useState("");
  const [keys, setKeys] = useState<{ code: string; entries: KeyEntry[] }[]>([]);
  const [resp, setResp] = useState<Record<number, Resp>>({});
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    api<ExamSummary[]>("/api/exams").then((l) => {
      setExams(l);
      if (l[0]) setExamId(l[0].id);
    }).catch(() => setExams([]));
  }, []);

  useEffect(() => {
    setResp({});
    setResult(null);
    if (!examId) return;
    api<{ code: string; entries: KeyEntry[] }[]>(`/api/exams/${examId}/key`).then((k) => {
      setKeys(k);
      setCode(k[0]?.code ?? "");
    });
  }, [examId]);

  const entries = keys.find((k) => k.code === code)?.entries ?? [];
  const set = (no: number, v: Resp) => {
    setResult(null);
    setResp((r) => ({ ...r, [no]: v }));
  };

  const submit = async () => {
    const responses = Object.fromEntries(Object.entries(resp).filter(([, v]) => v !== "" && v !== undefined));
    setResult(await api<Result>(`/api/exams/${examId}/grade`, { method: "POST", body: { code, responses } }));
  };

  const exam = exams?.find((e) => e.id === examId);

  return (
    <>
      <h1>Chấm bài</h1>
      {exams?.length === 0 ? (
        <div className="card empty">—</div>
      ) : (
        <>
          <div className="bar">
            <select className="inp" value={examId} onChange={(e) => setExamId(e.target.value)} data-testid="g-exam" aria-label="Đề">
              {exams?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            <select className="inp" value={code} onChange={(e) => { setCode(e.target.value); setResp({}); setResult(null); }} data-testid="g-code" aria-label="Mã đề">
              {(exam?.codes ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="card">
            {entries.map((en) => (
              <div className="qrow" key={en.no} data-testid="g-row">
                <span className="no">{en.no}</span>
                <Input entry={en} value={resp[en.no]} onChange={(v) => set(en.no, v)} />
              </div>
            ))}
            <div className="bar" style={{ margin: "16px 0 0" }}>
              <button className="btn" onClick={() => void submit()} data-testid="g-submit"><Icon name="grade" size={18} />Chấm</button>
              {result && (
                <span className="score" data-testid="g-total">
                  {num(result.total)}<small style={{ fontSize: 16, color: "var(--muted)" }}> / {num(result.autoMax)}</small>
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Input({ entry, value, onChange }: { entry: KeyEntry; value: Resp | undefined; onChange: (v: Resp) => void }) {
  if (entry.section === "mcq") {
    return (
      <div className="chips">
        {"ABCD".split("").map((l, i) => (
          <button key={l} className={value === i ? "chip on" : "chip"} onClick={() => onChange(i)} data-testid={`mcq-${entry.no}-${l}`}>{l}</button>
        ))}
      </div>
    );
  }
  if (entry.section === "true_false") {
    const arr = Array.isArray(value) ? value : [false, false, false, false];
    return (
      <div className="chips">
        {arr.map((b, i) => (
          <button key={i} className={b ? "chip good" : "chip"} style={{ minWidth: 64 }} onClick={() => onChange(arr.map((x, j) => (j === i ? !x : x)))}>
            {"abcd"[i]} · {b ? "Đ" : "S"}
          </button>
        ))}
      </div>
    );
  }
  if (entry.section === "short_answer") {
    return <input className="inp" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return <span className="tag amber">Tự luận</span>;
}
