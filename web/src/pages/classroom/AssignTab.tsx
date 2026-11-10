import { useEffect, useMemo, useState } from "react";
import { type BankQuestion, type ExamSummary, api, errText, gradeLabel } from "../../api";
import { Icon } from "../../Icon";
import { MathText } from "../../math/MathText";
import type { AssignmentListItem } from "./types";

const STATUS_VI = { draft: ["", "Nháp"], published: ["c-green", "Đang giao"], closed: ["", "Đã đóng"] } as const;
const SOL_VI = { after_submit: ["Sau khi nộp", "Em xem ngay khi nộp xong"], after_due: ["Sau hạn nộp", "Chờ cả lớp nộp xong"], never: ["Không hiện", "Chỉ hiện điểm"] } as const;
const LEVEL_VI = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng" } as const;
const pad = (n: number) => String(n).padStart(2, "0");
/** Date → giá trị cho <input type="datetime-local"> theo giờ máy. */
export const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Tab "Giao bài": danh sách bài đã giao + form giao bài mới (màn 5 của mockup). */
export function AssignTab({ classId, subject, className, rosterSize, onOpen }: { classId: string; subject: string | null; className: string; rosterSize: number; onOpen: (assignmentId: string, tab: "theo-doi" | "ket-qua") => void }) {
  const [rows, setRows] = useState<AssignmentListItem[] | null>(null);
  const [form, setForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = () => {
    api<AssignmentListItem[]>(`/api/classes/${classId}/assignments`).then(setRows).catch((e: unknown) => setErr(errText(e)));
  };
  useEffect(load, [classId]);
  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      await api(`/api/assignments/${id}`, { method: "PATCH", body });
      load();
    } catch (e) {
      setErr(errText(e));
    }
  };
  if (form) return <AssignForm classId={classId} subject={subject} className={className} rosterSize={rosterSize} onDone={(id) => { setForm(false); load(); if (id) onOpen(id, "theo-doi"); }} />;
  return (
    <>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setForm(true)} data-testid="lh-new"><Icon name="plus" size={18} />Giao bài mới</button>
      </div>
      {err && <div className="err">{err}</div>}
      {rows?.length === 0 && <div className="card"><div className="empty">Chưa giao bài nào</div></div>}
      <div className="lh-list">
        {rows?.map((a) => (
          <div key={a.id} className="card lh-arow" data-testid="lh-asg">
            <span className={`ic ${a.kind === "test" ? "blue" : "violet"}`}><Icon name={a.kind === "test" ? "exam" : "repeat"} /></span>
            <div className="g">
              <b>{a.title}</b>
              <small>{fmtWhen(a.opensAt)} → {fmtWhen(a.dueAt)} · {a.questionCount} câu · {a.durationMinutes ? `${a.durationMinutes} phút` : "không giới hạn giờ"} · {a.variantCodes.length} mã đề</small>
            </div>
            <span className={`lh-chip ${STATUS_VI[a.status][0]}`}>{STATUS_VI[a.status][1]}</span>
            <span className="lh-cnt" title="Đã nộp / sĩ số"><Icon name="check" size={16} />{a.submitted}/{a.rosterSize}</span>
            {a.status === "draft" && <button className="btn sm" onClick={() => void patch(a.id, { status: "published" })}><Icon name="send" size={16} />Giao</button>}
            {a.status === "published" && <button className="btn ghost sm" onClick={() => void patch(a.id, { status: "closed" })}>Đóng</button>}
            <button className="btn ghost sm" onClick={() => onOpen(a.id, "theo-doi")} data-testid="lh-open-monitor"><Icon name="eye" size={16} />Theo dõi</button>
            <button className="btn ghost sm" onClick={() => onOpen(a.id, "ket-qua")}><Icon name="chart" size={16} />Kết quả</button>
          </div>
        ))}
      </div>
    </>
  );
}

function AssignForm({ classId, subject, className, rosterSize, onDone }: { classId: string; subject: string | null; className: string; rosterSize: number; onDone: (id: string | null) => void }) {
  const now = new Date();
  const [title, setTitle] = useState("");
  const [src, setSrc] = useState<"exam" | "bank">("exam");
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [examId, setExamId] = useState("");
  const [grade, setGrade] = useState(() => Number.parseInt(className, 10) || 10);
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>(["NB", "TH", "VD"]);
  const [picked, setPicked] = useState<string[]>([]);
  const [kind, setKind] = useState<"test" | "practice">("test");
  const [opensAt, setOpensAt] = useState(toLocalInput(now));
  const [dueAt, setDueAt] = useState(toLocalInput(new Date(now.getTime() + 24 * 3600_000)));
  const [dur, setDur] = useState(15);
  const [noLimit, setNoLimit] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [sol, setSol] = useState<"after_submit" | "after_due" | "never">("after_due");
  const [shuffle, setShuffle] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ExamSummary[]>("/api/exams").then((xs) => {
      setExams(xs);
      if (xs[0]) setExamId((id) => id || xs[0]!.id);
    }).catch((e: unknown) => setErr(errText(e)));
  }, []);
  useEffect(() => {
    if (src !== "bank" || !subject) return;
    api<BankQuestion[]>(`/api/questions?subject=${encodeURIComponent(subject)}&grade=${grade}&limit=500`).then(setBank).catch((e: unknown) => setErr(errText(e)));
  }, [src, subject, grade]);
  const allTopics = useMemo(() => [...new Set(bank.map((q) => q.topic))], [bank]);
  const shownBank = bank.filter((q) => (topics.length === 0 || topics.includes(q.topic)) && levels.includes(q.level));
  const exam = exams.find((e) => e.id === examId);
  const setKindDefaults = (k: "test" | "practice") => {
    setKind(k);
    setAttempts(k === "test" ? 1 : 3);
    setSol(k === "test" ? "after_due" : "after_submit");
  };
  const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  const save = async (publish: boolean) => {
    setErr(null);
    setBusy(true);
    try {
      const body = {
        title: title || exam?.title || "Bài tập",
        kind,
        source: src === "exam" ? { examId } : { questionIds: picked },
        opensAt: new Date(opensAt).toISOString(),
        dueAt: new Date(dueAt).toISOString(),
        durationMinutes: noLimit ? null : dur,
        attemptsAllowed: attempts,
        showSolution: sol,
        shuffle,
        publish,
      };
      const r = await api<{ id: string }>(`/api/classes/${classId}/assignments`, { method: "POST", body });
      onDone(publish ? r.id : null);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lh-gb">
      <div className="card lh-form">
        {err && <div className="err">{err}</div>}
        <div className="lh-sec">
          <div className="lh-sh"><span className="ic blue"><Icon name="exam" /></span>Nội dung</div>
          <label className="lh-field">Tên bài<input className="inp w-l" value={title} placeholder={exam?.title ?? "Kiểm tra 15 phút"} onChange={(e) => setTitle(e.target.value)} data-testid="lh-title" /></label>
          <div className="lh-seg">
            <button className={src === "exam" ? "on" : ""} onClick={() => setSrc("exam")}>Từ đề đã tạo</button>
            <button className={src === "bank" ? "on" : ""} onClick={() => setSrc("bank")}>Nhóm câu từ ngân hàng</button>
          </div>
          {src === "exam" ? (
            <div className="lh-pick" data-testid="lh-exams">
              {exams.length === 0 && <div className="empty">Chưa có đề — tạo đề ở mục Đề thi</div>}
              {exams.map((e) => (
                <label key={e.id} className="p">
                  <input type="radio" name="lh-exam" checked={examId === e.id} onChange={() => setExamId(e.id)} />
                  <span className="g"><b>{e.title}</b><small>{e.subject} · {gradeLabel(e.grade)} · {e.codes.length} mã đề</small></span>
                </label>
              ))}
            </div>
          ) : (
            <div className="lh-sec">
              {!subject && <div className="warn">Lớp chưa có môn — đặt môn cho lớp để lọc ngân hàng câu hỏi.</div>}
              <label className="lh-field">Khối<input className="inp w-s" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(Number(e.target.value) || 10)} /></label>
              <div className="lh-chips">{allTopics.map((t) => <button key={t} className={topics.includes(t) ? "on" : ""} onClick={() => setTopics(toggle(topics, t))}>{t}</button>)}</div>
              <div className="lh-chips">{(["NB", "TH", "VD"] as const).map((l) => <button key={l} className={levels.includes(l) ? "on" : ""} onClick={() => setLevels(toggle(levels, l))}>{LEVEL_VI[l]}</button>)}</div>
              <div className="lh-bq-list">
                {shownBank.map((q) => (
                  <label key={q.id} className="lh-bq">
                    <input type="checkbox" checked={picked.includes(q.id)} onChange={() => setPicked(toggle(picked, q.id))} />
                    <span className="t"><MathText value={q.stem} /></span>
                    <span className="lh-chip">{LEVEL_VI[q.level]}</span>
                  </label>
                ))}
              </div>
              <div className="hint" style={{ textAlign: "left" }}>Đã chọn {picked.length} câu</div>
            </div>
          )}
        </div>
        <div className="lh-sec">
          <div className="lh-sh"><span className="ic violet"><Icon name="shield" /></span>Loại bài</div>
          <div className="lh-seg">
            <button className={kind === "practice" ? "on" : ""} onClick={() => setKindDefaults("practice")}>Luyện tập</button>
            <button className={kind === "test" ? "on" : ""} onClick={() => setKindDefaults("test")}>Kiểm tra</button>
          </div>
        </div>
        <div className="lh-sec">
          <div className="lh-sh"><span className="ic amber"><Icon name="cal" /></span>Thời gian</div>
          <div className="lh-g2">
            <label className="lh-field">Mở lúc<input className="inp" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label>
            <label className="lh-field">Hạn nộp<input className="inp" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} data-testid="lh-due" /></label>
          </div>
          <div className="lh-g2">
            <div className="lh-field">Thời gian làm (phút)
              <Stepper value={dur} min={1} max={300} step={5} onChange={setDur} disabled={noLimit} />
              <label className="lh-tgl"><input type="checkbox" checked={noLimit} onChange={(e) => setNoLimit(e.target.checked)} />Không giới hạn trong cửa sổ mở</label>
            </div>
            <div className="lh-field">Số lượt làm
              <Stepper value={attempts} min={1} max={10} step={1} onChange={setAttempts} />
              <small className="hint" style={{ textAlign: "left" }}>Mặc định {kind === "test" ? "1 lượt cho kiểm tra" : "3 lượt cho luyện tập"}</small>
            </div>
          </div>
        </div>
        <div className="lh-sec">
          <div className="lh-sh"><span className="ic green"><Icon name="eye" /></span>Hiện lời giải</div>
          <div className="lh-pick">
            {(Object.keys(SOL_VI) as (keyof typeof SOL_VI)[]).map((k) => (
              <label key={k} className="p"><input type="radio" name="lh-sol" checked={sol === k} onChange={() => setSol(k)} /><span className="g"><b>{SOL_VI[k][0]}</b><small>{SOL_VI[k][1]}</small></span></label>
            ))}
          </div>
          <label className="lh-tgl"><input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} /><span><b>Đảo thứ tự câu</b><small>Giữ nguyên thứ tự các phần theo CV 7991</small></span><Icon name="shuffle" /></label>
        </div>
        <div className="lh-actions">
          <button className="btn ghost" onClick={() => onDone(null)}>Huỷ</button>
          <button className="btn ghost" disabled={busy} onClick={() => void save(false)}>Lưu nháp</button>
          <button className="btn" disabled={busy || (src === "exam" ? !examId : picked.length === 0)} onClick={() => void save(true)} data-testid="lh-publish"><Icon name="send" size={18} />Giao bài</button>
        </div>
      </div>
      <div className="card lh-sum">
        <h2>Tóm tắt</h2>
        <div className="li"><span className="ic blue"><Icon name="users" /></span><div><b>Lớp {className}</b><small>{rosterSize} học sinh · {src === "exam" ? `${exam?.codes.length ?? 0} mã đề` : "1 mã đề"}</small></div></div>
        <div className="li"><span className="ic amber"><Icon name="cal" /></span><div><b>{fmtWhen(new Date(opensAt).toISOString())} → {fmtWhen(new Date(dueAt).toISOString())}</b><small>Mở lúc → hạn nộp</small></div></div>
        <div className="li"><span className="ic violet"><Icon name="timer" /></span><div><b>{noLimit ? "Không giới hạn giờ" : `${dur} phút`} · {attempts} lượt</b><small>{kind === "test" ? "Kiểm tra" : "Luyện tập"}</small></div></div>
        <div className="li"><span className="ic green"><Icon name="eye" /></span><div><b>{sol === "never" ? "Không hiện lời giải" : `Lời giải ${SOL_VI[sol][0].toLowerCase()}`}</b><small>{shuffle ? "Đảo thứ tự câu" : "Giữ thứ tự câu"}</small></div></div>
      </div>
    </div>
  );
}

function Stepper({ value, min, max, step, onChange, disabled }: { value: number; min: number; max: number; step: number; onChange: (n: number) => void; disabled?: boolean }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className={`lh-step${disabled ? " off" : ""}`}>
      <button type="button" disabled={disabled} onClick={() => onChange(clamp(value - step))} aria-label="Giảm">−</button>
      <input inputMode="numeric" disabled={disabled} value={value} onChange={(e) => onChange(clamp(Number(e.target.value) || min))} />
      <button type="button" disabled={disabled} onClick={() => onChange(clamp(value + step))} aria-label="Tăng">+</button>
    </div>
  );
}
