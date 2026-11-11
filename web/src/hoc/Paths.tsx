import { useEffect, useRef, useState } from "react";
import { ApiError } from "../apiCore";
import { MathText } from "../math/MathText";
import { Button } from "../ui/components/Button";
import { Meter, RingBig } from "../ui/components/Progress";
import { Skeleton } from "../ui/components/Skeleton";
import { EmptyState, ErrorState } from "../ui/components/States";
import { type StreamState, StreamingText } from "../ui/components/StreamingText";
import { useToast } from "../ui/components/Toast";
import { Icon } from "../ui/Icon";
import { useAction } from "../ui/data/action";
import { request } from "../ui/data/http";
import { invalidate, setQueryData, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import type { Citation, Kb } from "./client";
import { Markdown } from "./Markdown";
import "./luyen.css";

type Pt = { id: string; name: string; type: string; mastery: number; attempts: number; status: "new" | "learning" | "mastered"; nextReviewAt: number | null };
type PathView = { id: string; name: string; goal: string; subject: string; grade: number; description: string; modules: { name: string; objective: string; points: Pt[] }[]; progress: { total: number; mastered: number; percent: number }; next: Pt | null; due: Pt[]; diagnosed: boolean; pending: { kind: string; pointId: string | null; questions: string[] } | null };
type Row = { id: string; name: string; progress: { percent: number; mastered: number; total: number } };
type Graded = { results: { question: string; answer: string; expected: string; explanation: string; correct: boolean; feedback: string }[]; diagnoses: { question: string; errorType: string; why: string; remediation: string }[]; path: PathView };

const STATUS = { new: ["Chưa học", "lock"], learning: ["Đang học", "loader"], mastered: ["Đã thành thạo", "check"] } as const;
const TYPE_VI: Record<string, string> = { memory: "ghi nhớ", concept: "khái niệm", procedure: "kĩ năng", design: "vận dụng" };
const ERR_VI: Record<string, string> = { structural: "hổng kiến thức nền", deviation: "hiểu lệch", application: "chưa vận dụng được", metacognitive: "thiếu kiểm tra lại" };
const LIST_KEY = "hoc/lo-trinh";
const msg = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof TypeError ? "Mất mạng — em thử lại nhé" : "Có lỗi, em thử lại nhé");

/** Chữ AI trả về một lần: hiện dần như đang viết rồi chốt (giảm chuyển động → hiện ngay, do StreamingText lo). */
function useReveal() {
  const [ai, setAi] = useState<{ md: string; cites: Citation[]; state: StreamState } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (md: string, cites: Citation[]) => {
    window.clearTimeout(timer.current);
    setAi({ md, cites, state: "streaming" });
    timer.current = window.setTimeout(() => setAi((x) => (x && x.md === md ? { ...x, state: "done" } : x)), Math.min(8000, (md.length / 90) * 1000 + 300));
  };
  return { ai, show, wait: () => setAi({ md: "", cites: [], state: "streaming" }), stop: () => setAi((x) => (x ? { ...x, state: "stopped" } : x)), clear: () => setAi(null) };
}

function ListSkel() {
  return <div className="lt-grid" aria-busy="true" aria-label="Đang tải lộ trình">{[0, 1, 2].map((i) => <div className="lt-card" key={i}><Skeleton w="70%" h={18} /><Skeleton w={80} h={26} /><Skeleton w="100%" h={6} /></div>)}</div>;
}

/** Lộ trình thành thạo: danh sách + tạo mới; chi tiết theo ?id= (Back quay lại danh sách). */
export function Paths() {
  const [id, setId] = useUrlState<string>("id", "", { mode: "push" });
  return id ? <PathDetail id={id} onBack={() => setId("")} /> : <PathList onOpen={setId} />;
}

function PathList({ onOpen }: { onOpen: (id: string) => void }) {
  usePageMeta("Lộ trình");
  const toast = useToast();
  const rows = useQuery(LIST_KEY, (signal) => request<Row[]>("/api/tutor/paths", { signal }));
  const kbs = useQuery("hoc/luyen-tap/kbs", (signal) => request<Kb[]>("/api/tutor/kbs", { signal }), { staleMs: 5 * 60_000 });
  const [form, setForm] = useState({ name: "", goal: "", subject: "", grade: 0, kbId: "" });
  const k0 = kbs.data?.[0];
  const f = { ...form, subject: form.subject || k0?.subject || "Toán", grade: form.grade || k0?.grade || 10, kbId: form.kbId };
  const create = useAction((ctx) => request<PathView>("/api/tutor/paths", { method: "POST", body: { ...f, kbId: f.kbId || undefined }, idempotencyKey: ctx.idempotencyKey }));
  const go = async () => {
    try {
      const p = await create.run();
      setQueryData(`hoc/lo-trinh/${p.id}`, p);
      invalidate(LIST_KEY);
      toast({ title: "Đã dựng lộ trình", msg: p.name });
      onOpen(p.id);
    } catch (e) {
      toast({ kind: "err", title: "Chưa dựng được lộ trình", msg: msg(e) });
    }
  };
  return (
    <div className="lt">
      <h1 className="page-title">Lộ trình</h1>
      <p className="caption">Gia sư AI chia chủ đề thành các mục nhỏ, chẩn đoán đầu vào rồi dẫn em tới thành thạo.</p>
      {rows.error && !rows.data ? (
        <ErrorState title="Không tải được lộ trình" onRetry={() => rows.refetch()} />
      ) : !rows.data ? (
        <ListSkel />
      ) : rows.data.length === 0 ? null : (
        <div className="lt-grid enter-list">
          {rows.data.map((r, i) => (
            <button type="button" key={r.id} className="lt-card" style={{ ["--i" as string]: Math.min(i, 8) }} onClick={() => onOpen(r.id)}>
              <h3><MathText value={r.name} /></h3>
              <span className="pct"><b>{r.progress.percent}%</b>thành thạo · {r.progress.mastered}/{r.progress.total} mục</span>
              <Meter value={r.progress.percent} label={`${r.progress.percent}% thành thạo`} />
            </button>
          ))}
        </div>
      )}
      <section className="card" style={{ marginTop: "var(--s-6)" }} aria-label="Tạo lộ trình mới">
        <div className="hd"><h2>{rows.data?.length ? "Thêm lộ trình" : "Tạo lộ trình đầu tiên"}</h2></div>
        {rows.data?.length === 0 && <EmptyState icon="target" title="Chưa có lộ trình nào" text="Nhập chủ đề và mục tiêu, gia sư sẽ dựng lộ trình cho em." />}
        <form className="lt-new" onSubmit={(e) => { e.preventDefault(); void go(); }}>
          <label className="field"><span className="lbl">Chủ đề</span><input className="input" value={form.name} placeholder="vd Hằng đẳng thức" onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="path-name" /></label>
          <label className="field wide"><span className="lbl">Mục tiêu của em</span><input className="input" value={form.goal} placeholder="vd Làm được mọi bài khai triển trong bài 15 phút" onChange={(e) => setForm({ ...form, goal: e.target.value })} /></label>
          <label className="field"><span className="lbl">Môn</span><input className="input" value={f.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
          <label className="field"><span className="lbl">Lớp</span>
            <select className="select" value={f.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}>{Array.from({ length: 16 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g <= 12 ? `Lớp ${g}` : `ĐH năm ${g - 12}`}</option>)}</select>
          </label>
          <label className="field wide"><span className="lbl">Kho tài liệu</span>
            <select className="select" value={f.kbId} onChange={(e) => setForm({ ...form, kbId: e.target.value })}><option value="">Không dùng tài liệu</option>{kbs.data?.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
          </label>
          <div className="acts"><Button type="submit" variant="primary" icon="spark" busy={create.pending} disabled={!form.name.trim() || !form.goal.trim()} data-testid="path-create">{create.pending ? "AI đang dựng lộ trình…" : "Dựng lộ trình"}</Button></div>
        </form>
      </section>
    </div>
  );
}

function PathDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const toast = useToast();
  const key = `hoc/lo-trinh/${id}`;
  const q = useQuery(key, (signal) => request<PathView>(`/api/tutor/paths/${encodeURIComponent(id)}`, { signal }));
  const path = q.data;
  usePageMeta(path ? path.name : "Lộ trình", [{ label: "Lộ trình", to: "/hoc/lo-trinh" }, { label: path?.name ?? "…" }]);
  const [busy, setBusy] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [fey, setFey] = useState<{ pointId: string; text: string } | null>(null);
  const [feyRes, setFeyRes] = useState<{ passed: boolean; feedback: string; gap: string } | null>(null);
  const r = useReveal();
  useEffect(() => {
    if (path?.pending) setAnswers((a) => (a.length === path.pending!.questions.length ? a : path.pending!.questions.map(() => "")));
  }, [path?.pending]);

  const put = (p: PathView) => {
    setQueryData(key, p);
    invalidate(LIST_KEY);
  };
  const step = async <T,>(label: string, body: object): Promise<T | null> => {
    if (busy) return null;
    setBusy(label);
    try {
      return await request<T>(`/api/tutor/paths/${encodeURIComponent(id)}/step`, { method: "POST", body });
    } catch (e) {
      toast({ kind: "err", title: "Gia sư chưa trả lời được", msg: msg(e) });
      r.clear();
      return null;
    } finally {
      setBusy(null);
    }
  };
  const refresh = async () => put(await request<PathView>(`/api/tutor/paths/${encodeURIComponent(id)}`));
  const diagnostic = async () => {
    setGraded(null);
    r.clear();
    if (await step("diag", { action: "diagnostic" })) await refresh();
  };
  const explain = async (pt: Pt) => {
    setGraded(null);
    r.wait();
    const x = await step<{ markdown: string; citations: Citation[] }>(`ex${pt.id}`, { action: "explain", pointId: pt.id });
    if (x) {
      r.show(x.markdown, x.citations);
      await refresh();
    }
  };
  const quiz = async (pt: Pt) => {
    setGraded(null);
    r.clear();
    if (await step(`qz${pt.id}`, { action: "quiz", pointId: pt.id, count: 3 })) await refresh();
  };
  const grade = async () => {
    const x = await step<Graded>("grade", { action: "grade", answers });
    if (x) {
      setGraded(x);
      put(x.path);
      const ok = x.results.filter((y) => y.correct).length;
      toast({ title: `Đúng ${ok}/${x.results.length} câu`, msg: ok === x.results.length ? "Tuyệt vời!" : "Xem chẩn đoán lỗi bên dưới" });
    }
  };
  const feynman = async () => {
    if (!fey) return;
    const x = await step<{ passed: boolean; feedback: string; gap: string }>("fey", { action: "feynman", pointId: fey.pointId, explanation: fey.text });
    if (x) {
      setFeyRes(x);
      await refresh();
    }
  };
  const review = async () => {
    setGraded(null);
    r.wait();
    const x = await step<{ markdown: string; citations: Citation[] }>("rev", { action: "review" });
    if (x) r.show(x.markdown || "Chưa có mục nào đến hạn ôn.", x.citations ?? []);
  };

  if (!path && q.error) return <ErrorState title="Không mở được lộ trình" status={q.error instanceof ApiError ? q.error.status : undefined} onRetry={() => q.refetch()} />;
  if (!path)
    return (
      <div className="lt" aria-busy="true">
        <section className="page-head hero-field lt-head"><div><Skeleton w="50%" h={36} className="on-field" /><Skeleton w="80%" h={16} className="on-field" style={{ marginTop: 12 }} /></div></section>
        <div className="lt-body"><section className="card"><Skeleton w="40%" h={18} />{[0, 1, 2, 3].map((i) => <Skeleton key={i} w="90%" h={14} style={{ marginTop: 16 }} />)}</section></div>
      </div>
    );
  const pts = path.modules.flatMap((m) => m.points);
  return (
    <div className="lt">
      <Button variant="ghost" size="sm" icon="left" onClick={onBack} style={{ marginBottom: "var(--s-3)" }}>Các lộ trình</Button>
      <section className="page-head hero-field lt-head" aria-label="Lộ trình">
        <div style={{ position: "relative", zIndex: 1, minWidth: 0 }}>
          <div className="eyebrow">{path.subject} · {path.grade <= 12 ? `lớp ${path.grade}` : `ĐH năm ${path.grade - 12}`}</div>
          <h1><MathText value={path.name} /></h1>
          <div className="sub"><MathText value={path.description || path.goal} /></div>
        </div>
        <RingBig value={path.progress.mastered} max={Math.max(1, path.progress.total)} label={`${path.progress.mastered} trên ${path.progress.total} mục thành thạo`}>
          <b>{path.progress.percent}%</b>
          <span>{path.progress.mastered}/{path.progress.total} mục</span>
        </RingBig>
        <div className="acts">
          {!path.diagnosed && <Button className="on-field" icon="target" busy={busy === "diag"} disabled={!!busy && busy !== "diag"} onClick={diagnostic}>Làm bài chẩn đoán đầu vào</Button>}
          <Button className="ghost-field" icon="refresh" busy={busy === "rev"} disabled={!!busy && busy !== "rev"} onClick={review}>Ôn tập · {path.due.length} mục đến hạn</Button>
          {path.next && <span className="next">Nên học tiếp: <b><MathText value={path.next.name} /></b></span>}
        </div>
      </section>
      <div className="lt-body">
        <div className="lt-mods" style={{ display: "grid", gap: "var(--s-4)" }}>
          {path.modules.map((m) => (
            <section className="card lt-mod" key={m.name}>
              <h2><MathText value={m.name} /></h2>
              <div className="obj"><MathText value={m.objective} /></div>
              {m.points.map((p) => (
                <div className="lt-pt" key={p.id}>
                  <span className={`st ${p.status}`} title={STATUS[p.status][0]} aria-label={STATUS[p.status][0]}><Icon name={STATUS[p.status][1]} size="sm" /></span>
                  <div className="nm">
                    <MathText value={p.name} /><small>{TYPE_VI[p.type] ?? p.type}</small>
                    <Meter thin value={Math.round(p.mastery * 100)} label={`Thành thạo ${Math.round(p.mastery * 100)}%`} />
                  </div>
                  <div className="acts">
                    <Button variant="ghost" size="sm" busy={busy === `ex${p.id}`} disabled={!!busy && busy !== `ex${p.id}`} onClick={() => explain(p)}>Học</Button>
                    <Button variant="ghost" size="sm" busy={busy === `qz${p.id}`} disabled={!!busy && busy !== `qz${p.id}`} onClick={() => quiz(p)}>Luyện</Button>
                    <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => { setFey({ pointId: p.id, text: "" }); setFeyRes(null); }}>Tự giải thích</Button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
        <aside className="lt-side" aria-label="Gia sư">
          {r.ai && (
            <section className="card">
              <div className="hd"><h2>Gia sư giảng</h2></div>
              <StreamingText className="read" text={r.ai.md} state={r.ai.state} onStop={r.stop} render={(t) => <Markdown text={t} cites={r.ai?.cites ?? []} />} />
            </section>
          )}
          {fey && (
            <section className="card">
              <div className="hd"><h2>Tự giải thích: <MathText value={pts.find((p) => p.id === fey.pointId)?.name ?? ""} /></h2></div>
              <textarea className="textarea" style={{ width: "100%", minHeight: 140 }} placeholder="Em thử giải thích bằng lời của mình, như đang dạy một bạn nhỏ hơn…" value={fey.text} onChange={(e) => setFey({ ...fey, text: e.target.value })} />
              <Button variant="primary" style={{ marginTop: 10 }} busy={busy === "fey"} disabled={fey.text.trim().length < 10 || (!!busy && busy !== "fey")} onClick={feynman}>Nhờ gia sư nhận xét</Button>
              {feyRes && <div className={`lt-res ${feyRes.passed ? "ok" : "mid"}`}><b>{feyRes.passed ? "Em giải thích tốt!" : "Cần bổ sung thêm"}</b>{feyRes.feedback}{feyRes.gap && <div>Còn thiếu: {feyRes.gap}</div>}</div>}
            </section>
          )}
          {path.pending && !graded && (
            <section className="card" data-testid="path-quiz">
              <div className="hd"><h2>{path.pending.kind === "diagnostic" ? "Bài chẩn đoán đầu vào" : "Bài luyện"}</h2></div>
              {path.pending.questions.map((x, i) => (
                <label key={i} className="lt-q">
                  <span><b>Câu {i + 1}.</b> <MathText value={x} /></span>
                  <input className="input" value={answers[i] ?? ""} placeholder="Đáp án của em" onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} />
                </label>
              ))}
              <Button variant="primary" busy={busy === "grade"} disabled={!!busy && busy !== "grade"} onClick={grade}>Nộp bài</Button>
            </section>
          )}
          {graded && (
            <section className="card" data-testid="path-graded">
              <div className="hd"><h2>Kết quả</h2></div>
              {graded.results.map((x, i) => (
                <div key={i} className={`lt-res ${x.correct ? "ok" : "no"}`}>
                  <b>Câu {i + 1}: {x.correct ? "Đúng" : "Chưa đúng"}</b>
                  <MathText value={x.question} />
                  {!x.correct && <div>Đáp án: <MathText value={x.expected} /></div>}
                  {x.explanation && <div className="caption"><MathText value={x.explanation} /></div>}
                  {x.feedback && <div>{x.feedback}</div>}
                </div>
              ))}
              {graded.diagnoses.length > 0 && (
                <>
                  <h3 style={{ marginTop: 14, fontWeight: 800 }}>Chẩn đoán lỗi sai</h3>
                  {graded.diagnoses.map((d, i) => <div key={i} className="lt-res mid"><b>{ERR_VI[d.errorType] ?? d.errorType}</b>{d.why}<div className="caption">{d.remediation}</div></div>)}
                </>
              )}
            </section>
          )}
          {!r.ai && !fey && !path.pending && !graded && (
            <section className="card"><EmptyState icon="bot" title="Chọn một mục để học" text="Bấm Học để gia sư giảng, Luyện để làm 3 câu, hoặc Tự giải thích để kiểm tra mình hiểu chưa." /></section>
          )}
        </aside>
      </div>
    </div>
  );
}
