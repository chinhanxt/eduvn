import { useEffect, useState } from "react";
import { type ClassSummary, api } from "../api";
import { Icon } from "../ui/Icon";
import { MathText } from "../math/MathText";
import { fileToJpeg } from "./image";
import { SavedList, useSaved } from "./Saved";
import type { Roster } from "./seat";
import { Btn, Dropzone, num, useLock, useToast } from "./ui";

type Criterion = { name: string; max: number; points: number; comment: string };
type Essay = { no: number; stem: string; rubric: string; reference: string; points: number };

/** Bài viết tay / tự luận: ảnh (nén ≤ 1600 px) → AI phiên âm → GV sửa → AI chấm theo rubric → GV duyệt điểm → lưu. */
export function EssayTab({ examId }: { examId: string }) {
  const toast = useToast();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [no, setNo] = useState("");
  const [question, setQuestion] = useState("");
  const [reference, setReference] = useState("");
  const [rubric, setRubric] = useState("");
  const [maxPoints, setMaxPoints] = useState(1);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classId, setClassId] = useState("");
  const [roster, setRoster] = useState<Roster | null>(null);
  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [crit, setCrit] = useState<Criterion[] | null>(null);
  const [comment, setComment] = useState("");
  const [savedId, setSavedId] = useState("");
  const [compress, compressing] = useLock();
  const [transcribe, transcribing] = useLock();
  const [grade, grading] = useLock();
  const [save, saving] = useLock();
  const saved = useSaved("essay");

  useEffect(() => void api<ClassSummary[]>("/api/classes").then(setClasses).catch(() => setClasses([])), []);
  useEffect(() => {
    setRoster(null);
    setStudentId("");
    if (classId) void api<Roster>(`/api/photo/classes/${classId}/roster`).then(setRoster).catch(() => setRoster(null));
  }, [classId]);
  useEffect(() => {
    setEssays([]);
    setNo("");
    if (examId) void api<Essay[]>(`/api/photo/exams/${examId}/essays`).then(setEssays).catch(() => setEssays([]));
  }, [examId]);

  const pickEssay = (v: string) => {
    setNo(v);
    const e = essays.find((x) => String(x.no) === v);
    if (!e) return;
    setQuestion(e.stem);
    setReference(e.reference);
    setRubric(e.rubric);
    setMaxPoints(e.points);
    setCrit(null);
  };
  const resetResult = () => {
    setCrit(null);
    setSavedId("");
  };
  const total = crit ? Math.round(crit.reduce((s, c) => s + c.points, 0) * 100) / 100 : 0;
  const step = !transcript.trim() ? 1 : !crit ? 2 : 3;
  const canGrade = !!transcript.trim() && !!question.trim() && !!rubric.trim() && maxPoints > 0;

  return (
    <>
      <div className="pg-split">
        <section className="pg-pane">
          <div className="pg-ghd">Đề, đáp án mẫu, rubric</div>
          <div className="pg-sec">
            <div className="pg-tools" style={{ margin: 0 }}>
              {essays.length > 0 && (
                <label className="pg-field" style={{ flex: 1 }}>
                  Câu tự luận của đề
                  <select className="pg-in" value={no} onChange={(e) => pickEssay(e.target.value)} data-testid="e-pick">
                    <option value="" disabled>Chọn câu…</option>
                    {essays.map((e) => <option key={e.no} value={e.no}>Câu {e.no} · {num(e.points)} điểm</option>)}
                  </select>
                </label>
              )}
              <label className="pg-field">
                Điểm tối đa
                <input className="pg-in num" style={{ width: 88 }} type="number" min={0.25} step={0.25} value={maxPoints} onChange={(e) => { setMaxPoints(Number(e.target.value)); resetResult(); }} />
              </label>
            </div>
            <label className="pg-field">Đề bài<textarea className="pg-in" rows={4} value={question} onChange={(e) => { setQuestion(e.target.value); resetResult(); }} data-testid="e-question" /></label>
            <label className="pg-field">Đáp án mẫu<textarea className="pg-in" rows={3} value={reference} onChange={(e) => { setReference(e.target.value); resetResult(); }} /></label>
            <label className="pg-field">Rubric / biểu điểm<textarea className="pg-in" rows={4} value={rubric} onChange={(e) => { setRubric(e.target.value); resetResult(); }} placeholder="Mỗi dòng một tiêu chí, ví dụ: Lập luận phản chứng — 0,5 điểm" data-testid="e-rubric" /></label>
          </div>
          <div className="pg-sec">
            <div className="pg-tools" style={{ margin: 0 }}>
              <label className="pg-field">
                Lớp
                <select className="pg-in" value={classId} onChange={(e) => setClassId(e.target.value)} data-testid="e-class">
                  <option value="">Không chọn</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              {roster ? (
                <label className="pg-field" style={{ flex: 1 }}>
                  Học sinh
                  <select className={`pg-in${studentId ? "" : " need"}`} value={studentId} onChange={(e) => setStudentId(e.target.value)} data-testid="e-student-pick">
                    <option value="">Chọn học sinh…</option>
                    {roster.students.map((s) => <option key={s.id} value={s.id}>{s.seat ?? "—"} · {s.fullName}</option>)}
                  </select>
                </label>
              ) : (
                <label className="pg-field" style={{ flex: 1 }}>
                  Tên / SBD học sinh
                  <input className="pg-in" value={student} onChange={(e) => setStudent(e.target.value)} data-testid="e-student" />
                </label>
              )}
            </div>
          </div>
        </section>

        <section className="pg-pane">
          <div className="pg-ghd"><span className={`pg-step${step >= 1 ? "" : " off"}`}>1</span>Ảnh bài làm → phiên âm</div>
          <div className="pg-sec">
            <Dropzone testId="e" compact title="Kéo thả ảnh bài làm (nhiều trang)" hint="Ảnh được thu nhỏ ≤ 1600 px, JPEG trước khi gửi cho AI" onFiles={(files) => void compress(async () => {
              const out = await Promise.all(files.map(fileToJpeg));
              setImages((l) => [...l, ...out].slice(0, 8));
              resetResult();
            })} />
            {(images.length > 0 || compressing) && (
              <div className="pg-pages">
                {images.map((s, i) => (
                  <figure key={i}>
                    <img src={s} alt={`Trang ${i + 1}`} />
                    <figcaption>Trang {i + 1}</figcaption>
                    <Btn kind="icon sm" className="del" aria-label={`Bỏ trang ${i + 1}`} onClick={() => setImages((l) => l.filter((_, j) => j !== i))}><Icon name="x" size="sm" /></Btn>
                  </figure>
                ))}
                {compressing && <div className="pg-sk" style={{ width: 68, height: 96 }} />}
              </div>
            )}
            <div className="pg-tools" style={{ margin: 0 }}>
              <Btn kind="pri" busy={transcribing} disabled={images.length === 0} data-testid="e-transcribe"
                onClick={() => void transcribe(async () => {
                  const r = await api<{ text: string }>("/api/photo/essay/transcribe", { method: "POST", body: { images, hint: question.slice(0, 200) } });
                  setTranscript(r.text);
                  resetResult();
                  toast("ok", "Đã phiên âm — rà soát chữ trước khi chấm");
                })}>
                <Icon name="spark" />Phiên âm bằng AI
              </Btn>
              <span className="mu" style={{ alignSelf: "center" }}>Chữ không đọc được ghi [?]; công thức dạng $…$</span>
            </div>
          </div>
          <div className="pg-sec">
            <div className="pg-ghd" style={{ margin: "-12px -14px 0", borderRadius: 0 }}><span className={`pg-step${step >= 2 ? "" : " off"}`}>2</span>Rà soát chữ phiên âm</div>
            {transcribing ? (
              <div style={{ display: "grid", gap: 8 }} aria-busy="true" data-testid="e-skeleton">
                {[92, 78, 85, 60, 88, 40].map((w, i) => <div key={i} className="pg-sk l" style={{ width: `${w}%`, height: 14 }} />)}
              </div>
            ) : (
              <>
                <textarea className="pg-in mono" rows={7} value={transcript} onChange={(e) => { setTranscript(e.target.value); resetResult(); }} placeholder="Chữ phiên âm sẽ hiện ở đây; có thể gõ/sửa trực tiếp" data-testid="e-transcript" />
                {transcript.includes("$") && <div className="pg-read" data-testid="e-preview"><MathText value={transcript} /></div>}
              </>
            )}
          </div>
          <div className="pg-sec">
            <div className="pg-ghd" style={{ margin: "-12px -14px 0", borderRadius: 0 }}><span className={`pg-step${step >= 3 ? "" : " off"}`}>3</span>Chấm theo rubric → duyệt</div>
            <div className="pg-tools" style={{ margin: 0 }}>
              <Btn kind={crit ? "" : "pri"} busy={grading} disabled={!canGrade} data-testid="e-grade"
                onClick={() => void grade(async () => {
                  const r = await api<{ criteria: Criterion[]; comment: string }>("/api/photo/essay/grade", { method: "POST", body: { question, reference, rubric, maxPoints, transcript } });
                  setCrit(r.criteria);
                  setComment(r.comment);
                  setSavedId("");
                })}>
                <Icon name="grade" />{crit ? "Chấm lại" : "Chấm bằng AI"}
              </Btn>
              {!canGrade && <span className="mu" style={{ alignSelf: "center" }}>Cần đề bài, rubric và chữ phiên âm</span>}
            </div>
            {grading && !crit && <div style={{ display: "grid", gap: 6 }} aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="pg-sk" style={{ height: 34 }} />)}</div>}
            {crit && (
              <>
                <table className="pg-crit" data-testid="e-criteria">
                  <thead><tr><th>Tiêu chí</th><th className="pt">Điểm</th><th>Nhận xét</th></tr></thead>
                  <tbody>
                    {crit.map((c, i) => (
                      <tr key={i}>
                        <td>{c.name}</td>
                        <td className="pt">
                          <input className="pg-in num" type="number" min={0} max={c.max} step={0.25} value={c.points} disabled={!!savedId} data-testid={`e-pt-${i}`}
                            onChange={(e) => setCrit(crit.map((x, j) => (j === i ? { ...x, points: Math.min(x.max, Math.max(0, Number(e.target.value))) } : x)))} /> <span className="mu">/ {num(c.max)}</span>
                        </td>
                        <td><input className="pg-in" style={{ width: "100%" }} value={c.comment} disabled={!!savedId} onChange={(e) => setCrit(crit.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <label className="pg-field">Nhận xét chung<textarea className="pg-in" rows={2} value={comment} disabled={!!savedId} onChange={(e) => setComment(e.target.value)} /></label>
                <div className="pg-tools" style={{ margin: 0, alignItems: "center" }}>
                  <div className="pg-total"><span className="v" data-testid="e-total">{num(total)}</span><span className="mu">/ {num(maxPoints)} điểm</span></div>
                  <span className="pg-sp" />
                  {savedId ? (
                    <span className="pg-tag is-ok"><Icon name="checkc" />Đã duyệt và lưu</span>
                  ) : (
                    <Btn kind="pri" busy={saving} disabled={!!roster && !studentId} data-testid="e-save"
                      onClick={() => void save(async () => {
                        const r = await api<{ id: string; total: number; max: number }>("/api/photo/essay", {
                          method: "POST",
                          body: { examId: examId || undefined, student, classId: roster && studentId ? roster.id : undefined, studentId: studentId || undefined, title: no ? `Câu ${no}` : question.slice(0, 60), maxPoints, transcript, grading: { criteria: crit, comment } },
                        });
                        setSavedId(r.id);
                        toast("ok", `Đã lưu ${num(r.total)}/${num(r.max)} điểm`);
                        saved.reload();
                      })}>
                      <Icon name="check" />Duyệt & lưu
                    </Btn>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      <SavedList state={saved} />
    </>
  );
}
