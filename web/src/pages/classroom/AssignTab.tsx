import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { type BankQuestion, gradeLabel } from "../../api";
import { MathText } from "../../math/MathText";
import { Region, EXAMS_KEY, fetchExams, FormPane, get, patch, post, statusOf, errorOf, useOpenParam, useRun, whenVi } from "../../portal/gv/kit";
import { Icon } from "../../ui/Icon";
import { Badge, ChipGroup, Segmented } from "../../ui/components/Chip";
import { Button } from "../../ui/components/Button";
import { Field, Input } from "../../ui/components/Field";
import { invalidate, useQuery } from "../../ui/data/query";
import type { AssignmentListItem } from "./types";

const STATUS_VI = { draft: ["neutral", "Nháp"], published: ["ok", "Đang giao"], closed: ["outline", "Đã đóng"] } as const;
const SOL_VI = { after_submit: ["Sau khi nộp", "Em xem ngay khi nộp xong"], after_due: ["Sau hạn nộp", "Chờ cả lớp nộp xong"], never: ["Không hiện", "Chỉ hiện điểm"] } as const;
const LEVEL_VI = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng" } as const;
const pad = (n: number) => String(n).padStart(2, "0");
/** Date → giá trị cho <input type="datetime-local"> theo giờ máy. */
export const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtWhen = whenVi;
export const asgKey = (classId: string) => `gv/lop/${classId}/bai`;
export const fetchAsg = (classId: string) => get<AssignmentListItem[]>(`/api/classes/${classId}/assignments`);

/** Đổi tab lớp kèm bài đang xem (một bước lịch sử). */
export function useGoTab() {
  const [, setSp] = useSearchParams();
  return (tab: string, bai?: string | null) => setSp(() => new URLSearchParams({ tab, ...(bai ? { bai } : {}) }));
}

/** Tab "Bài tập": danh sách bài đã giao + khung giao bài mới (?tao=1). */
export function AssignTab({ classId, subject, className, rosterSize }: { classId: string; subject: string | null; className: string; rosterSize: number }) {
  const q = useQuery(asgKey(classId), fetchAsg(classId));
  const [form, setForm] = useOpenParam();
  const go = useGoTab();
  const run = useRun();
  const setStatus = (a: AssignmentListItem, status: "published" | "closed") =>
    run(async () => {
      await patch(`/api/assignments/${a.id}`, { status });
      invalidate(asgKey(classId));
    }, status === "published" ? `Đã giao “${a.title}”` : `Đã đóng “${a.title}”`);
  const rows = q.data ?? [];
  return (
    <>
      {form && <AssignForm classId={classId} subject={subject} className={className} rosterSize={rosterSize} onClose={() => setForm(false)} onDone={(id) => (id ? go("theo-doi", id) : setForm(false))} />}
      <Region
        className="pane"
        label="Bài đã giao"
        status={statusOf(q, (d) => d.length === 0)}
        stale={q.stale}
        onRetry={q.refetch}
        error={errorOf(q.error)}
        empty={{ icon: "send", title: "Chưa giao bài nào", text: `Giao đề đã tạo hoặc nhóm câu từ ngân hàng cho ${className}.`, action: <Button size="sm" variant="primary" icon="plus" onClick={() => setForm(true)}>Giao bài mới</Button> }}
      >
        <div className="ghd">
          Bài đã giao <span className="n">{rows.length}</span>
          <span className="grow" />
          {!form && <Button size="sm" variant="ghost" icon="plus" onClick={() => setForm(true)} data-testid="lh-new">Giao bài mới</Button>}
        </div>
        <ul className="rows enter">
          {rows.map((a) => {
            const pct = a.rosterSize ? Math.round((a.submitted / a.rosterSize) * 100) : 0;
            return (
              <li key={a.id} data-testid="lh-asg">
                <span className={a.kind === "test" ? "lead acc" : "lead"}><Icon name={a.kind === "test" ? "exam" : "repeat"} size="sm" /></span>
                <div className="g">
                  <b>{a.title}</b>
                  <small>{whenVi(a.opensAt)} → {whenVi(a.dueAt)} · {a.questionCount} câu · {a.durationMinutes ? `${a.durationMinutes} phút` : "không giới hạn giờ"}{a.variantCodes.length > 1 ? ` · ${a.variantCodes.length} mã đề` : ""}</small>
                </div>
                <Badge tone={STATUS_VI[a.status][0]}>{STATUS_VI[a.status][1]}</Badge>
                <span className="meter-n" title="Đã nộp / sĩ số">
                  <span className="meter"><i style={{ ["--v" as string]: `${pct}%` }} /></span>
                  {a.submitted}/{a.rosterSize}
                </span>
                <span className="t-acts">
                  {a.status === "draft" && <Button size="sm" icon="send" onClick={() => setStatus(a, "published")}>Giao</Button>}
                  {a.status === "published" && <Button size="sm" variant="ghost" onClick={() => setStatus(a, "closed")}>Đóng</Button>}
                  <Button size="sm" variant="ghost" icon="eye" onClick={() => go("theo-doi", a.id)} data-testid="lh-open-monitor">Theo dõi</Button>
                  <Button size="sm" variant="ghost" icon="chart" onClick={() => go("ket-qua", a.id)}>Kết quả</Button>
                </span>
              </li>
            );
          })}
        </ul>
      </Region>
    </>
  );
}

function AssignForm({ classId, subject, className, rosterSize, onClose, onDone }: { classId: string; subject: string | null; className: string; rosterSize: number; onClose: () => void; onDone: (id: string | null) => void }) {
  const now = new Date();
  const run = useRun();
  const [title, setTitle] = useState("");
  const [src, setSrc] = useState<"exam" | "bank">("exam");
  const exams = useQuery(EXAMS_KEY, fetchExams);
  const [examId, setExamId] = useState("");
  const [grade, setGrade] = useState(() => Number.parseInt(className, 10) || 10);
  const bank = useQuery(src === "bank" && subject ? `gv/ngan-hang/${subject}/${grade}/500` : null, get<BankQuestion[]>(`/api/questions?subject=${encodeURIComponent(subject ?? "")}&grade=${grade}&limit=500`));
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
  const examList = exams.data ?? [];
  useEffect(() => {
    if (!examId && examList[0]) setExamId(examList[0].id);
  }, [examList, examId]);
  const allTopics = useMemo(() => [...new Set((bank.data ?? []).map((q) => q.topic))], [bank.data]);
  const shownBank = (bank.data ?? []).filter((q) => (topics.length === 0 || topics.includes(q.topic)) && levels.includes(q.level));
  const exam = examList.find((e) => e.id === examId);
  const setKindDefaults = (k: "test" | "practice") => {
    setKind(k);
    setAttempts(k === "test" ? 1 : 3);
    setSol(k === "test" ? "after_due" : "after_submit");
  };
  const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const bad = new Date(dueAt) <= new Date(opensAt);
  const save = (publish: boolean) =>
    run(async () => {
      const body = {
        title: title.trim() || exam?.title || "Bài tập",
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
      const r = await post<{ id: string }>(`/api/classes/${classId}/assignments`, body);
      invalidate(asgKey(classId));
      onDone(publish ? r.id : null);
      return r;
    }, publish ? { title: `Đã giao bài cho ${className}`, msg: `${rosterSize} học sinh nhận được ngay` } : "Đã lưu nháp");
  const ready = src === "exam" ? !!examId : picked.length > 0;
  return (
    <div className="work wide-l" style={{ marginBottom: "var(--s-4)" }}>
      <FormPane
        title="Giao bài mới"
        sub={className}
        onClose={onClose}
        className="lh-form"
        footer={
          <>
            {bad && <span className="caption" style={{ color: "var(--danger)" }}>Hạn nộp phải sau giờ mở</span>}
            <Button onClick={onClose}>Huỷ</Button>
            <Button disabled={!ready || bad} onClick={() => save(false)}>Lưu nháp</Button>
            <Button variant="primary" icon="send" disabled={!ready || bad} onClick={() => save(true)} data-testid="lh-publish">Giao bài</Button>
          </>
        }
      >
        <Field label="Tên bài"><Input value={title} placeholder={exam?.title ?? "Kiểm tra 15 phút"} onChange={(e) => setTitle(e.target.value)} data-testid="lh-title" /></Field>
        <div>
          <span className="lbl-sm">Nội dung</span>
          <Segmented label="Nguồn câu hỏi" value={src} onChange={setSrc} options={[{ value: "exam", label: "Từ đề đã tạo" }, { value: "bank", label: "Nhóm câu từ ngân hàng" }]} />
        </div>
        {src === "exam" ? (
          <div className="pick-list" data-testid="lh-exams" role="radiogroup" aria-label="Chọn đề">
            {exams.data === undefined && <Region status="dang-tai" label="Đang tải đề" skeletonRows={3} />}
            {exams.data?.length === 0 && <p className="note">Chưa có đề — tạo đề ở mục Đề thi rồi quay lại.</p>}
            {examList.map((e) => (
              <label key={e.id} className="pick">
                <input type="radio" name="lh-exam" checked={examId === e.id} onChange={() => setExamId(e.id)} />
                <span className="g"><b>{e.title}</b><small>{e.subject} · {gradeLabel(e.grade)} · {e.codes.length} mã đề</small></span>
              </label>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {!subject && <p className="note warn">Lớp chưa có môn — đặt môn cho lớp để lọc ngân hàng câu hỏi.</p>}
            <div className="fgrid"><Field label="Khối"><Input type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(Number(e.target.value) || 10)} /></Field></div>
            {allTopics.length > 0 && <ChipGroup multiple label="Chủ đề" value={topics} onChange={setTopics} options={allTopics.map((t) => ({ value: t, label: t }))} />}
            <ChipGroup multiple label="Mức độ" value={levels} onChange={setLevels} options={(["NB", "TH", "VD"] as const).map((l) => ({ value: l, label: LEVEL_VI[l] }))} />
            <div className="pick-list scroll">
              {bank.loading && <Region status="dang-tai" label="Đang tải câu hỏi" skeletonRows={3} />}
              {shownBank.map((q) => (
                <label key={q.id} className="pick">
                  <input type="checkbox" checked={picked.includes(q.id)} onChange={() => setPicked(toggle(picked, q.id))} />
                  <span className="g"><MathText value={q.stem} /></span>
                  <span className={`lvl l${q.level === "NB" ? 1 : q.level === "TH" ? 2 : 3}`}>{q.level}</span>
                </label>
              ))}
              {bank.data && shownBank.length === 0 && <p className="note">Không có câu nào khớp chủ đề/mức đã chọn.</p>}
            </div>
            <span className="caption">Đã chọn <b className="num">{picked.length}</b> câu</span>
          </div>
        )}
        <div>
          <span className="lbl-sm">Loại bài</span>
          <Segmented label="Loại bài" value={kind} onChange={setKindDefaults} options={[{ value: "practice", label: "Luyện tập" }, { value: "test", label: "Kiểm tra" }]} />
        </div>
        <div className="fgrid">
          <Field label="Mở lúc"><Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></Field>
          <Field label="Hạn nộp" error={bad ? "Hạn nộp phải sau giờ mở" : undefined}><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} data-testid="lh-due" /></Field>
          <Field label="Thời gian làm (phút)"><Input type="number" min={1} max={300} step={5} disabled={noLimit} value={dur} onChange={(e) => setDur(Math.max(1, Math.min(300, Number(e.target.value) || 1)))} /></Field>
          <Field label="Số lượt làm" hint={`Mặc định ${kind === "test" ? "1 lượt cho kiểm tra" : "3 lượt cho luyện tập"}`}><Input type="number" min={1} max={10} value={attempts} onChange={(e) => setAttempts(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} /></Field>
        </div>
        <label className="check-row"><input type="checkbox" checked={noLimit} onChange={(e) => setNoLimit(e.target.checked)} />Không giới hạn giờ trong cửa sổ mở</label>
        <div>
          <span className="lbl-sm">Hiện lời giải</span>
          <Segmented label="Hiện lời giải" value={sol} onChange={setSol} options={(Object.keys(SOL_VI) as (keyof typeof SOL_VI)[]).map((k) => ({ value: k, label: SOL_VI[k][0] }))} />
          <span className="caption" style={{ display: "block", marginTop: 4 }}>{SOL_VI[sol][1]}</span>
        </div>
        <label className="check-row"><input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} /><span>Đảo thứ tự câu<small>Giữ nguyên thứ tự các phần theo CV 7991</small></span></label>
      </FormPane>
      <aside>
        <section className="pane" aria-label="Tóm tắt">
          <div className="ghd">Tóm tắt</div>
          <dl className="props" style={{ margin: 0, borderBottom: 0 }}>
            <dt>Lớp</dt><dd>{className} · {rosterSize} HS</dd>
            <dt>Nội dung</dt><dd>{src === "exam" ? (exam ? `${exam.title} · ${exam.codes.length} mã đề` : "—") : `${picked.length} câu từ ngân hàng`}</dd>
            <dt>Thời gian</dt><dd>{whenVi(new Date(opensAt).toISOString())} → {whenVi(new Date(dueAt).toISOString())}</dd>
            <dt>Làm bài</dt><dd>{noLimit ? "Không giới hạn giờ" : `${dur} phút`} · {attempts} lượt</dd>
            <dt>Loại</dt><dd>{kind === "test" ? "Kiểm tra" : "Luyện tập"}</dd>
            <dt>Lời giải</dt><dd>{sol === "never" ? "Không hiện" : SOL_VI[sol][0]}{shuffle ? " · đảo câu" : ""}</dd>
          </dl>
        </section>
      </aside>
    </div>
  );
}
