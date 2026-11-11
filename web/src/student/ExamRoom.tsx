import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { Button } from "../ui/components/Button";
import { Dialog } from "../ui/components/Dialog";
import { Skeleton } from "../ui/components/Skeleton";
import { ErrorState } from "../ui/components/States";
import { useToast } from "../ui/components/Toast";
import { Icon } from "../ui/Icon";
import { invalidate } from "../ui/data/query";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { isAnswered, isPartial, unanswered } from "./answers";
import { ServerClock, formatClock, timerTone } from "./clock";
import { ASG_KEY, sectionLabels } from "./data";
import { pickStore } from "./draftStore";
import { EventOutbox, LeaveTracker, watchLeave } from "./leave";
import { HOC_PATH } from "./paths";
import { QuestionCard } from "./QuestionCard";
import { StudentApiError, errMsg, hsFetch, hsJson, retryAfterMs } from "./studentApi";
import { AnswerSync, type Sender, type SyncStatus } from "./syncQueue";
import type { AnswerValue, Answers, RoomPayload, SaveResult, StudentResult } from "./types";
import { useHsSession } from "../portal/hoc/HocShell";
import "./hs.css";

const SAVE_TEXT: Record<SyncStatus, [string, string]> = {
  saved: ["checkc", "Đã lưu"],
  saving: ["loader", "Đang lưu…"],
  offline: ["wifioff", "Lưu trên máy"],
  closed: ["checkc", "Đã nộp"],
};
const hhmm = (d = new Date()) => d.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest("math-field"));

function RoomSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang mở bài">
      <header className="exam-top">
        <Skeleton w={36} h={36} style={{ borderRadius: 10 }} />
        <div className="ttl"><Skeleton w="40%" h={16} /><Skeleton w="24%" h={12} style={{ marginTop: 6 }} /></div>
        <Skeleton w={96} h={40} style={{ borderRadius: 999 }} />
      </header>
      <main className="room">
        <nav className="card navq">
          <Skeleton w={120} h={12} />
          <div className="grid10">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} h={42} style={{ borderRadius: 12 }} />)}</div>
        </nav>
        <article className="card qc">
          <Skeleton w={160} h={12} />
          <Skeleton w="92%" h={22} style={{ marginTop: 16 }} />
          <Skeleton w="70%" h={22} style={{ marginTop: 10 }} />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={56} style={{ marginTop: 12, borderRadius: 14 }} />)}
        </article>
      </main>
    </div>
  );
}

/** Phòng làm bài (chế độ tập trung): lưu máy (Dexie) mỗi thay đổi + gửi máy chủ mỗi 3 giây; đồng hồ theo giờ máy chủ; bắt rời tab; câu đang xem trong URL (?cau=). */
function ExamRoomInner() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const clock = useRef(new ServerClock());
  const outbox = useRef(new EventOutbox());
  const submitted = useRef(false);
  const autoTried = useRef(0);
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [sync, setSync] = useState<AnswerSync | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [flags, setFlags] = useState<number[]>([]);
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  const [left, setLeft] = useState(Number.POSITIVE_INFINITY);
  const [cauRaw, setCau] = useUrlState<number>("cau", 1);
  const [ask, setAsk] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  usePageMeta(room ? `Câu ${cauRaw} · ${room.assignment.title}` : "Làm bài");

  // 1) Vào phòng: bắt đầu/tiếp tục lượt, nạp bản nháp mới nhất (máy hoặc máy chủ)
  useEffect(() => {
    let alive = true;
    setFatal(null);
    (async () => {
      const sentAt = performance.now();
      const r = await hsJson<RoomPayload>(`/api/student/assignments/${id}/start`, { method: "POST", body: {} });
      clock.current.sample(r.serverNow, sentAt, performance.now());
      const sid = r.submission.id;
      const send: Sender = async (seq, ans, o) => {
        const t0 = performance.now();
        try {
          const res = await hsFetch(`/api/student/submissions/${sid}/answers`, { method: "PUT", body: { seq, answers: ans }, keepalive: o.keepalive, retries: 0 });
          if (res.ok) {
            const b = (await res.json()) as SaveResult;
            clock.current.sample(b.serverNow, t0, performance.now());
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
        if (st === "saved" || st === "offline") setSavedAt(hhmm());
      });
      if (!alive) return;
      setRoom(r);
      setSync(s);
      setAnswers(s.answers);
      setFlags(s.flags);
      setStatus(s.status);
      setDeadline(r.submission.deadlineAt);
    })().catch((e: unknown) => alive && setFatal(e instanceof StudentApiError && e.status === 409 ? e.message : errMsg(e)));
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (!sync || !room || submitted.current) return;
      submitted.current = true;
      setBusy(true);
      try {
        const body = await sync.forSubmit();
        await hsJson<StudentResult>(`/api/student/submissions/${room.submission.id}/submit`, { method: "POST", body });
        sync.markClosed();
        invalidate(ASG_KEY);
        setAsk(false);
        if (auto) setTimeUp(true);
        else {
          toast({ title: `Đã nộp bài lúc ${hhmm()}`, msg: room.assignment.title });
          nav(HOC_PATH.ketQua(room.submission.id), { replace: true });
        }
      } catch (e) {
        submitted.current = false;
        setErr(`${errMsg(e)}. Bài vẫn lưu trên máy, em bấm Nộp lại nhé.`);
        toast({ kind: "err", title: "Chưa nộp được", msg: "Bài vẫn lưu trên máy" });
      } finally {
        setBusy(false);
      }
    },
    [sync, room, nav, toast],
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

  const qs = room?.questions ?? [];
  const cur = Math.min(Math.max(1, Math.round(cauRaw)), Math.max(1, qs.length)) - 1;
  const go = useCallback((i: number) => setCau(i + 1), [setCau]);
  const answer = useCallback(
    (no: number, v: AnswerValue) => {
      setAnswers((a) => ({ ...a, [String(no)]: v }));
      void sync?.set(no, v);
    },
    [sync],
  );

  // Phím: ← → đổi câu, 1–4 chọn phương án (khi không gõ trong ô)
  useEffect(() => {
    if (!room) return;
    const key = (e: KeyboardEvent) => {
      if (ask || timeUp || e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
      const q = qs[cur];
      if (e.key === "ArrowRight" && cur < qs.length - 1) go(cur + 1);
      else if (e.key === "ArrowLeft" && cur > 0) go(cur - 1);
      else if (q?.type === "mcq" && /^[1-4]$/.test(e.key) && Number(e.key) <= q.options.length) answer(q.no, Number(e.key) - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [room, qs, cur, ask, timeUp, go, answer]);

  if (fatal && !room)
    return (
      <main className="room-msg">
        <ErrorState title="Chưa mở được bài" text={fatal} onRetry={() => setAttempt((x) => x + 1)} />
        <Link className="btn" to={HOC_PATH.baiTap}><Icon name="arrowl" size="sm" /><span>Về Bài tập</span></Link>
      </main>
    );
  if (!room) return <RoomSkeleton />;

  const nos = qs.map((q) => q.no);
  const missing = unanswered(answers, nos);
  const done = nos.length - missing.length;
  const [ic, text] = SAVE_TEXT[status];
  const tone = timerTone(left);
  const q = qs[cur];
  const labels = sectionLabels(qs);
  const missText = missing.map((no) => nos.indexOf(no) + 1).join(", ");

  return (
    <div className="exam" data-focus>
      <header className="exam-top">
        <Link className="btn ghost icon" to={HOC_PATH.baiTap} aria-label="Rời phòng (bài vẫn được lưu)" title="Rời phòng — bài vẫn được lưu"><Icon name="x" /></Link>
        <div className="ttl">
          <b>{room.assignment.title}</b>
          <small data-testid="hs-variant">{room.assignment.subject} · {qs.length} câu · mã đề {room.submission.variantCode}{room.assignment.attemptsAllowed === 1 ? " · nộp 1 lần" : ""}</small>
        </div>
        <span className={`saved ${status}`} aria-live="polite" data-testid="hs-save">
          <Icon name={ic} size="sm" />
          <span>{text}{savedAt && status !== "saving" && status !== "closed" ? ` · ${savedAt}` : ""}</span>
        </span>
        {Number.isFinite(left) && (
          <span className={`timer ${tone}`} role="timer" aria-label={`Còn ${formatClock(left)}`} title="Giờ theo máy chủ" data-testid="hs-timer">
            <Icon name="timer" size="sm" />
            {formatClock(left)}
          </span>
        )}
        <Button variant="primary" className="hide-sm" onClick={() => setAsk(true)} disabled={busy} data-testid="hs-submit-top">Nộp bài</Button>
      </header>
      {status === "offline" && (
        <div className="banner" role="status">
          <Icon name="offline" size="sm" />
          <span><b>Mất kết nối.</b> Bài làm vẫn lưu trên máy và tự gửi khi có mạng — em cứ làm tiếp.</span>
        </div>
      )}
      {err && (
        <div className="banner err" role="alert">
          <Icon name="alert" size="sm" />
          <span>{err}</span>
        </div>
      )}

      <main className="room" id="main">
        <nav className="card navq" aria-label="Danh sách câu">
          <div className="caption"><b data-testid="hs-done">{done} / {nos.length}</b> câu đã làm</div>
          <div className="grid10">
            {qs.map((x, i) => {
              const v = answers[String(x.no)];
              const cls = [isAnswered(v) ? "done" : isPartial(v) ? "part" : "", flags.includes(x.no) ? "flag" : ""].filter(Boolean).join(" ");
              return (
                <button type="button" key={x.no} className={cls || undefined} aria-current={i === cur ? "step" : undefined} onClick={() => go(i)} aria-label={`Câu ${i + 1}${isAnswered(v) ? ", đã làm" : ""}${flags.includes(x.no) ? ", xem lại sau" : ""}`} data-testid={`hs-pal-${i}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="key">
            <span><i className="k-done" />Đã làm</span>
            <span><i className="k-part" />Làm dở</span>
            <span><i className="k-flag" />Xem lại sau</span>
            <span><i className="k-cur" />Đang xem</span>
          </div>
          <p className="caption kbd-hint hide-sm">Phím <kbd>←</kbd> <kbd>→</kbd> đổi câu · <kbd>1</kbd>–<kbd>4</kbd> chọn</p>
        </nav>

        {q && (
          <QuestionCard
            key={q.no}
            q={q}
            index={cur}
            part={labels[cur] ?? ""}
            value={answers[String(q.no)]}
            flagged={flags.includes(q.no)}
            onAnswer={(v) => answer(q.no, v)}
            onFlag={() => void sync?.toggleFlag(q.no)}
            foot={
              <>
                <div className="foot">
                  <Button size="lg" icon="chevl" onClick={() => go(cur - 1)} disabled={cur === 0} aria-label="Câu trước">{cur > 0 ? `Câu ${cur}` : "Câu trước"}</Button>
                  <span className="grow" />
                  {cur < qs.length - 1 ? (
                    <Button size="lg" iconEnd="chevr" onClick={() => go(cur + 1)}>{`Câu ${cur + 2}`}</Button>
                  ) : (
                    <Button size="lg" variant="primary" icon="send" onClick={() => setAsk(true)} disabled={busy} className="hide-sm">Nộp bài</Button>
                  )}
                </div>
                <Button variant="primary" size="lg" className="show-sm block" onClick={() => setAsk(true)} disabled={busy} data-testid="hs-submit">Nộp bài</Button>
              </>
            }
          />
        )}

        <aside className="card sub-card" aria-label="Tình trạng bài">
          <div className="caption">Còn chưa làm</div>
          <div className="big">{missing.length} câu</div>
          <p className="caption">{missing.length ? `Câu ${missText}.` : "Em đã trả lời hết."} {flags.length ? `${flags.length} câu đánh dấu xem lại.` : ""} {Number.isFinite(left) ? "Hết giờ bài tự nộp." : ""}</p>
          <Button variant="primary" className="block" icon="send" onClick={() => setAsk(true)} disabled={busy}>Nộp bài</Button>
        </aside>
      </main>

      <Dialog
        open={ask}
        title="Nộp bài?"
        onClose={() => !busy && setAsk(false)}
        footer={
          <>
            <Button onClick={() => setAsk(false)} disabled={busy} data-autofocus>Làm tiếp</Button>
            <Button variant="primary" onClick={() => doSubmit(false)} busy={busy} data-testid="hs-confirm">Nộp</Button>
          </>
        }
      >
        {missing.length ? (
          <p>Còn <b>{missing.length} câu chưa làm</b> ({missText}). Sau khi nộp không sửa được.</p>
        ) : (
          <p>Em đã trả lời hết {nos.length} câu{flags.length ? `, còn ${flags.length} câu đánh dấu xem lại` : ""}. Sau khi nộp không sửa được.</p>
        )}
      </Dialog>
      <Dialog
        open={timeUp}
        title="Hết giờ rồi!"
        onClose={() => nav(HOC_PATH.ketQua(room.submission.id), { replace: true })}
        footer={<Button variant="primary" onClick={() => nav(HOC_PATH.ketQua(room.submission.id), { replace: true })} data-autofocus>Xem kết quả</Button>}
      >
        <p>Bài của em đã được tự nộp với các câu đã lưu.</p>
      </Dialog>
    </div>
  );
}

/** Cần phiên mã lớp (tài khoản vào lớp bằng mã tham gia cũng có phiên này); chưa có → Bài tập. */
export function ExamRoom() {
  return useHsSession() ? <ExamRoomInner /> : <Navigate to={HOC_PATH.baiTap} replace />;
}
