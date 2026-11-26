import { useEffect, useRef, useState } from "react";
import { ApiError } from "../apiCore";
import { MathText } from "../math/MathText";
import { Button } from "../ui/components/Button";
import { Meter } from "../ui/components/Progress";
import { Skeleton } from "../ui/components/Skeleton";
import { ErrorState } from "../ui/components/States";
import { type StreamState, StreamingText } from "../ui/components/StreamingText";
import { useToast } from "../ui/components/Toast";
import { Icon } from "../ui/Icon";
import { request } from "../ui/data/http";
import { invalidate, setQueryData, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import type { Citation, Kb } from "./client";
import { Markdown } from "./Markdown";
import { Mascot } from "../portal/hoc/Mascot";
import "./luyen.css";

type Pt = { id: string; name: string; type: string; mastery: number; attempts: number; status: "new" | "learning" | "mastered"; nextReviewAt: number | null };
type PathView = { id: string; name: string; goal: string; subject: string; grade: number; description: string; modules: { name: string; objective: string; points: Pt[] }[]; progress: { total: number; mastered: number; percent: number }; next: Pt | null; due: Pt[]; diagnosed: boolean; pending: { kind: string; pointId: string | null; questions: string[] } | null };
type Row = { id: string; name: string; progress: { percent: number; mastered: number; total: number } };
type Graded = { results: { question: string; answer: string; expected: string; explanation: string; correct: boolean; feedback: string }[]; diagnoses: { question: string; errorType: string; why: string; remediation: string }[]; path: PathView };

const STATUS = { new: ["Chưa học", "lock"], learning: ["Đang học", "target"], mastered: ["Đã thành thạo", "check"] } as const;
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
  // Tạo mới: một Idempotency-Key cho mỗi lần dựng, giữ nguyên khi thử lại sau lỗi mạng (máy chủ trả kết quả lần đầu).
  // Không dùng useAction ở đây: module data/action dùng chung với cổng GV sẽ tách chunk riêng, tăng JS lần đầu cổng GV.
  const idem = useRef<string | null>(null);
  const [creating, setCreating] = useState(false);
  const go = async () => {
    if (creating) return;
    idem.current ??= globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    setCreating(true);
    try {
      const p = await request<PathView>("/api/tutor/paths", { method: "POST", body: { ...f, kbId: f.kbId || undefined }, idempotencyKey: idem.current });
      idem.current = null;
      setQueryData(`hoc/lo-trinh/${p.id}`, p);
      invalidate(LIST_KEY);
      toast({ title: "Đã dựng lộ trình", msg: p.name });
      onOpen(p.id);
    } catch (e) {
      if (!(e instanceof TypeError)) idem.current = null; // lỗi mạng: lần sau gửi lại cùng khoá
      toast({ kind: "err", title: "Chưa dựng được lộ trình", msg: msg(e) });
    } finally {
      setCreating(false);
    }
  };
  const empty = rows.data?.length === 0;
  return (
    <div className="lt">
      <header className="hh">
        <div>
          <div className="hh-eyebrow">Chia nhỏ · chẩn đoán · dẫn tới thành thạo</div>
          <h1 className="hh-title">Lộ trình</h1>
        </div>
      </header>
      {rows.error && !rows.data ? (
        <ErrorState title="Không tải được lộ trình" onRetry={() => rows.refetch()} />
      ) : !rows.data ? (
        <ListSkel />
      ) : empty ? (
        <RouteDemo />
      ) : (
        <div className="lt-list enter-list">
          {rows.data.map((r, i) => (
            <button type="button" key={r.id} className="lt-row" style={{ ["--i" as string]: Math.min(i, 8) }} onClick={() => onOpen(r.id)}>
              <h3><MathText value={r.name} /></h3>
              <Meter value={r.progress.percent} label={`${r.progress.percent}% thành thạo`} />
              <span className="pct"><b>{r.progress.percent}%</b>{r.progress.mastered}/{r.progress.total} mục</span>
              <Icon name="right" size="sm" />
            </button>
          ))}
        </div>
      )}
      <section className="lt-make" aria-label="Tạo lộ trình mới">
        <h2 className="hh-sec">{empty ? "Dựng lộ trình đầu tiên" : "Thêm lộ trình"}</h2>
        <form className="lt-new" onSubmit={(e) => { e.preventDefault(); void go(); }}>
          <label className="field"><span className="lbl">Chủ đề</span><input className="input" value={form.name} placeholder="vd Quang hợp" onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="path-name" /></label>
          <label className="field wide"><span className="lbl">Mục tiêu của em</span><input className="input" value={form.goal} placeholder="vd Giải thích được vì sao cây cần ánh sáng" onChange={(e) => setForm({ ...form, goal: e.target.value })} /></label>
          <label className="field"><span className="lbl">Môn</span><input className="input" value={f.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
          <label className="field"><span className="lbl">Lớp</span>
            <select className="select" value={f.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}>{Array.from({ length: 16 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g <= 12 ? `Lớp ${g}` : `ĐH năm ${g - 12}`}</option>)}</select>
          </label>
          <label className="field wide"><span className="lbl">Kho tài liệu</span>
            <select className="select" value={f.kbId} onChange={(e) => setForm({ ...form, kbId: e.target.value })}><option value="">Không dùng tài liệu</option>{kbs.data?.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
          </label>
          <div className="acts"><Button type="submit" variant="primary" icon="spark" busy={creating} disabled={!form.name.trim() || !form.goal.trim()} data-testid="path-create">{creating ? "AI đang dựng…" : "Dựng lộ trình"}</Button></div>
        </form>
      </section>
    </div>
  );
}

// Bản xem trước khi chưa có lộ trình: một con đường mẫu (Sinh học) với các trạm, mờ nhẹ.
const DEMO = [
  { n: "Diệp lục & ánh sáng", m: 1 },
  { n: "Pha sáng", m: 0.8 },
  { n: "Pha tối", m: 0.45 },
  { n: "Yếu tố ảnh hưởng", m: 0.1 },
  { n: "Ứng dụng trồng trọt", m: 0 },
];
function RouteDemo() {
  const W = 880;
  const xs = DEMO.map((_, i) => 90 + (i * (W - 180)) / (DEMO.length - 1));
  const ys = [120, 60, 120, 60, 120];
  const d = xs.map((x, i) => `${i ? "S" : "M"}${i ? `${(xs[i - 1]! + x) / 2},${ys[i]!} ` : ""}${x},${ys[i]!}`).join(" ");
  return (
    <figure className="lt-demo" aria-label="Ví dụ một lộ trình: Quang hợp, 5 trạm">
      <figcaption><span className="chipc">Ví dụ</span> Quang hợp · Sinh học 11</figcaption>
      <svg viewBox={`0 0 ${W} 190`} role="img" aria-hidden="true">
        <path d={d} className="road" />
        <path d={d} className="road-done" pathLength={100} style={{ strokeDasharray: "52 100" }} />
        {DEMO.map((p, i) => (
          <g key={p.n} className="stop" style={{ ["--i" as string]: i }} transform={`translate(${xs[i]},${ys[i]})`}>
            <circle r="20" className="bg" />
            <circle r="20" className="fill" pathLength={100} style={{ strokeDasharray: `${p.m * 100} 100` }} transform="rotate(-90)" />
            <text y="5" textAnchor="middle" className="pc">{Math.round(p.m * 100)}</text>
            <text y={ys[i]! > 90 ? 46 : -32} textAnchor="middle" className="nm">{p.n}</text>
          </g>
        ))}
      </svg>
    </figure>
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
        <section className="lt-head"><div><Skeleton w="50%" h={40} /><Skeleton w="80%" h={16} style={{ marginTop: 12 }} /></div></section>
        <div className="lt-body"><section><Skeleton w="40%" h={18} />{[0, 1, 2, 3].map((i) => <Skeleton key={i} w="90%" h={14} style={{ marginTop: 16 }} />)}</section></div>
      </div>
    );
  const pts = path.modules.flatMap((m) => m.points);
  return (
    <div className="lt">
      <Button variant="ghost" size="sm" icon="left" onClick={onBack} style={{ marginBottom: "var(--s-3)" }}>Các lộ trình</Button>
      <section className="lt-head" aria-label="Lộ trình">
        <div style={{ minWidth: 0 }}>
          <div className="hh-eyebrow">{path.subject} · {path.grade <= 12 ? `lớp ${path.grade}` : `ĐH năm ${path.grade - 12}`}</div>
          <h1 className="hh-title"><MathText value={path.name} /></h1>
          <p className="sub"><MathText value={path.description || path.goal} /></p>
          <div className="acts">
            {!path.diagnosed ? (
              <Button variant="primary" size="lg" icon="target" busy={busy === "diag"} disabled={!!busy && busy !== "diag"} onClick={diagnostic}>Chẩn đoán đầu vào</Button>
            ) : null}
            <Button variant={path.diagnosed ? "primary" : undefined} size="lg" icon="refresh" busy={busy === "rev"} disabled={!!busy && busy !== "rev"} onClick={review}>Ôn · {path.due.length} mục</Button>
            {path.next && <span className="next">Tiếp theo: <b><MathText value={path.next.name} /></b></span>}
          </div>
        </div>
        <div className="hn-ring" role="img" aria-label={`${path.progress.mastered} trên ${path.progress.total} mục thành thạo`}>
          <svg viewBox="0 0 184 184" aria-hidden="true">
            <circle className="tr" cx="92" cy="92" r="80" />
            <circle className="v" cx="92" cy="92" r="80" strokeDasharray={2 * Math.PI * 80} strokeDashoffset={2 * Math.PI * 80 * (1 - path.progress.percent / 100)} style={{ ["--c" as string]: 2 * Math.PI * 80 }} />
          </svg>
          <div><b>{path.progress.percent}<small>%</small></b><span>{path.progress.mastered}/{path.progress.total} mục</span></div>
        </div>
      </section>
      <div className="lt-body">
        <div className="lt-mods" style={{ display: "grid", gap: "var(--s-4)" }}>
          {path.modules.map((m) => (
            <section className="lt-mod" key={m.name}>
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
            <section className="lt-box">
              <div className="hd"><h2>Gia sư giảng</h2></div>
              <StreamingText className="read" text={r.ai.md} state={r.ai.state} onStop={r.stop} render={(t) => <Markdown text={t} cites={r.ai?.cites ?? []} />} />
            </section>
          )}
          {fey && (
            <section className="lt-box">
              <div className="hd"><h2>Tự giải thích: <MathText value={pts.find((p) => p.id === fey.pointId)?.name ?? ""} /></h2></div>
              <textarea className="textarea" style={{ width: "100%", minHeight: 140 }} placeholder="Em thử giải thích bằng lời của mình, như đang dạy một bạn nhỏ hơn…" value={fey.text} onChange={(e) => setFey({ ...fey, text: e.target.value })} />
              <Button variant="primary" style={{ marginTop: 10 }} busy={busy === "fey"} disabled={fey.text.trim().length < 10 || (!!busy && busy !== "fey")} onClick={feynman}>Nhờ gia sư nhận xét</Button>
              {feyRes && <div className={`lt-res ${feyRes.passed ? "ok" : "mid"}`}><b>{feyRes.passed ? "Em giải thích tốt!" : "Cần bổ sung thêm"}</b>{feyRes.feedback}{feyRes.gap && <div>Còn thiếu: {feyRes.gap}</div>}</div>}
            </section>
          )}
          {path.pending && !graded && (
            <section className="lt-box" data-testid="path-quiz">
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
            <section className="lt-box" data-testid="path-graded">
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
            <section className="lt-pick"><Mascot mood="chao" size={72} /><p>Chọn một mục: <b>Học</b>, <b>Luyện</b> hoặc <b>Tự giải thích</b>.</p></section>
          )}
        </aside>
      </div>
    </div>
  );
}
