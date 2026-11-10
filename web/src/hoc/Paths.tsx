import { useCallback, useEffect, useState } from "react";
import { errText } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { Markdown } from "./Markdown";
import { type Citation, type Kb, tutorApi } from "./client";

type Pt = { id: string; name: string; type: string; mastery: number; attempts: number; status: "new" | "learning" | "mastered"; nextReviewAt: number | null };
type PathView = { id: string; name: string; goal: string; subject: string; grade: number; description: string; modules: { name: string; objective: string; points: Pt[] }[]; progress: { total: number; mastered: number; percent: number }; next: Pt | null; due: Pt[]; diagnosed: boolean; pending: { kind: string; pointId: string | null; questions: string[] } | null };
type Row = { id: string; name: string; progress: { percent: number; mastered: number; total: number } };
type Graded = { results: { question: string; answer: string; expected: string; explanation: string; correct: boolean; feedback: string }[]; diagnoses: { question: string; errorType: string; why: string; remediation: string }[]; path: PathView };

const STATUS = { new: ["Chưa học", ""], learning: ["Đang học", "amber"], mastered: ["Đã thành thạo", "green"] } as const;
const TYPE_VI: Record<string, string> = { memory: "ghi nhớ", concept: "khái niệm", procedure: "kĩ năng", design: "vận dụng" };
const ERR_VI: Record<string, string> = { structural: "hổng kiến thức nền", deviation: "hiểu lệch", application: "chưa vận dụng được", metacognitive: "thiếu kiểm tra lại" };

export function Paths() {
  const [rows, setRows] = useState<Row[]>([]);
  const [path, setPath] = useState<PathView | null>(null);
  const [kbs, setKbs] = useState<Kb[]>([]);
  const [form, setForm] = useState({ name: "", goal: "", subject: "Toán", grade: 8, kbId: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<{ md: string; cites: Citation[] } | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [fey, setFey] = useState<{ pointId: string; text: string } | null>(null);
  const [feyRes, setFeyRes] = useState<{ passed: boolean; feedback: string; gap: string } | null>(null);

  const load = useCallback(() => tutorApi<Row[]>("/paths").then(setRows).catch((e: unknown) => setError(errText(e))), []);
  useEffect(() => {
    void load();
    tutorApi<Kb[]>("/kbs").then((l) => { setKbs(l); if (l[0]) setForm((f) => ({ ...f, subject: l[0]!.subject, grade: l[0]!.grade, kbId: l[0]!.id })); }).catch(() => {});
  }, [load]);

  const run = async <T,>(label: string, f: () => Promise<T>): Promise<T | null> => {
    setBusy(label);
    setError(null);
    try {
      return await f();
    } catch (e) {
      setError(errText(e));
      return null;
    } finally {
      setBusy(null);
    }
  };
  const open = async (id: string) => {
    setText(null); setGraded(null); setFey(null); setFeyRes(null);
    const p = await run("open", () => tutorApi<PathView>(`/paths/${id}`));
    if (p) { setPath(p); setAnswers(p.pending ? p.pending.questions.map(() => "") : []); }
  };
  const create = async () => {
    const p = await run("create", () => tutorApi<PathView>("/paths", { method: "POST", body: { ...form, kbId: form.kbId || undefined } }));
    if (p) { setPath(p); void load(); }
  };
  const step = async <T,>(label: string, body: object) => run(label, () => tutorApi<T>(`/paths/${path!.id}/step`, { method: "POST", body }));
  const refresh = async () => { if (path) setPath(await tutorApi<PathView>(`/paths/${path.id}`)); void load(); };

  const diagnostic = async () => {
    const r = await step<{ questions: { question: string }[] }>("diag", { action: "diagnostic" });
    if (r) { setText(null); setGraded(null); setAnswers(r.questions.map(() => "")); await refresh(); }
  };
  const explain = async (pt: Pt) => {
    const r = await step<{ markdown: string; citations: Citation[] }>(`ex${pt.id}`, { action: "explain", pointId: pt.id });
    if (r) { setGraded(null); setText({ md: r.markdown, cites: r.citations }); await refresh(); }
  };
  const quiz = async (pt: Pt) => {
    const r = await step<{ questions: unknown[] }>(`qz${pt.id}`, { action: "quiz", pointId: pt.id, count: 3 });
    if (r) { setText(null); setGraded(null); setAnswers(r.questions.map(() => "")); await refresh(); }
  };
  const grade = async () => {
    const r = await step<Graded>("grade", { action: "grade", answers });
    if (r) { setGraded(r); setPath(r.path); void load(); }
  };
  const feynman = async () => {
    if (!fey) return;
    const r = await step<{ passed: boolean; feedback: string; gap: string }>("fey", { action: "feynman", pointId: fey.pointId, explanation: fey.text });
    if (r) { setFeyRes(r); await refresh(); }
  };
  const review = async () => {
    const r = await step<{ markdown: string; citations: Citation[] }>("rev", { action: "review" });
    if (r) { setGraded(null); setText({ md: r.markdown || "Chưa có mục nào đến hạn ôn.", cites: r.citations ?? [] }); }
  };

  if (!path)
    return (
      <div className="stack">
        {error && <div className="err">{error}</div>}
        <div className="card">
          <h2>Tạo lộ trình thành thạo mới</h2>
          <div className="formrow">
            <label className="lbl">Chủ đề<input className="inp w-m" value={form.name} placeholder="vd Hằng đẳng thức" onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="path-name" /></label>
            <label className="lbl" style={{ flex: 1 }}>Mục tiêu của em<input className="inp w-l" value={form.goal} placeholder="vd Làm được mọi bài khai triển trong bài kiểm tra 15 phút" onChange={(e) => setForm({ ...form, goal: e.target.value })} /></label>
          </div>
          <div className="formrow">
            <label className="lbl">Môn<input className="inp w-m" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <label className="lbl">Lớp<input className="inp w-s" type="number" min={1} max={16} value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })} /></label>
            <label className="lbl">Kho tài liệu<select className="inp" value={form.kbId} onChange={(e) => setForm({ ...form, kbId: e.target.value })}><option value="">Không dùng tài liệu</option>{kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
            <button className="btn" disabled={!form.name.trim() || !form.goal.trim() || busy === "create"} onClick={() => void create()} data-testid="path-create">{busy === "create" ? "AI đang dựng lộ trình…" : "Dựng lộ trình"}</button>
          </div>
        </div>
        {rows.map((r) => (
          <button key={r.id} className="card" style={{ textAlign: "left", border: 0 }} onClick={() => void open(r.id)}>
            <b>{r.name}</b>
            <div className="meter" style={{ margin: "8px 0 4px" }}><i style={{ width: `${r.progress.percent}%` }} /></div>
            <small style={{ color: "var(--muted)" }}>{r.progress.mastered}/{r.progress.total} mục đã thành thạo · {r.progress.percent}%</small>
          </button>
        ))}
      </div>
    );

  return (
    <div className="stack">
      <button className="back" onClick={() => { setPath(null); void load(); }}><Icon name="left" size={16} />Các lộ trình</button>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <h1 style={{ margin: 0 }}>{path.name}</h1>
        <div style={{ color: "var(--muted)", margin: "4px 0 10px" }}>{path.description || path.goal}</div>
        <div className="meter"><i style={{ width: `${path.progress.percent}%` }} /></div>
        <small style={{ color: "var(--muted)" }}>{path.progress.mastered}/{path.progress.total} mục đã thành thạo · mức chung {path.progress.percent}%</small>
        <div className="bar" style={{ marginTop: 12, marginBottom: 0 }}>
          {!path.diagnosed && <button className="btn" disabled={!!busy} onClick={() => void diagnostic()}>{busy === "diag" ? "Đang soạn…" : "Làm bài chẩn đoán đầu vào"}</button>}
          {path.next && <span>Nên học tiếp: <b>{path.next.name}</b></span>}
          <span className="sp" />
          <button className="btn ghost" disabled={!!busy} onClick={() => void review()}>Ôn tập ({path.due.length} mục đến hạn)</button>
        </div>
      </div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="stack">
          {path.modules.map((m) => (
            <div className="card" key={m.name}>
              <h2>{m.name}</h2>
              <div style={{ color: "var(--muted)", marginTop: -8 }}>{m.objective}</div>
              {m.points.map((p) => (
                <div className="pt" key={p.id}>
                  <div className="grow">
                    {p.name} <small style={{ color: "var(--muted)" }}>({TYPE_VI[p.type] ?? p.type})</small>
                    <div className="meter" style={{ marginTop: 6 }}><i style={{ width: `${Math.round(p.mastery * 100)}%` }} /></div>
                  </div>
                  <span className={`tag ${STATUS[p.status][1]}`}>{STATUS[p.status][0]}</span>
                  <button className="btn ghost sm" disabled={!!busy} onClick={() => void explain(p)}>Học</button>
                  <button className="btn ghost sm" disabled={!!busy} onClick={() => void quiz(p)}>Luyện</button>
                  <button className="btn ghost sm" disabled={!!busy} onClick={() => { setFey({ pointId: p.id, text: "" }); setFeyRes(null); }}>Tự giải thích</button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="stack">
          {busy && busy !== "open" && <div className="card"><div className="empty">Gia sư đang soạn…</div></div>}
          {text && <div className="card"><Markdown text={text.md} cites={text.cites} /></div>}
          {fey && (
            <div className="card">
              <h2>Tự giải thích: {path.modules.flatMap((m) => m.points).find((p) => p.id === fey.pointId)?.name}</h2>
              <textarea className="inp" placeholder="Em thử giải thích bằng lời của mình, như đang dạy một bạn nhỏ hơn…" value={fey.text} onChange={(e) => setFey({ ...fey, text: e.target.value })} />
              <div style={{ marginTop: 10 }}><button className="btn" disabled={fey.text.trim().length < 10 || !!busy} onClick={() => void feynman()}>Nhờ gia sư nhận xét</button></div>
              {feyRes && <div className={`result ${feyRes.passed ? "ok" : "mid"}`}><b>{feyRes.passed ? "Em giải thích tốt!" : "Cần bổ sung thêm"}</b><div>{feyRes.feedback}</div>{feyRes.gap && <div>Còn thiếu: {feyRes.gap}</div>}</div>}
            </div>
          )}
          {path.pending && !graded && (
            <div className="card" data-testid="path-quiz">
              <h2>{path.pending.kind === "diagnostic" ? "Bài chẩn đoán đầu vào" : "Bài luyện"}</h2>
              {path.pending.questions.map((q, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div><b>Câu {i + 1}.</b> <MathText value={q} /></div>
                  <input className="inp w-l" style={{ marginTop: 6 }} value={answers[i] ?? ""} placeholder="Đáp án của em" onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} />
                </div>
              ))}
              <button className="btn" disabled={!!busy} onClick={() => void grade()}>{busy === "grade" ? "Đang chấm…" : "Nộp bài"}</button>
            </div>
          )}
          {graded && (
            <div className="card" data-testid="path-graded">
              <h2>Kết quả</h2>
              {graded.results.map((r, i) => (
                <div key={i} className={`result ${r.correct ? "ok" : "no"}`} style={{ marginTop: i ? 8 : 0 }}>
                  <b>Câu {i + 1}: {r.correct ? "Đúng" : "Chưa đúng"}</b> <MathText value={r.question} />
                  {!r.correct && <div>Đáp án: <MathText value={r.expected} /></div>}
                  {r.explanation && <div style={{ color: "var(--muted)" }}><MathText value={r.explanation} /></div>}
                  {r.feedback && <div>{r.feedback}</div>}
                </div>
              ))}
              {graded.diagnoses.length > 0 && (
                <>
                  <h2 style={{ marginTop: 14 }}>Chẩn đoán lỗi sai</h2>
                  {graded.diagnoses.map((d, i) => <div key={i} className="item"><div className="grow"><span className="tag amber">{ERR_VI[d.errorType] ?? d.errorType}</span> {d.why}<small>{d.remediation}</small></div></div>)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
