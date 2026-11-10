import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { vn } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { errMsg, hsJson, loadSession } from "./studentApi";
import type { ReviewItem, StudentResult } from "./types";

const LETTERS = "ABCD";
const LEVEL_VI = { full: "Lời giải: đã hiện", marks: "Lời giải: hiện sau hạn nộp", score: "Chỉ hiện điểm" } as const;

function duration(a: string, b: string | null): string {
  if (!b) return "—";
  const s = Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m} phút ${s % 60} giây` : `${s} giây`;
}

function verdict(i: ReviewItem): [string, string, string, string] | null {
  if (i.correct === null) return i.type === "essay" && i.points === null ? ["violet", "clock", "c-violet", "Chờ chấm"] : null;
  if (i.correct) return ["green", "check", "c-green", "Đúng"];
  if ((i.points ?? 0) > 0) return ["amber", "alert", "c-amber", "Đúng một phần"];
  return ["red", "x", "c-red", "Sai"];
}

/** Kết quả của HS: điểm thang 10, từng câu đúng/sai, đáp án + lời giải theo cài đặt của GV. */
export function ResultPage() {
  const { sid = "" } = useParams();
  const [r, setR] = useState<StudentResult | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    hsJson<StudentResult>(`/api/student/submissions/${sid}`).then(setR).catch((e: unknown) => setErr(errMsg(e)));
  }, [sid]);
  if (err) return <main className="hs-main"><div className="hs-err">{err}</div></main>;
  if (!r) return <main className="hs-main hs-muted">…</main>;
  const name = loadSession()?.student.fullName.trim().split(/\s+/).pop() ?? "";
  const s10 = r.score10 ?? 0;
  const hello = s10 >= 8 ? `Làm tốt lắm, ${name}!` : s10 >= 5 ? `Em đã hoàn thành bài, ${name}!` : `Cố gắng thêm nhé, ${name}!`;
  return (
    <main className="hs-main hs-narrow">
      <div className="hs-card hs-res">
        <div className="ring">
          <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#eceef4" strokeWidth="9" /><circle cx="50" cy="50" r="44" fill="none" stroke={s10 >= 5 ? "#16a34a" : "#d63a3a"} strokeWidth="9" strokeLinecap="round" strokeDasharray="276.5" strokeDashoffset={276.5 * (1 - s10 / 10)} /></svg>
          <div className="v"><b data-testid="hs-score">{r.score10 === null ? "—" : vn(r.score10)}</b><small>trên 10</small></div>
        </div>
        <div className="info">
          <div><h1>{hello}</h1><div className="hs-muted">{r.title}{r.status === "auto_submitted" ? " · tự nộp khi hết giờ" : ""}</div></div>
          <div className="stats">
            {r.level !== "score" && <div className="stat"><b>{r.correctCount} / {r.items.length}</b><small>Câu đúng hoàn toàn</small></div>}
            <div className="stat"><b>{duration(r.startedAt, r.submittedAt)}</b><small>Thời gian làm</small></div>
            <div className="stat"><b>{vn(r.score)} / {vn(r.maxScore)}</b><small>Điểm bài</small></div>
          </div>
          <div className="chips">
            <span className="hs-chip c-green"><Icon name="eye" />{LEVEL_VI[r.level]}</span>
            <span className="hs-chip"><Icon name="repeat" />Lượt {r.attempt} / {r.attemptsAllowed}</span>
            {r.pending > 0 && <span className="hs-chip c-violet">Còn {r.pending} câu tự luận chờ thầy cô chấm</span>}
          </div>
        </div>
      </div>
      {r.items.map((it, i) => {
        const v = verdict(it);
        return (
          <div key={it.no} className={`hs-card hs-rq${open === i ? " open" : ""}`} data-testid="hs-rq">
            <div className="rh" role="button" tabIndex={0} onClick={() => setOpen(open === i ? null : i)} onKeyDown={(e) => e.key === "Enter" && setOpen(open === i ? null : i)}>
              <span className={`rn ${v?.[0] ?? ""}`}>{v ? <Icon name={v[1]} /> : i + 1}</span>
              <div className="g"><b>Câu {i + 1}</b>{v && <span className={`hs-chip ${v[2]}`}>{v[3]}</span>}</div>
              {it.points !== null && <span className="pts">{vn(it.points)} / {vn(it.maxPoints)}</span>}
              <span className="chev"><Icon name="chev" /></span>
            </div>
            {open === i && (
              <div className="rb">
                <div className="qt"><MathText value={it.stem} /></div>
                <Answer it={it} />
                {it.explanation && <div className="hs-sol"><div className="st"><Icon name="spark" />Lời giải</div><MathText value={it.explanation} /></div>}
              </div>
            )}
          </div>
        );
      })}
      <div className="hs-actions">
        <Link className="hs-btn" to="/hs"><Icon name="arrowl" />Về bài của em</Link>
        {r.canRetry ? <Link className="hs-btn primary" to={`/hs/bai/${r.assignmentId}`}><Icon name="repeat" />Làm lại</Link> : <button className="hs-btn" disabled><Icon name="repeat" />Làm lại (hết lượt)</button>}
      </div>
    </main>
  );
}

function Answer({ it }: { it: ReviewItem }) {
  if (it.type === "mcq") {
    const mine = typeof it.response === "number" ? it.response : null;
    const key = it.key ? LETTERS.indexOf(it.key) : -1;
    return (
      <div className="hs-ansrow">
        <div className={`a ${it.correct === null ? "" : it.correct ? "ok" : "bad"}`}><small>Em chọn</small>{mine === null ? "Chưa trả lời" : <>{LETTERS[mine]}. <MathText value={it.options[mine] ?? ""} /></>}</div>
        {key >= 0 && key !== mine && <div className="a ok"><small>Đáp án đúng</small>{LETTERS[key]}. <MathText value={it.options[key] ?? ""} /></div>}
      </div>
    );
  }
  if (it.type === "true_false") {
    const mine = Array.isArray(it.response) ? it.response : [null, null, null, null];
    return (
      <div className="hs-tfres">
        {it.statements.map((s, k) => {
          const want = it.key ? it.key[k] === "Đ" : null;
          const ok = want === null || mine[k] === null ? null : mine[k] === want;
          return (
            <div key={k} className="r">
              <span className="l">{"abcd"[k]}</span>
              <span className="s"><MathText value={s} /></span>
              <span className={`hs-chip ${ok === null ? "" : ok ? "c-green" : "c-red"}`}>{ok !== null && <Icon name={ok ? "check" : "x"} />}Em chọn {mine[k] === null ? "—" : mine[k] ? "Đúng" : "Sai"}</span>
            </div>
          );
        })}
      </div>
    );
  }
  if (it.type === "short_answer") {
    const mine = typeof it.response === "string" && it.response.trim() ? it.response : null;
    return (
      <div className="hs-ansrow">
        <div className={`a ${it.correct === null ? "" : it.correct ? "ok" : "bad"}`}><small>Em nhập</small>{mine ? <MathText value={`$${mine}$`} /> : "Chưa trả lời"}</div>
        {it.key && <div className="a"><small>Đáp án</small><MathText value={it.key.split("|")[0] ?? ""} /></div>}
      </div>
    );
  }
  return <div className="hs-essayres">{typeof it.response === "string" && it.response ? it.response : "Chưa trả lời"}</div>;
}
