import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Icon } from "../Icon";
import { isAnswered, isPartial, unanswered } from "./answers";
import { ServerClock, formatClock, timerTone } from "./clock";
import { pickStore } from "./draftStore";
import { EventOutbox, LeaveTracker, watchLeave } from "./leave";
import { QuestionCard } from "./QuestionCard";
import { StudentApiError, errMsg, hsFetch, hsJson, retryAfterMs } from "./studentApi";
import { AnswerSync, type Sender, type SyncStatus } from "./syncQueue";
import type { AnswerValue, Answers, RoomPayload, SaveResult, StudentResult } from "./types";

const SAVE_TEXT: Record<SyncStatus, [string, string]> = {
  saved: ["checkc", "Đã lưu"],
  saving: ["loader", "Đang lưu…"],
  offline: ["wifioff", "Mất mạng – vẫn lưu trên máy"],
  closed: ["checkc", "Đã nộp"],
};

/** Phòng làm bài: lưu máy (Dexie) mỗi thay đổi + gửi máy chủ mỗi 3 giây; đồng hồ theo giờ máy chủ; bắt rời tab. */
export function ExamRoom() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const clock = useRef(new ServerClock());
  const outbox = useRef(new EventOutbox());
  const submitted = useRef(false);
  const autoTried = useRef(0);
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [sync, setSync] = useState<AnswerSync | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [flags, setFlags] = useState<number[]>([]);
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [deadline, setDeadline] = useState("");
  const [left, setLeft] = useState(Number.POSITIVE_INFINITY);
  const [cur, setCur] = useState(0);
  const [ask, setAsk] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 1) Vào phòng: bắt đầu/tiếp tục lượt, nạp bản nháp mới nhất (máy hoặc máy chủ)
  useEffect(() => {
    let alive = true;
    (async () => {
      const sentAt = Date.now();
      const r = await hsJson<RoomPayload>(`/api/student/assignments/${id}/start`, { method: "POST", body: {} });
      clock.current.sample(r.serverNow, sentAt, Date.now());
      const sid = r.submission.id;
      const send: Sender = async (seq, ans, o) => {
        const t0 = Date.now();
        try {
          const res = await hsFetch(`/api/student/submissions/${sid}/answers`, { method: "PUT", body: { seq, answers: ans }, keepalive: o.keepalive, retries: 0 });
          if (res.ok) {
            const b = (await res.json()) as SaveResult;
            clock.current.sample(b.serverNow, t0, Date.now());
            setDeadline(b.deadlineAt);
            return { kind: "ok", seq: b.seq };
          }
          if (res.status === 409) return { kind: "closed", status: ((await res.json()) as { status?: string }).status ?? "submitted" };
          if (res.status === 401) return { kind: "closed", status: "unauthorized" };
          return { kind: "retry", afterMs: retryAfterMs(res.headers.get("retry-after"), 1) };
        } catch {
          return { kind: "offline" };
        }
      };
      const s = await AnswerSync.open(await pickStore(), sid, { seq: r.submission.seq, answers: r.submission.answers }, send, (st, d) => {
        setStatus(st);
        setAnswers(d.answers);
        setFlags(d.flags);
      });
      if (!alive) return;
      setRoom(r);
      setSync(s);
      setAnswers(s.answers);
      setFlags(s.flags);
      setStatus(s.status);
      setDeadline(r.submission.deadlineAt);
    })().catch((e: unknown) => setErr(e instanceof StudentApiError && e.status === 409 ? e.message : errMsg(e)));
    return () => {
      alive = false;
    };
  }, [id]);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (!sync || !room || submitted.current) return;
      submitted.current = true;
      setBusy(true);
      setAsk(false);
      try {
        const body = await sync.forSubmit();
        await hsJson<StudentResult>(`/api/student/submissions/${room.submission.id}/submit`, { method: "POST", body });
        sync.markClosed();
        if (auto) setTimeUp(true);
        else nav(`/hs/ket-qua/${room.submission.id}`, { replace: true });
      } catch (e) {
        submitted.current = false;
        setErr(`${errMsg(e)}. Bài vẫn lưu trên máy, em bấm Nộp lại nhé.`);
      } finally {
        setBusy(false);
      }
    },
    [sync, room, nav],
  );

  // 2) Gửi mỗi 3 giây, khi rời trang, khi có mạng lại; ghi rời tab
  useEffect(() => {
    if (!sync || !room) return;
    const sid = room.submission.id;
    const sendEvents = (keepalive: boolean) => async (events: { kind: "leave" | "return" }[]) =>
      (await hsFetch(`/api/student/submissions/${sid}/events`, { method: "POST", body: { events }, keepalive, retries: 0 })).ok;
    const iv = window.setInterval(() => {
      void sync.flush();
      void outbox.current.flush(sendEvents(false));
    }, 3000);
    const stop = watchLeave(
      new LeaveTracker((k) => {
        outbox.current.push(k);
        if (k === "leave") void sync.flush(true);
      }),
    );
    const onHide = () => {
      void sync.flush(true);
      void outbox.current.flush(sendEvents(true));
    };
    const onOnline = () => void sync.flush();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(iv);
      stop();
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
    };
  }, [sync, room]);

  // 3) Đồng hồ theo giờ máy chủ; hết giờ thì tự nộp (thử lại mỗi 5 giây nếu mất mạng)
  useEffect(() => {
    if (!deadline) return;
    const iv = window.setInterval(() => {
      const ms = clock.current.remainingMs(deadline);
      setLeft(ms);
      if (ms === 0 && !submitted.current && Date.now() - autoTried.current > 5000) {
        autoTried.current = Date.now();
        void doSubmit(true);
      }
    }, 250);
    return () => window.clearInterval(iv);
  }, [deadline, doSubmit]);

  // Máy chủ báo bài đã chốt (hết giờ + ân hạn) khi đang lưu
  useEffect(() => {
    if (status === "closed" && !submitted.current) setTimeUp(true);
  }, [status]);

  if (err && !room) return <div className="hs-main"><div className="hs-err">{err}</div><a className="hs-btn" href="/hs">Về bài của em</a></div>;
  if (!room) return <div className="hs-main hs-muted">Đang mở bài…</div>;

  const qs = room.questions;
  const nos = qs.map((q) => q.no);
  const answer = (no: number, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [String(no)]: v }));
    void sync?.set(no, v);
  };
  const go = (i: number) => {
    setCur(i);
    if (window.innerWidth > 720) document.getElementById(`hs-q-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const missing = unanswered(answers, nos);
  const done = nos.length - missing.length;
  const [ic, text] = SAVE_TEXT[status];
  const tone = timerTone(left);

  return (
    <>
      <div className="hs-extop">
        <div className="hs-in">
          <span className="ic blue"><Icon name="exam" /></span>
          <div className="ttl"><b>{room.assignment.title}</b><small data-testid="hs-variant">{room.assignment.subject} · mã đề {room.submission.variantCode}</small></div>
          <span className={`hs-save ${status}`} data-testid="hs-save"><Icon name={ic} /><span className="tx2">{text}</span></span>
          {Number.isFinite(left) && <span className={`hs-timer ${tone}`} title="Giờ theo máy chủ" data-testid="hs-timer"><Icon name="timer" />{formatClock(left)}</span>}
          <button className="hs-btn primary top-submit" onClick={() => setAsk(true)} disabled={busy} data-testid="hs-submit-top"><Icon name="send" />Nộp</button>
        </div>
      </div>
      {err && <div className="hs-main"><div className="hs-err">{err}</div></div>}
      <div className="hs-exbody">
        <div className="hs-qs">
          {qs.map((q, i) => (
            <QuestionCard key={q.no} q={q} index={i} value={answers[String(q.no)]} flagged={flags.includes(q.no)} current={i === cur} onAnswer={(v) => answer(q.no, v)} onFlag={() => void sync?.toggleFlag(q.no)} onFocus={() => setCur(i)} />
          ))}
        </div>
        <div className="hs-side">
          <div className="hs-card">
            <h2>Câu hỏi</h2>
            <div className="hs-pal">
              {qs.map((q, i) => {
                const v = answers[String(q.no)];
                const cls = [isAnswered(v) ? "ans" : isPartial(v) ? "part" : "", flags.includes(q.no) ? "flag" : "", i === cur ? "cur" : ""].join(" ");
                return (
                  <button key={q.no} className={cls} onClick={() => go(i)} aria-label={`Câu ${i + 1}`} data-testid={`hs-pal-${i}`}>
                    {i + 1}<span className="fl"><Icon name="flag" /></span>
                  </button>
                );
              })}
            </div>
            <div className="hs-legend"><span><i className="a" />Đã làm</span><span><i className="p" />Làm dở</span><span><i className="f" />Đánh dấu xem lại</span></div>
          </div>
          <div className="hs-card">
            <div className="sumline"><span className="hs-muted">Đã làm</span><span data-testid="hs-done">{done} / {nos.length}</span></div>
            <button className="hs-btn primary lg block" onClick={() => setAsk(true)} disabled={busy} data-testid="hs-submit"><Icon name="send" />Nộp bài</button>
          </div>
        </div>
      </div>
      <div className="hs-bottombar">
        <button className="hs-btn sq" onClick={() => go(Math.max(0, cur - 1))} disabled={cur === 0} aria-label="Câu trước"><Icon name="chevl" /></button>
        <button className={`hs-btn${flags.includes(qs[cur]?.no ?? -1) ? " flagged" : ""}`} onClick={() => qs[cur] && void sync?.toggleFlag(qs[cur].no)}><Icon name="flag" />Xem lại</button>
        {cur === qs.length - 1 ? (
          <button className="hs-btn primary" onClick={() => setAsk(true)}><Icon name="send" />Nộp bài</button>
        ) : (
          <button className="hs-btn primary" onClick={() => go(cur + 1)}>Câu sau<Icon name="chevr" /></button>
        )}
      </div>
      {ask && (
        <div className="hs-modal" role="dialog">
          <div className="hs-dlg">
            <div className={`ic ${missing.length ? "amber" : "green"}`}><Icon name={missing.length ? "alert" : "checkc"} /></div>
            <h3>{missing.length ? `Còn ${missing.length} câu chưa trả lời` : "Em đã trả lời hết rồi"}</h3>
            <div className="hs-muted">{missing.length ? "Nộp xong sẽ không sửa được nữa." : `Còn ${flags.length} câu đánh dấu xem lại. Nộp xong sẽ không sửa được nữa.`}</div>
            <div className="hs-nums">{missing.map((no) => <b key={no} className={flags.includes(no) ? "f" : ""}>{nos.indexOf(no) + 1}</b>)}</div>
            <div className="row">
              <button className="hs-btn" onClick={() => setAsk(false)}>Làm tiếp</button>
              <button className="hs-btn primary" onClick={() => void doSubmit(false)} disabled={busy} data-testid="hs-confirm">Nộp bài</button>
            </div>
          </div>
        </div>
      )}
      {timeUp && (
        <div className="hs-modal" role="dialog">
          <div className="hs-dlg">
            <div className="ic red"><Icon name="timer" /></div>
            <h3>Hết giờ rồi!</h3>
            <div className="hs-muted">Bài của em đã được tự nộp với các câu đã lưu.</div>
            <div className="row"><button className="hs-btn primary" onClick={() => nav(`/hs/ket-qua/${room.submission.id}`, { replace: true })}>Xem kết quả</button></div>
          </div>
        </div>
      )}
    </>
  );
}
