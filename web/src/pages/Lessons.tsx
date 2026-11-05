import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api, errText, exportLesson, type LessonBody, type LessonDetail, type LessonSummary } from "../api";
import { Icon } from "../Icon";

const TITLES = ["Mở đầu (Xác định vấn đề/nhiệm vụ học tập)", "Hình thành kiến thức mới", "Luyện tập", "Vận dụng"];
const STEPS = ["Chuyển giao nhiệm vụ", "Thực hiện nhiệm vụ", "Báo cáo, thảo luận", "Kết luận, nhận định"] as const;
const gradeLabel = (g: number) => (g <= 12 ? `Lớp ${g}` : `Năm ${g - 12}`);

export function Lessons() {
  const [rows, setRows] = useState<LessonSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    api<LessonSummary[]>("/api/lessons").then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);
  return (
    <>
      <h1>Giáo án</h1>
      {error && <div className="err">{error}</div>}
      {rows?.length === 0 && <div className="card"><div className="empty">—</div></div>}
      <div className="cards" data-testid="lesson-cards">
        {rows?.map((l) => (
          <Link key={l.id} to={`/giao-an/${l.id}`} className="cls" data-testid="lesson-card">
            <div className="big" style={{ fontSize: 18 }}>{l.title}</div>
            <div className="meta">{l.subject} · {gradeLabel(l.grade)}</div>
            <div className="cnt"><Icon name="pen" size={18} />{l.periods} tiết<span style={{ marginLeft: "auto", fontSize: 12 }}>{new Date(l.updatedAt).toLocaleDateString("vi-VN")}</span></div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Para({ label, text }: { label: string; text: string }) {
  return <p style={{ margin: "6px 0" }}><b>{label}</b> {text}</p>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ margin: "8px 0" }}>
      <b>{title}</b>
      <ul style={{ margin: "4px 0", paddingLeft: 22 }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

function Body({ a }: { a: LessonBody }) {
  const steps = [a.steps.assign, a.steps.perform, a.steps.report, a.steps.conclude];
  return (
    <div style={{ marginLeft: 12 }}>
      <Para label="a) Mục tiêu:" text={a.goal} />
      <Para label="b) Nội dung:" text={a.content} />
      <Para label="c) Sản phẩm:" text={a.product} />
      <b>d) Tổ chức thực hiện:</b>
      <ol style={{ margin: "4px 0", paddingLeft: 22 }}>
        {steps.map((s, i) => <li key={i}><i>{STEPS[i]}:</i> {s}</li>)}
      </ol>
    </div>
  );
}

export function LessonDetailPage() {
  const { id = "" } = useParams();
  const [l, setL] = useState<LessonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<LessonDetail>(`/api/lessons/${id}`).then(setL).catch((e: unknown) => setError(errText(e)));
  }, [id]);
  if (!l) return error ? <div className="err">{error}</div> : null;
  const { plan } = l;
  const h = plan.header;
  return (
    <>
      <Link to="/giao-an" className="back"><Icon name="back" size={18} />Giáo án</Link>
      <h1>{l.title} <small style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>{l.subject} · {gradeLabel(l.grade)} · {l.periods} tiết</small></h1>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => void exportLesson(l.id)} data-testid="export-lesson"><Icon name="down" size={18} />Tải Word</button>
      </div>
      <div className="card" data-testid="lesson-view">
        {(h.school || h.department || h.teacher) && <p style={{ color: "var(--muted)", margin: "0 0 10px" }}>{[h.school, h.department, h.teacher].filter(Boolean).join(" · ")}</p>}
        <h2>I. Mục tiêu</h2>
        <List title="1. Kiến thức" items={plan.objectives.knowledge} />
        <b>2. Năng lực</b>
        <div style={{ marginLeft: 12 }}>
          <List title="Năng lực chung" items={plan.objectives.competencies.general} />
          <List title="Năng lực đặc thù" items={plan.objectives.competencies.specific} />
        </div>
        <List title="3. Phẩm chất" items={plan.objectives.qualities} />
        <h2 style={{ marginTop: 18 }}>II. Thiết bị dạy học và học liệu</h2>
        <ul style={{ margin: "4px 0", paddingLeft: 22 }}>{plan.materials.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <h2 style={{ marginTop: 18 }}>III. Tiến trình dạy học</h2>
        {plan.activities.map((a, i) => (
          <div key={i} style={{ marginBottom: 14 }} data-testid="lesson-activity">
            <b>Hoạt động {i + 1}: {TITLES[i]}{a.name ? ` – ${a.name}` : ""}</b>
            {a.subs.length > 0 ? (
              a.subs.map((s, j) => (
                <div key={j} style={{ marginTop: 8 }}>
                  <i style={{ marginLeft: 12 }}>Hoạt động 2.{j + 1}{s.name ? `: ${s.name}` : ""}</i>
                  <Body a={s} />
                </div>
              ))
            ) : (
              <Body a={a} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
