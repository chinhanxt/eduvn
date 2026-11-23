import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { vn } from "../api";
import { ApiError } from "../apiCore";
import { MathText } from "../math/MathText";
import { Mascot } from "../portal/hoc/Mascot";
import { Columns } from "../ui/charts/Columns";
import { Button } from "../ui/components/Button";
import { Skeleton } from "../ui/components/Skeleton";
import { EmptyState, ErrorState } from "../ui/components/States";
import { type StreamState, StreamingText } from "../ui/components/StreamingText";
import { useToast } from "../ui/components/Toast";
import { Icon } from "../ui/Icon";
import { request } from "../ui/data/http";
import { invalidate, useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import type { Kb } from "./client";
import { Markdown } from "./Markdown";
import { againIn, canSubmit, clockText, levelOf, type Mark, markOf, type Next, optState, type Result, sessionDots, type Stats } from "./practice";
import "./luyen.css";

const LETTER = "ABCD";
const STATS_KEY = "hoc/luyen-tap/stats";
const msg = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof TypeError ? "Mất mạng — em thử lại nhé" : "Có lỗi, em thử lại nhé");
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function QSkeleton({ label = "Đang lấy thẻ tiếp" }: { label?: string }) {
  return (
    <section className="card qcard" aria-busy="true" aria-label={label}>
      <div className="qhead"><Skeleton w={150} h={26} style={{ borderRadius: 999 }} /><Skeleton w={90} h={16} /></div>
      <Skeleton w="88%" h={26} style={{ marginTop: 24 }} />
      <Skeleton w="60%" h={26} style={{ marginTop: 10 }} />
      <div className="opts">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={72} style={{ borderRadius: 16 }} />)}</div>
    </section>
  );
}

/** Luyện tập (mockup hoc/luyen-tap): thẻ ôn đến hạn + câu mới, chấm ngay, lời giải, hỏi gia sư; môn/lớp/chủ đề trong URL. */
export function Practice() {
  usePageMeta("Luyện tập", [{ label: "Luyện tập" }, { label: "Ôn hôm nay" }]);
  const toast = useToast();
  const kbs = useQuery("hoc/luyen-tap/kbs", (signal) => request<Kb[]>("/api/tutor/kbs", { signal }), { staleMs: 5 * 60_000 });
  const stats = useQuery(STATS_KEY, (signal) => request<Stats>("/api/tutor/practice/stats?days=7", { signal }));
  const [monU, setMon] = useUrlState<string>("mon", "");
  const [lopU, setLop] = useUrlState<number>("lop", 0);
  const [topic, setTopic] = useUrlState<string>("chu-de", "");
  const first = kbs.data?.[0];
  const subject = monU || first?.subject || "Toán";
  const grade = lopU || first?.grade || 10;
  const [cur, setCur] = useState<Next | null>(null);
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState<Next["question"][]>([]);
  const [resp, setResp] = useState<unknown>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [rated, setRated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gen, setGen] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [t0] = useState(() => Date.now());
  const [secs, setSecs] = useState(0);
  const [ask, setAsk] = useState("");
  const [ai, setAi] = useState<{ text: string; state: StreamState } | null>(null);
  const [setup, setSetup] = useState(false);
  const aiCtl = useRef<AbortController | null>(null);
  const askRef = useRef<HTMLInputElement>(null);
  const q = cur?.question ?? null;
  const locked = res !== null;

  useEffect(() => {
    const iv = window.setInterval(() => setSecs(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => window.clearInterval(iv);
  }, [t0]);

  const reset = () => {
    setResp(null);
    setRes(null);
    setRated(false);
    setAsk("");
    aiCtl.current?.abort();
    setAi(null);
  };
  const nextQ = useCallback(async () => {
    reset();
    setError(null);
    if (extra.length) {
      const [head, ...rest] = extra;
      setExtra(rest);
      setCur({ mode: "new", question: head ?? null, counts: cur?.counts ?? { due: 0, new: 0 } });
      return;
    }
    setLoading(true);
    try {
      setCur(await request<Next>(`/api/tutor/practice/next?subject=${encodeURIComponent(subject)}&grade=${grade}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`));
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, [extra, cur, subject, grade, topic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đổi môn/lớp/chủ đề (hoặc vào trang) → lấy thẻ đầu tiên
  const sig = `${subject}|${grade}|${topic}`;
  const started = useRef("");
  useEffect(() => {
    if (kbs.loading || started.current === sig) return;
    started.current = sig;
    setExtra([]);
    void nextQ();
  }, [sig, kbs.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!q || locked || !canSubmit(q, resp)) return;
    try {
      const r = await request<Result>("/api/tutor/practice/answer", { method: "POST", body: { questionId: q.id, response: Array.isArray(resp) ? resp.map((x) => x === true) : resp } });
      setRes(r);
      setMarks((m) => [...m, markOf(r)]);
      invalidate(STATS_KEY);
      invalidate("hoc/hom-nay");
    } catch (e) {
      toast({ kind: "err", title: "Chưa chấm được", msg: msg(e), action: { label: "Thử lại", run: submit } });
    }
  };
  const rate = async (rating: "hard" | "good" | "easy") => {
    if (!q) return;
    try {
      const r = await request<{ nextDueAt: string; intervalDays: number }>("/api/tutor/practice/rate", { method: "POST", body: { questionId: q.id, rating } });
      setRated(true);
      setRes((x) => (x ? { ...x, nextDueAt: r.nextDueAt, intervalDays: r.intervalDays } : x));
      toast({ title: "Đã ghi nhận", msg: `Thẻ quay lại ${againIn(r.intervalDays)}` });
    } catch (e) {
      toast({ kind: "err", title: "Chưa lưu được", msg: msg(e) });
    }
  };
  const generate = async () => {
    if (!topic.trim()) {
      setSetup(true);
      toast({ kind: "info", title: "Chọn chủ đề trước", msg: "AI cần biết em muốn luyện chủ đề nào" });
      return;
    }
    setGen(true);
    setError(null);
    try {
      const kbId = kbs.data?.find((k) => k.subject === subject && k.grade === grade)?.id;
      const g = await request<{ questions: NonNullable<Next["question"]>[] }>("/api/tutor/questions/generate", { method: "POST", body: { subject, grade, topic, count: 3, mode: "practice", kbId } });
      const [head, ...rest] = g.questions;
      reset();
      setExtra(rest);
      setCur({ mode: "new", question: head ?? null, counts: { due: 0, new: g.questions.length } });
      toast({ title: `AI đã soạn ${g.questions.length} câu`, msg: topic });
    } catch (e) {
      setError(msg(e));
    } finally {
      setGen(false);
    }
  };
  const followup = async () => {
    if (!q || !ask.trim() || ai?.state === "streaming") return;
    aiCtl.current?.abort();
    const ctl = new AbortController();
    aiCtl.current = ctl;
    setAi({ text: "", state: "streaming" });
    try {
      const r = await request<{ reply: string }>("/api/tutor/questions/followup", { method: "POST", body: { questionId: q.id, message: ask, userAnswer: resp }, signal: ctl.signal });
      setAi({ text: r.reply, state: "streaming" });
      // trả lời về một lần: hiện dần như đang viết (~90 ký tự/giây) rồi chốt
      window.setTimeout(() => !ctl.signal.aborted && setAi((x) => (x && x.text === r.reply ? { ...x, state: "done" } : x)), Math.min(6000, (r.reply.length / 90) * 1000 + 300));
    } catch (e) {
      if (!ctl.signal.aborted) setAi({ text: msg(e), state: "error" });
    }
  };

  // Phím: 1–4 chọn, Enter kiểm tra / thẻ tiếp, H hỏi gia sư
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || typing(e.target) || !q) return;
      if (!locked && q.type === "mcq" && /^[1-4]$/.test(e.key) && Number(e.key) <= (q.options?.length ?? 0)) setResp(Number(e.key) - 1);
      else if (e.key === "Enter") void (locked ? nextQ() : submit());
      else if (locked && (e.key === "h" || e.key === "H")) askRef.current?.focus();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const due = cur?.counts.due ?? stats.data?.due ?? 0;
  const dots = sessionDots(marks, due, !!q && !locked);
  const ok = marks.filter((m) => m === "ok").length;
  const bad = marks.length - ok;
  const s = stats.data;
  const lv = q ? levelOf(q.level) : null;
  const key = res?.answer;
  const lastMark = marks[marks.length - 1];

  return (
    <div className="luyen">
      <div style={{ minWidth: 0 }}>
        <div className="prog">
          <Link className="btn ghost sm" to="/hoc"><Icon name="left" size="sm" /><span>Thoát</span></Link>
          <div className="dots" role="img" aria-label={`Đã làm ${marks.length} thẻ, ${ok} đúng`}>{dots.map((d, i) => <i key={i} className={d || undefined} />)}</div>
          <b className="num">{marks.length}{due ? `/${marks.length + due}` : ""}</b>
        </div>
        <div className="scope">
          <span className="chipc"><Icon name="book" size="sm" />{subject} · {grade <= 12 ? `lớp ${grade}` : `ĐH năm ${grade - 12}`}{topic ? ` · ${topic}` : ""}</span>
          <Button variant="ghost" size="sm" icon="sliders" pressed={setup} onClick={() => setSetup(!setup)} aria-expanded={setup}>Đổi chủ đề</Button>
          <span className="grow" />
          <Button variant="ghost" size="sm" icon="spark" busy={gen} onClick={generate}>AI ra thêm 3 câu</Button>
        </div>
        {setup && (
          <form className="card setup" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setMon(String(f.get("mon") ?? "")); setLop(Number(f.get("lop") ?? 0)); setTopic(String(f.get("chu-de") ?? "").trim()); setSetup(false); }}>
            <label className="field"><span className="lbl">Môn</span><input className="input" name="mon" defaultValue={subject} list="luyen-mon" /></label>
            <datalist id="luyen-mon">{[...new Set((kbs.data ?? []).map((k) => k.subject))].map((m) => <option key={m} value={m} />)}</datalist>
            <label className="field"><span className="lbl">Lớp</span>
              <select className="select" name="lop" defaultValue={grade}>{Array.from({ length: 16 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g <= 12 ? `Lớp ${g}` : `ĐH năm ${g - 12}`}</option>)}</select>
            </label>
            <label className="field grow"><span className="lbl">Chủ đề (không bắt buộc)</span><input className="input" name="chu-de" defaultValue={topic} placeholder="vd Dấu tam thức bậc hai" /></label>
            <div className="acts"><Button type="submit" variant="primary">Áp dụng</Button></div>
          </form>
        )}

        {gen ? (
          <QSkeleton label="AI đang soạn câu" />
        ) : error && !q ? (
          <section className="card"><ErrorState title="Chưa lấy được thẻ" text={error} onRetry={nextQ} /></section>
        ) : loading && !q ? (
          <QSkeleton />
        ) : !q || cur?.mode === "done" ? (
          <section className="card qcard">
            <EmptyState
              icon="check"
              title={marks.length ? "Hôm nay ôn xong rồi!" : "Chưa có thẻ nào đến hạn"}
              text={marks.length ? `${ok}/${marks.length} thẻ đúng · thẻ tiếp theo đến hạn sau.` : `Chưa có câu ${subject} lớp ${grade}${topic ? ` chủ đề ${topic}` : ""}. Nhờ AI ra câu mới nhé.`}
              action={<Button variant="primary" icon="spark" busy={gen} onClick={generate}>Luyện thêm 3 câu</Button>}
            />
            {marks.length > 0 && <div className="done-mam"><Mascot mood="khen" size={72} say="Ôn đều mỗi ngày là nhớ lâu!" /></div>}
          </section>
        ) : (
          <section className={loading ? "card qcard is-stale" : "card qcard"} aria-label="Thẻ đang ôn" key={q.id} data-testid="prac-q">
            <div className="qhead">
              <span className="chipc acc">{q.topic}</span>
              {lv && <span className={`lvl l${lv[1]}`}>{lv[0]}</span>}
              <span className="caption">· {cur?.mode === "review" ? "ôn lại" : "câu mới"}</span>
            </div>
            <div className="stem"><MathText value={q.stem} /></div>
            {q.type === "mcq" && (
              <div className="opts" role="radiogroup" aria-label="Phương án">
                {q.options?.map((o, i) => {
                  const st = optState(i, resp, key, locked);
                  return (
                    <button type="button" key={i} role="radio" aria-checked={resp === i} disabled={locked} className={`opt ${st}`} onClick={() => setResp(i)} data-testid="prac-opt">
                      <span className="k">{LETTER[i]}</span>
                      <span className="tx"><MathText value={o} /></span>
                      {st === "right" && <span className="st"><Icon name="ok" size="sm" />Đáp án</span>}
                      {st === "wrong" && <span className="st"><Icon name="err" size="sm" />Em chọn</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {q.type === "true_false" && (
              <div className="ds">
                {q.statements?.map((st, i) => {
                  const v = (Array.isArray(resp) ? resp : (q.statements ?? []).map(() => null)) as (boolean | null)[];
                  const k = Array.isArray(key) ? (key as boolean[]) : null;
                  const set = (b: boolean) => setResp(v.map((x, j) => (j === i ? b : x)));
                  return (
                    <div className={k ? (v[i] === k[i] ? "r ok" : "r bad") : "r"} key={i}>
                      <span className="l">{"abcd"[i]}</span>
                      <span className="tx"><MathText value={st} /></span>
                      <span className="tf" role="group" aria-label={`Ý ${"abcd"[i]}`}>
                        <button type="button" disabled={locked} aria-pressed={v[i] === true} onClick={() => set(true)}>Đúng</button>
                        <button type="button" disabled={locked} aria-pressed={v[i] === false} onClick={() => set(false)}>Sai</button>
                      </span>
                      {k && <span className="kv">{k[i] ? "Đúng" : "Sai"}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {q.type === "short_answer" && <input className="input big-in" disabled={locked} placeholder="Đáp án của em" value={typeof resp === "string" ? resp : ""} onChange={(e) => setResp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submit()} aria-label="Đáp án" />}
            {q.type === "essay" && <textarea className="textarea essay" disabled={locked} placeholder={`Bài làm của em (tối đa ${q.points ?? 1} điểm)`} value={typeof resp === "string" ? resp : ""} onChange={(e) => setResp(e.target.value)} aria-label="Bài làm" />}

            {!res ? (
              <div className="after">
                <span className="caption grow">{q.type === "mcq" ? <>Chọn rồi bấm <kbd>Enter</kbd></> : "Làm xong bấm Kiểm tra"}</span>
                <Button size="lg" variant="primary" disabled={!canSubmit(q, resp)} onClick={submit} data-testid="prac-submit">Kiểm tra</Button>
              </div>
            ) : (
              <>
                <div className={`why ${markOf(res)}`} data-testid="prac-result">
                  <h3>
                    <Icon name={res.correct ? "ok" : res.partial ? "alert" : "bulb"} size="sm" />
                    {res.correct ? "Chính xác!" : res.partial ? "Đúng một phần" : q.type === "mcq" && typeof key === "number" ? `Vì sao là ${LETTER[key]}` : "Chưa đúng"}
                    <span className="grow" />
                    <span className="sc">{vn(res.score)}/{vn(res.max)} điểm{res.graded === "ai" ? " · AI chấm" : ""}</span>
                  </h3>
                  {res.feedback && <p>{res.feedback}</p>}
                  {res.explanation && <div className="read"><MathText value={res.explanation} /></div>}
                  {q.type === "short_answer" && !res.correct && <p>Đáp án: <MathText value={String(res.answer)} /></p>}
                </div>
                {res.correct && !rated && (
                  <div className="rate" role="group" aria-label="Em thấy câu này">
                    <span className="caption">Em thấy câu này:</span>
                    <Button size="sm" onClick={() => rate("hard")}>Khó</Button>
                    <Button size="sm" onClick={() => rate("good")}>Vừa</Button>
                    <Button size="sm" onClick={() => rate("easy")}>Dễ</Button>
                  </div>
                )}
                <form className="askrow" onSubmit={(e) => { e.preventDefault(); void followup(); }}>
                  <Icon name="bot" size="sm" />
                  <input ref={askRef} className="input" placeholder="Hỏi gia sư về câu này…" value={ask} onChange={(e) => setAsk(e.target.value)} aria-label="Hỏi gia sư về câu này" />
                  <Button type="submit" variant="ghost" disabled={!ask.trim()} busy={ai?.state === "streaming" && !ai.text}>Hỏi</Button>
                </form>
                {ai && (
                  <div className="ai-reply">
                    <StreamingText text={ai.text} state={ai.state} onStop={() => { aiCtl.current?.abort(); setAi((x) => (x ? { ...x, state: "stopped" } : x)); }} render={(t) => <Markdown text={t} />} />
                  </div>
                )}
                <div className="after">
                  <span className="caption grow"><Icon name="refresh" size="sm" /> Thẻ này quay lại {againIn(res.intervalDays)}</span>
                  <Link className="btn lg" to="/hoc/gia-su"><Icon name="chat" size="sm" /><span>Gia sư</span></Link>
                  <Button size="lg" variant="primary" onClick={nextQ} busy={loading} kbd="Enter">Thẻ tiếp</Button>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <aside className="rail" aria-label="Tiến độ">
        <section className="card">
          <div className="hd"><h2>Phiên này</h2><span className="grow" />{lastMark && <Mascot key={marks.length} mood={lastMark === "ok" ? "khen" : "dong-vien"} size={40} />}</div>
          <div className="score">
            <div><b style={{ color: "var(--ok)" }}>{ok}</b><span>đúng</span></div>
            <div><b style={{ color: "var(--danger)" }}>{bad}</b><span>chưa đúng</span></div>
            <div><b>{clockText(secs)}</b><span>thời gian</span></div>
          </div>
          <p className="caption" style={{ marginTop: 12, textAlign: "center" }}>{due ? `Còn ${due} thẻ đến hạn` : "Không còn thẻ đến hạn"}</p>
        </section>
        <section className="card">
          <div className="hd"><h2>7 ngày qua</h2><span className="grow" /><span className="caption">{s?.accuracy == null ? "" : `đúng ${s.accuracy}%`}</span></div>
          {s ? (
            <>
              <Columns vals={s.daily.map((d) => d.answered)} labels={s.daily.map((d) => ddmm(d.date))} height={120} unit="câu" />
              <div className="mini-stats">
                <span><b>{s.due}</b>đến hạn</span>
                <span><b>{s.learned}</b>đã học</span>
                <span><b>{s.mistakes}</b>hay sai</span>
              </div>
            </>
          ) : stats.error ? (
            <ErrorState title="Không tải được tiến độ" onRetry={() => stats.refetch()} />
          ) : (
            <Skeleton w="100%" h={150} style={{ borderRadius: 12 }} />
          )}
        </section>
        {s && s.topics.length > 0 && (
          <section className="card">
            <div className="hd"><h2>Chủ đề hay sai</h2></div>
            <ul className="topics">
              {s.topics.slice(0, 5).map((t) => (
                <li key={t.topic}>
                  <button type="button" onClick={() => setTopic(t.topic)} aria-pressed={topic === t.topic}>
                    <span className="t">{t.topic}<small>{t.mistakes} sai · {t.due} cần ôn</small></span>
                    <Icon name="right" size="sm" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="caption kbd-hint">Phím tắt: <kbd>1</kbd>–<kbd>4</kbd> chọn · <kbd>Enter</kbd> kiểm tra / tiếp · <kbd>H</kbd> hỏi gia sư</p>
      </aside>
    </div>
  );
}
