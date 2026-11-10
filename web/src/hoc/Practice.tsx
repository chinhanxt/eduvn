import { useCallback, useEffect, useState } from "react";
import { errText } from "../api";
import { MathText } from "../math/MathText";
import { Markdown } from "./Markdown";
import { type Kb, tutorApi } from "./client";

type PQ = { id: string; type: "mcq" | "true_false" | "short_answer" | "essay"; topic: string; level: string; stem: string; options?: string[]; statements?: string[]; points?: number };
type Next = { mode: "review" | "new" | "done"; question: PQ | null; counts: { due: number; new: number } };
type Result = { correct: boolean; partial: boolean; score: number; max: number; graded: string; feedback: string; explanation: string | null; answer: unknown; rating: string; nextDueAt: string; intervalDays: number };
type Stats = { learned: number; due: number; mistakes: number; accuracy: number | null; answered: number; daily: { date: string; answered: number; correct: number }[]; topics: { topic: string; learned: number; mistakes: number; due: number }[] };

const LETTER = "ABCD";
const when = (iso: string, days: number) => (days < 0.1 ? "sau ít phút" : days < 1 ? "trong hôm nay" : `sau ${Math.round(days)} ngày`) + ` (${new Date(iso).toLocaleDateString("vi-VN")})`;

export function Practice() {
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState(8);
  const [topic, setTopic] = useState("");
  const [kbs, setKbs] = useState<Kb[]>([]);
  const [cur, setCur] = useState<Next | null>(null);
  const [extra, setExtra] = useState<PQ[]>([]);
  const [resp, setResp] = useState<unknown>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [rated, setRated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState("");
  const [reply, setReply] = useState("");

  const q = cur?.question ?? null;
  const loadStats = useCallback(() => tutorApi<Stats>("/practice/stats?days=7").then(setStats).catch(() => {}), []);
  useEffect(() => {
    void loadStats();
    tutorApi<Kb[]>("/kbs").then((l) => { setKbs(l); if (l[0]) { setSubject(l[0].subject); setGrade(l[0].grade); } }).catch(() => {});
  }, [loadStats]);

  const reset = () => { setResp(null); setRes(null); setRated(false); setReply(""); setAsk(""); };
  const nextQ = async () => {
    reset();
    setError(null);
    if (extra.length) {
      const [first, ...rest] = extra;
      setExtra(rest);
      setCur({ mode: "new", question: first!, counts: cur?.counts ?? { due: 0, new: 0 } });
      return;
    }
    try {
      setCur(await tutorApi<Next>(`/practice/next?subject=${encodeURIComponent(subject)}&grade=${grade}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`));
    } catch (e) {
      setError(errText(e));
    }
  };
  const submit = async () => {
    if (!q || resp === null) return;
    setBusy(true);
    try {
      setRes(await tutorApi<Result>("/practice/answer", { method: "POST", body: { questionId: q.id, response: Array.isArray(resp) ? resp.map((x) => x === true) : resp } }));
      void loadStats();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const rate = async (rating: "hard" | "good" | "easy") => {
    if (!q) return;
    const r = await tutorApi<{ nextDueAt: string; intervalDays: number }>("/practice/rate", { method: "POST", body: { questionId: q.id, rating } }).catch((e: unknown) => { setError(errText(e)); return null; });
    if (r) { setRated(true); setRes((x) => (x ? { ...x, nextDueAt: r.nextDueAt, intervalDays: r.intervalDays } : x)); }
  };
  const generate = async () => {
    if (!topic.trim()) { setError("Nhập chủ đề em muốn luyện thêm"); return; }
    setBusy(true);
    setError(null);
    try {
      const g = await tutorApi<{ questions: PQ[] }>("/questions/generate", { method: "POST", body: { subject, grade, topic, count: 3, mode: "practice", kbId: kbs.find((k) => k.subject === subject && k.grade === grade)?.id } });
      setExtra(g.questions);
      const [first, ...rest] = g.questions;
      reset();
      setExtra(rest);
      setCur({ mode: "new", question: first ?? null, counts: { due: 0, new: 0 } });
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const followup = async () => {
    if (!q || !ask.trim()) return;
    setReply("…");
    setReply((await tutorApi<{ reply: string }>("/questions/followup", { method: "POST", body: { questionId: q.id, message: ask, userAnswer: resp } }).catch((e: unknown) => ({ reply: errText(e) }))).reply);
  };

  const locked = res !== null;
  const answerKey = res?.answer;
  return (
    <div className="prac">
      <div className="stack">
        <div className="card">
          <div className="formrow">
            <label className="lbl">Môn<input className="inp w-m" value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
            <label className="lbl">Lớp<select className="inp" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>{Array.from({ length: 16 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g <= 12 ? g : `ĐH năm ${g - 12}`}</option>)}</select></label>
            <label className="lbl">Chủ đề (không bắt buộc)<input className="inp w-m" value={topic} onChange={(e) => setTopic(e.target.value)} /></label>
            <button className="btn" onClick={() => void nextQ()} data-testid="prac-start">{cur ? "Câu tiếp theo" : "Bắt đầu luyện"}</button>
            <button className="btn ghost" disabled={busy} onClick={() => void generate()}>AI ra thêm câu về chủ đề</button>
          </div>
          {cur && <small style={{ color: "var(--muted)" }}>Đến hạn ôn: {cur.counts.due} · Câu mới: {cur.counts.new}{cur.mode === "review" ? " · đang ôn lại" : ""}</small>}
        </div>
        {error && <div className="err">{error}</div>}
        {cur?.mode === "done" && <div className="card"><div className="empty">Em đã làm hết câu hiện có. Quay lại khi có câu đến hạn ôn nhé!</div></div>}
        {q && (
          <div className="card qbox" data-testid="prac-q">
            <div className="bar"><span className="tag">{q.topic}</span><span className="tag violet">{q.level}</span>{cur?.mode === "review" && <span className="tag amber">Ôn lại</span>}</div>
            <div className="stem"><MathText value={q.stem} /></div>
            {q.type === "mcq" && q.options?.map((o, i) => (
              <button key={i} disabled={locked} className={`choice${resp === i ? " on" : ""}${locked && answerKey === i ? " right" : ""}${locked && resp === i && answerKey !== i ? " wrong" : ""}`} onClick={() => setResp(i)} data-testid="prac-opt">
                <span className="letter">{LETTER[i]}</span><MathText value={o} />
              </button>
            ))}
            {q.type === "true_false" && q.statements?.map((s, i) => {
              const v = (Array.isArray(resp) ? resp : [null, null, null, null]) as (boolean | null)[];
              const key = Array.isArray(answerKey) ? (answerKey as boolean[]) : null;
              const set = (b: boolean) => setResp(v.map((x, j) => (j === i ? b : x)));
              return (
                <div className="tf-row" key={i}>
                  <span className="letter" style={{ fontWeight: 600 }}>{"abcd"[i]})</span>
                  <div className="grow"><MathText value={s} /></div>
                  <button disabled={locked} className={`chip${Array.isArray(resp) && resp[i] === true ? " on" : ""}`} onClick={() => set(true)}>Đúng</button>
                  <button disabled={locked} className={`chip${Array.isArray(resp) && resp[i] === false ? " on" : ""}`} onClick={() => set(false)}>Sai</button>
                  {key && <span className={`tag ${resp && (resp as boolean[])[i] === key[i] ? "green" : "amber"}`}>{key[i] ? "Đúng" : "Sai"}</span>}
                </div>
              );
            })}
            {q.type === "short_answer" && <input className="inp w-l" disabled={locked} placeholder="Đáp án của em" value={typeof resp === "string" ? resp : ""} onChange={(e) => setResp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} />}
            {q.type === "essay" && <textarea className="inp" style={{ minHeight: 140 }} disabled={locked} placeholder={`Bài làm của em (tối đa ${q.points} điểm)`} value={typeof resp === "string" ? resp : ""} onChange={(e) => setResp(e.target.value)} />}
            {!locked && <div style={{ marginTop: 14 }}><button className="btn" disabled={busy || resp === null || resp === "" || (Array.isArray(resp) && resp.some((x) => x === null))} onClick={() => void submit()} data-testid="prac-submit">{busy ? "Đang chấm…" : "Nộp câu này"}</button></div>}
            {res && (
              <div className={`result ${res.correct ? "ok" : res.partial ? "mid" : "no"}`} data-testid="prac-result">
                <b>{res.correct ? "Chính xác!" : res.partial ? "Đúng một phần" : "Chưa đúng"}</b> · {res.score}/{res.max} điểm{res.graded === "ai" ? " · chấm bởi AI" : ""}
                {res.feedback && <div>{res.feedback}</div>}
                {res.explanation && <div style={{ marginTop: 6 }}><b>Lời giải: </b><MathText value={res.explanation} /></div>}
                {q.type === "short_answer" && !res.correct && <div style={{ marginTop: 6 }}>Đáp án: <MathText value={String(res.answer)} /></div>}
                <div style={{ marginTop: 8, color: "var(--muted)" }}>Ôn lại {when(res.nextDueAt, res.intervalDays)}</div>
                {res.correct && !rated && (
                  <div className="chips" style={{ marginTop: 8 }}>
                    <span style={{ alignSelf: "center" }}>Em thấy câu này:</span>
                    <button className="chip" onClick={() => void rate("hard")}>Khó</button>
                    <button className="chip" onClick={() => void rate("good")}>Vừa</button>
                    <button className="chip" onClick={() => void rate("easy")}>Dễ</button>
                  </div>
                )}
                <div className="formrow" style={{ marginTop: 10, marginBottom: 0 }}>
                  <input className="inp" style={{ flex: 1 }} placeholder="Hỏi gia sư về câu này…" value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void followup(); }} />
                  <button className="btn ghost sm" onClick={() => void followup()}>Hỏi</button>
                </div>
                {reply && <div style={{ marginTop: 8 }}><Markdown text={reply} /></div>}
                <div style={{ marginTop: 10 }}><button className="btn" onClick={() => void nextQ()}>Câu tiếp theo</button></div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="card">
        <h2>Tiến độ 7 ngày</h2>
        {stats ? (
          <>
            <div className="bars" aria-label="Số câu mỗi ngày">
              {stats.daily.map((d) => { const max = Math.max(1, ...stats.daily.map((x) => x.answered)); return <div key={d.date} title={`${d.date}: ${d.correct}/${d.answered}`} style={{ height: `${Math.max(3, (100 * d.answered) / max)}%` }}><i style={{ height: d.answered ? `${(100 * d.correct) / d.answered}%` : 0 }} /></div>; })}
            </div>
            <div className="stat"><span>Đến hạn ôn hôm nay</span><b>{stats.due}</b></div>
            <div className="stat"><span>Đã học</span><b>{stats.learned}</b></div>
            <div className="stat"><span>Câu hay sai</span><b>{stats.mistakes}</b></div>
            <div className="stat"><span>Tỉ lệ đúng</span><b>{stats.accuracy === null ? "—" : `${stats.accuracy}%`}</b></div>
            {stats.topics.slice(0, 5).map((t) => <div key={t.topic} className="stat"><span>{t.topic}</span><span>{t.mistakes} sai · {t.due} cần ôn</span></div>)}
          </>
        ) : <div className="empty">…</div>}
      </div>
    </div>
  );
}
