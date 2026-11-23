import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { vn } from "../api";
import { ApiError } from "../apiCore";
import { useAuth } from "../auth";
import { MathText } from "../math/MathText";
import { Mascot } from "../portal/hoc/Mascot";
import { givenName, mascotLine, moodForScore } from "../portal/hoc/mascot";
import { studentSolutions } from "../solution/api";
import type { Solution } from "../solution/types";
import { Track } from "../ui/charts/Track";
import { Segmented } from "../ui/components/Chip";
import { Skeleton } from "../ui/components/Skeleton";
import { EmptyState, ErrorState } from "../ui/components/States";
import { Icon } from "../ui/Icon";
import { useQuery } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { ASG_KEY, band, ddmm, fetchAssignments, fetchResult, notRight, resultKey, scoredOf, sectionScores, spent, verdictOf, type Verdict } from "./data";
import { HOC_PATH } from "./paths";
import { loadSession } from "./session";
import type { ReviewItem } from "./types";
import { useHsSession } from "../portal/hoc/HocShell";
import "./hs.css";

// P13: lời giải từng bước có hình (chỉ khi GV cho hiện lời giải) — tải lười trình xem
const HsSolution = lazy(() => import("../solution/HsSolution").then((m) => ({ default: m.HsSolution })));

const LETTERS = "ABCD";
const LEVEL_VI = { full: "Đã hiện lời giải", marks: "Lời giải hiện sau hạn nộp", score: "Thầy cô chỉ cho xem điểm" } as const;
const V_ICON: Record<Verdict, string> = { ok: "check", part: "alert", bad: "x", wait: "clock", none: "info" };
const V_TEXT: Record<Verdict, string> = { ok: "Đúng", part: "Đúng một phần", bad: "Chưa đúng", wait: "Chờ chấm", none: "Chưa chấm" };
const TYPE_VI = { mcq: "Nhiều lựa chọn", true_false: "Đúng/Sai", short_answer: "Trả lời ngắn", essay: "Tự luận" } as const;
const plain = (s: string) => s.replace(/\$[^$]*\$/g, "…").replace(/\s+/g, " ").trim();
const short = (s: string, n = 56) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function Skel() {
  return (
    <div className="kq" aria-busy="true" aria-label="Đang tải kết quả">
      <div style={{ minWidth: 0 }}>
        <section className="page-head hero-field kq-hero" aria-hidden="true">
          <div className="score"><Skeleton w={200} h={12} className="on-field" /><Skeleton w={180} h={80} className="on-field" style={{ marginTop: 10 }} /></div>
          <div className="parts">{[0, 1, 2].map((i) => <Skeleton key={i} w="100%" h={14} className="on-field" style={{ gridColumn: "1 / -1" }} />)}</div>
        </section>
        <div className="seg-f"><Skeleton w={120} h={22} /></div>
        {[0, 1, 2, 3].map((i) => <div className="rq" key={i} style={{ padding: 16 }}><Skeleton w={`${[60, 45, 52, 38][i]}%`} h={16} /></div>)}
      </div>
      <aside className="rail">{[0, 1].map((i) => <section className="card" key={i}><Skeleton w={140} h={18} /><Skeleton w="90%" h={14} style={{ marginTop: 14 }} /></section>)}</aside>
    </div>
  );
}

/** Kết quả một bài (mockup hoc/ket-qua): điểm + theo phần, từng câu (lọc "Chưa đúng" trong URL ?loc=), so với các bài trước. */
function ResultPageInner() {
  const { sid = "" } = useParams();
  const { user } = useAuth();
  const q = useQuery(sid ? resultKey(sid) : null, fetchResult(sid));
  const asg = useQuery(ASG_KEY, fetchAssignments, { staleMs: 60_000 });
  const [loc, setLoc] = useUrlState<string>("loc", "tat-ca");
  const [open, setOpen] = useState<number | null>(null);
  const [sols, setSols] = useState<Record<string, Solution>>({});
  const r = q.data;
  usePageMeta(r ? `Kết quả · ${r.title}` : "Kết quả", r ? [{ label: "Kết quả", to: HOC_PATH.ketQua() }, { label: r.title }] : undefined);
  const full = r?.level === "full";
  useEffect(() => {
    const token = loadSession()?.token;
    if (full && token) studentSolutions(sid, token).then(setSols).catch(() => setSols({}));
  }, [sid, full]);
  useEffect(() => {
    // mở sẵn câu sai đầu tiên (như mockup)
    if (r && open === null) {
      const i = r.items.findIndex((it) => ["bad", "part"].includes(verdictOf(it)));
      if (i >= 0) setOpen(r.items[i]!.no);
    }
  }, [r]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!r && q.error) return <ErrorState title="Không tải được kết quả" status={q.error instanceof ApiError ? q.error.status : undefined} text={q.error instanceof ApiError && q.error.status === 404 ? "Không tìm thấy bài làm này." : undefined} onRetry={() => q.refetch()} />;
  if (!r) return <Skel />;

  const s10 = r.score10;
  const name = givenName(loadSession()?.student.fullName);
  const mood = r.pending > 0 && s10 === null ? "chao" : moodForScore(s10);
  const parts = sectionScores(r.items);
  const wrong = notRight(r.items);
  const shown = loc === "chua-dung" ? wrong : r.items;
  const self = asg.data?.find((a) => a.id === r.assignmentId);
  const past = asg.data ? scoredOf(asg.data, self?.subject ?? "").slice(-6) : [];
  const idx = past.findIndex((p) => p.lastSubmissionId === r.submissionId);
  const prev = idx > 0 ? past[idx - 1]!.score10 : null;
  const weakest = parts.filter((p) => p.max > 0 && p.pending === 0).sort((a, b) => a.got / a.max - b.got / b.max)[0];
  const when = r.submittedAt ? ddmm(r.submittedAt) : "";

  return (
    <div className={q.stale ? "kq is-stale" : "kq"}>
      <div style={{ minWidth: 0 }}>
        <section className="page-head hero-field kq-hero" aria-label="Điểm">
          <div className="score">
            <div className="eyebrow">{r.title}{when ? ` · ${when}` : ""}{r.status === "auto_submitted" ? " · tự nộp khi hết giờ" : ""}</div>
            <div className="v" data-testid="hs-score">{s10 === null ? "—" : vn(s10)}<small>/ 10</small></div>
            <div className="chips">
              {s10 !== null && <span className="chip-f">{band(s10)}</span>}
              {r.pending > 0 && <span className="chip-f">{r.pending} câu tự luận chờ thầy cô chấm</span>}
              <span className="chip-f">Lượt {r.attempt}/{r.attemptsAllowed}</span>
            </div>
          </div>
          {parts.length > 0 && r.level !== "score" ? (
            <div className="parts" aria-label="Điểm theo phần">
              <div className="h"><span>Theo phần</span><span>{r.correctCount}/{r.items.length} câu đúng hoàn toàn · {spent(r.startedAt, r.submittedAt)}</span></div>
              {parts.map((p) => (
                <div className="p" key={p.label}>
                  <span>{p.label}</span>
                  <div className="m" role="img" aria-label={`${vn(p.got)} trên ${vn(p.max)} điểm`}><i style={{ ["--v" as string]: `${p.max ? (100 * p.got) / p.max : 0}%` }} /></div>
                  <b>{p.pending ? `${vn(p.got)} + ${p.pending} chờ` : `${vn(p.got)} / ${vn(p.max)}`}</b>
                </div>
              ))}
            </div>
          ) : (
            <div className="parts"><div className="h"><span>Điểm bài</span><span>{spent(r.startedAt, r.submittedAt)}</span></div><b className="tot">{vn(r.score)} / {vn(r.maxScore)}</b></div>
          )}
        </section>

        {r.level === "score" || r.items.length === 0 ? (
          <section className="card" style={{ marginTop: "var(--s-6)" }}>
            <EmptyState icon="lock" title={LEVEL_VI.score} text="Bài này chỉ hiện điểm, không hiện từng câu." />
          </section>
        ) : (
          <>
            <div className="seg-f">
              <h2>Từng câu</h2>
              <span className="grow" />
              <Segmented label="Lọc câu" value={loc === "chua-dung" ? "chua-dung" : "tat-ca"} onChange={(v) => setLoc(v)} options={[{ value: "tat-ca", label: `Tất cả ${r.items.length}` }, { value: "chua-dung", label: `Chưa đúng ${wrong.length}` }]} />
            </div>
            {shown.length === 0 ? (
              <section className="card" style={{ marginTop: "var(--s-3)" }}>
                <EmptyState icon="ok" title="Em đúng hết!" text="Không còn câu nào cần xem lại." />
              </section>
            ) : (
              <div className="enter-list" key={loc}>
                {shown.map((it, i) => {
                  const v = verdictOf(it);
                  const n = r.items.indexOf(it) + 1;
                  const isOpen = open === it.no;
                  const sol = sols[String(it.no)];
                  return (
                    <details key={it.no} className={`rq ${v}`} open={isOpen} style={{ ["--i" as string]: Math.min(i, 8) }} data-testid="hs-rq">
                      <summary className="rh" onClick={(e) => { e.preventDefault(); setOpen(isOpen ? null : it.no); }}>
                        <span className="ico" aria-label={V_TEXT[v]}><Icon name={V_ICON[v]} /></span>
                        <span className="t"><b>Câu {n}</b> <span>· {TYPE_VI[it.type]} · {short(plain(it.stem))}</span></span>
                        <span className="pts">{it.points === null ? V_TEXT[v] : `${vn(it.points)} / ${vn(it.maxPoints)}`}</span>
                        <Icon name="chev" size="sm" className="chev" />
                      </summary>
                      {isOpen && (
                        <div className="body">
                          <div className="read"><MathText value={it.stem} /></div>
                          <Answer it={it} />
                          {sol ? (
                            <Suspense fallback={<Skeleton w="100%" h={120} style={{ borderRadius: 12 }} />}>
                              <HsSolution solution={sol} token={loadSession()?.token ?? null} />
                            </Suspense>
                          ) : (
                            it.explanation && <div className="why"><h3><Icon name="bulb" size="sm" />Lời giải</h3><div className="read"><MathText value={it.explanation} /></div></div>
                          )}
                          {user && v !== "ok" && (
                            <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
                              <Link className="btn sm" to="/hoc/gia-su"><Icon name="chat" size="sm" /><span>Hỏi gia sư câu này</span></Link>
                              <Link className="btn ghost sm" to="/hoc/luyen-tap"><Icon name="layers" size="sm" /><span>Luyện câu tương tự</span></Link>
                            </div>
                          )}
                        </div>
                      )}
                    </details>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <aside className="rail" aria-label="Bên cạnh">
        <section className="card kq-mam">
          <Mascot key={`${sid}:${mood}`} mood={mood} size={72} say={s10 === null ? "Thầy cô chấm xong là em thấy điểm nhé!" : mascotLine(mood, { name })} />
        </section>
        {weakest && weakest.got < weakest.max && (
          <section className="card">
            <div className="hd"><h2>Nên ôn tiếp</h2></div>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <Icon name="alert" size="sm" style={{ color: "var(--warn)", marginTop: 2 }} />
              <span className="grow">{weakest.label}<br /><span className="caption">{vn(weakest.got)}/{vn(weakest.max)} điểm · {wrong.length} câu chưa đúng</span></span>
            </div>
            {user ? (
              <Link className="btn primary block" style={{ marginTop: 14 }} to="/hoc/luyen-tap"><Icon name="layers" size="sm" /><span>Luyện câu tương tự</span></Link>
            ) : (
              wrong.length > 0 && <button type="button" className="btn block" style={{ marginTop: 14 }} onClick={() => setLoc("chua-dung")}><Icon name="eye" size="sm" /><span>Xem {wrong.length} câu chưa đúng</span></button>
            )}
          </section>
        )}
        {past.length > 1 && idx >= 0 && (
          <section className="card">
            <div className="hd"><h2>So với các bài trước</h2></div>
            <Track vals={past.map((p) => p.score10)} labels={past.map((p) => ddmm(p.dueAt))} threshold={5} height={34} showAxis />
            <p className="caption" style={{ marginTop: 8 }}>
              {past.length} bài {self?.subject ?? ""} gần nhất, thang 0–10, vạch 5,0. Bài này <b>{vn(s10 ?? 0)}</b>
              {prev !== null && s10 !== null && (
                <>
                  , <b className={s10 >= prev ? "up" : "dn"}>{s10 >= prev ? "+" : "−"}{vn(Math.abs(Math.round((s10 - prev) * 100) / 100))}</b> so với bài trước
                </>
              )}
              .
            </p>
          </section>
        )}
        <section className="card kq-acts">
          {r.canRetry ? (
            <Link className="btn primary block" to={HOC_PATH.lamBai(r.assignmentId)}><Icon name="repeat" size="sm" /><span>Làm lại · còn {r.attemptsAllowed - r.attemptsUsed} lượt</span></Link>
          ) : (
            <button type="button" className="btn block" disabled><Icon name="lock" size="sm" /><span>{r.attemptsUsed >= r.attemptsAllowed ? "Đã hết lượt làm" : "Đã qua hạn làm lại"}</span></button>
          )}
          <Link className="btn ghost block" to={HOC_PATH.baiTap}><Icon name="arrowl" size="sm" /><span>Về Bài tập</span></Link>
          <p className="caption"><Icon name="eye" size="sm" /> {LEVEL_VI[r.level]}</p>
        </section>
      </aside>
    </div>
  );
}

function Answer({ it }: { it: ReviewItem }) {
  if (it.type === "mcq") {
    const mine = typeof it.response === "number" ? it.response : null;
    const key = it.key ? LETTERS.indexOf(it.key) : -1;
    return (
      <div className="ans">
        <span className={it.correct === null ? "mine n" : it.correct ? "mine ok" : "mine"}>
          <Icon name={it.correct ? "ok" : it.correct === false ? "err" : "info"} size="sm" />
          Em: {mine === null ? "chưa trả lời" : <>{LETTERS[mine]}. <MathText value={it.options[mine] ?? ""} /></>}
        </span>
        {key >= 0 && key !== mine && <span className="key"><Icon name="ok" size="sm" />Đáp án: {LETTERS[key]}. <MathText value={it.options[key] ?? ""} /></span>}
      </div>
    );
  }
  if (it.type === "true_false") {
    const mine = Array.isArray(it.response) ? it.response : [null, null, null, null];
    return (
      <div className="tfres">
        {it.statements.map((s, k) => {
          const want = it.key ? it.key[k] === "Đ" : null;
          const ok = want === null || mine[k] === null ? null : mine[k] === want;
          return (
            <div key={k} className="r">
              <span className="l">{"abcd"[k]}</span>
              <span className="s"><MathText value={s} /></span>
              <span className={ok === null ? "v" : ok ? "v ok" : "v bad"}>
                {ok !== null && <Icon name={ok ? "check" : "x"} size="sm" />}
                Em chọn {mine[k] === null ? "—" : mine[k] ? "Đúng" : "Sai"}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  if (it.type === "short_answer") {
    const mine = typeof it.response === "string" && it.response.trim() ? it.response : null;
    return (
      <div className="ans">
        <span className={it.correct === null ? "mine n" : it.correct ? "mine ok" : "mine"}>Em: {mine ? <MathText value={`$${mine}$`} /> : "chưa trả lời"}</span>
        {it.key && !it.correct && <span className="key"><Icon name="ok" size="sm" />Đáp án: <MathText value={it.key.split("|")[0] ?? ""} /></span>}
      </div>
    );
  }
  return <div className="essayres read">{typeof it.response === "string" && it.response ? it.response : "Chưa trả lời"}</div>;
}


/** Cần phiên mã lớp (tài khoản vào lớp bằng mã tham gia cũng có phiên này); chưa có → Bài tập. */
export function ResultPage() {
  return useHsSession() ? <ResultPageInner /> : <Navigate to={HOC_PATH.baiTap} replace />;
}
